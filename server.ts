import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { parseBehavioralResponse, extractGroundingSources } from './src/utils/parser.ts';
import type { PersonalContextProfile } from './src/types/why.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('GEMINI_API_KEY_MISSING') ||
        msg.includes('400') ||
        msg.includes('403') ||
        msg.includes('404')
      ) {
        throw err;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }
  }
  throw lastError;
}

function formatPersonalContextBlock(
  personalContext?: PersonalContextProfile | null,
  recentThemes?: string[]
): string {
  const blocks: string[] = [];

  if (personalContext) {
    const parts: string[] = [];
    if (personalContext.goals?.trim()) parts.push(`Obiettivi personali: ${personalContext.goals.trim()}`);
    if (personalContext.recurringTriggers?.trim()) {
      parts.push(`Trigger ricorrenti dichiarati: ${personalContext.recurringTriggers.trim()}`);
    }
    if (personalContext.dailyRoutines?.trim()) {
      parts.push(`Routine e abitudini quotidiane: ${personalContext.dailyRoutines.trim()}`);
    }
    if (personalContext.values?.trim()) parts.push(`Valori guida: ${personalContext.values.trim()}`);
    if (parts.length > 0) {
      blocks.push(`CONTESTO PERSONALE CONDIVISO DALL'UTENTE:\n${parts.join('\n')}`);
    }
  }

  if (Array.isArray(recentThemes) && recentThemes.length > 0) {
    const cleanThemes = recentThemes
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (cleanThemes.length > 0) {
      blocks.push(
        `STORICO RECENTE DI COMPORTAMENTI ANALIZZATI:\n- ${cleanThemes.join('\n- ')}`
      );
    }
  }

  return blocks.length > 0 ? `\n\n${blocks.join('\n\n')}` : '';
}

function mapGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      message: 'Chiave API Gemini non configurata nel pannello Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Chiave API Gemini non valida o non autorizzata. Verifica Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Quota API temporaneamente esaurita. Riprova tra qualche istante.',
    };
  }
  return {
    status: 500,
    message: 'Errore durante la ricerca e analisi psicologica. Riprova tra poco.',
  };
}

async function generateWithSearchFallback(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction?: string
) {
  try {
    return await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      })
    );
  } catch (primaryError) {
    const msg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn('Primary gemini-4-hydrogen + googleSearch failed, trying fallback:', msg);

    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('GEMINI_API_KEY_MISSING')
    ) {
      throw primaryError;
    }

    try {
      return await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );
    } catch (secondaryError) {
      const msg2 = secondaryError instanceof Error ? secondaryError.message : String(secondaryError);
      console.warn('Fallback gemini-4-hydrogen failed, trying gemini-3.1-flash-lite:', msg2);

      return await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        })
      );
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: '[I] WHY', timestamp: new Date().toISOString() });
  });

  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const { query, personalContext, recentThemes } = req.body as {
        query?: string;
        personalContext?: PersonalContextProfile | null;
        recentThemes?: string[];
      };

      if (!query || typeof query !== 'string' || query.trim().length < 4) {
        res.status(400).json({
          error: 'Inserisci un comportamento o una domanda di almeno 4 caratteri.',
        });
        return;
      }

      const trimmedQuery = query.trim().slice(0, 1200);
      const ai = getGenAIClient();
      const contextBlock = formatPersonalContextBlock(personalContext, recentThemes);

      const systemInstruction = `Sei "[I] WHY", un esecutore intelligente di analisi psicologica e comportamentale in lingua italiana.
Il tuo compito è rispondere alla domanda profonda "Perché io faccio..." cercando evidenze scientifiche, letteratura psicologica (CBT, psicologia cognitiva, neuroscienze comportamentali, teoria dell'attaccamento, economia comportamentale) tramite Google Search per offrire sempre la risposta più accurata, umana e verificata.

REGOLE DI FORMATTAZIONE OBBLIGATORIE (usa esattamente questi tag su righe dedicate, senza testo prima del primo tag):
[PATTERN]
Scegli UNA sola categoria esatta tra: Evitamento Emotivo, Ricerca di Approvazione, Sovraccarico Cognitivo, Abitudine Automatica, Bisogno di Controllo, Paura del Fallimento, Regolazione Emotiva, Altro

[MOTIVO_MIGLIORE]
2-3 frasi chiare, dirette e illuminate che sintetizzano la risposta migliore e più probabile al perché l'utente mette in atto questo comportamento.

[ANALISI_PSICOLOGICA]
Un'analisi approfondita ma accessibile (2-3 paragrafi) sui meccanismi psicologici, bias cognitivi, loop abitudine-ricompensa e bisogni emotivi sottostanti, integrando le fonti web consultate e l'eventuale contesto personale fornito.

[SPUNTI_RIFLESSIONE]
- Domanda di auto-osservazione 1
- Domanda di auto-osservazione 2
- Domanda di auto-osservazione 3

[SOLUZIONI]
1. Micro-risoluzione immediata (azione concreta applicabile oggi in meno di 5 minuti)
2. Strategia di ristrutturazione cognitiva o ambientale
3. Pratica di consapevolezza a medio termine

[DRIVER_EMOTIVI]
Etichetta1, Etichetta2, Etichetta3

Tono: lucido, empatico, mai giudicante, basato su evidenze psicologiche reali.`;

      const userPrompt = `Domanda dell'utente: "${trimmedQuery}"${contextBlock}

Esegui una ricerca web sulle basi psicologiche e comportamentali di questo fenomeno, individua la spiegazione migliore e genera le sezioni richieste.`;

      const response = await generateWithSearchFallback(ai, userPrompt, systemInstruction);

      const rawText = response.text ?? '';
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const analysis = parseBehavioralResponse(trimmedQuery, rawText, groundingMetadata);

      res.json({ analysis });
    } catch (error) {
      console.error('Error in /api/analyze:', error);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/awareness-synthesis', async (req: Request, res: Response) => {
    try {
      const { themes } = req.body as {
        themes?: Array<{
          query: string;
          pattern: string;
          reflection?: string;
          status: string;
        }>;
      };

      if (!Array.isArray(themes) || themes.length === 0) {
        res.status(400).json({
          error: 'Servono almeno 1 o più note decifrate per generare una sintesi evolutiva.',
        });
        return;
      }

      const ai = getGenAIClient();
      const digest = themes
        .slice(0, 15)
        .map(
          (item, idx) =>
            `${idx + 1}. Comportamento: "${item.query}" | Pattern: ${item.pattern} | Stato: ${item.status}${
              item.reflection ? ` | Riflessione personale: "${item.reflection}"` : ''
            }`
        )
        .join('\n');

      const response = await generateWithSearchFallback(
        ai,
        `Analizza lo storico longitudinale di questi comportamenti osservati dall'utente nel tempo:\n\n${digest}\n\nIdentifica in italiano:\n1. Il filo conduttore psicologico nascosto tra questi comportamenti.\n2. I progressi già evidenti tra le azioni integrate e quelle in corso.\n3. Tre priorità concrete per elevare la consapevolezza personale nelle prossime 2 settimane.\n\nScrivi in prosa chiara e strutturata con sezioni leggibili (niente codice o punteggi arbitrari).`
      );

      const { sources } = extractGroundingSources(response.candidates?.[0]?.groundingMetadata);
      res.json({
        synthesis: response.text ?? 'Sintesi non disponibile al momento.',
        sources,
      });
    } catch (error) {
      console.error('Error in /api/awareness-synthesis:', error);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[I] WHY server running on http://0.0.0.0:${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
