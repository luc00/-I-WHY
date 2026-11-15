import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Lock, Moon, Sun } from 'lucide-react';
import { auth, signInWithGoogle, signOutUser } from './lib/firebase';
import {
  BehavioralAnalysis,
  DecryptedNotePayload,
  NoteStatus,
  PatternCategory,
  PersonalContextProfile,
  VAULT_LIMITS,
  VaultMeta,
  VaultNoteRecord,
} from './types/why';
import {
  computeVaultFingerprint,
  createVaultCredentials,
  encryptJson,
  unlockVaultWithPassphrase,
} from './utils/crypto';
import {
  CloudEncryptedNoteDoc,
  createCloudEncryptedNote,
  decryptNoteDocs,
  deleteCloudEncryptedNote,
  ensureCloudUserAccount,
  fetchCloudContextProfile,
  fetchCloudVaultMeta,
  generateSafeId,
  loadLocalContextProfile,
  loadLocalEncryptedNotes,
  loadLocalVaultMeta,
  saveCloudContextProfile,
  saveCloudVaultMeta,
  saveLocalContextProfile,
  saveLocalEncryptedNotes,
  saveLocalVaultMeta,
  subscribeCloudEncryptedNotes,
  SyncStatusMeta,
  updateCloudEncryptedNote,
  updateCloudNoteStatus,
} from './services/vaultService';
import { ActiveTab, TopBar } from './components/TopBar';
import { VaultGate } from './components/VaultGate';
import { ExecutorView } from './components/ExecutorView';
import { NotesView } from './components/NotesView';
import { AwarenessView } from './components/AwarenessView';
import { CryptoVaultView } from './components/CryptoVaultView';
import { PersonalContextModal } from './components/PersonalContextModal';
import { FramerSplash } from './components/FramerSplash';
import { HomePaperStage } from './components/HomePaperStage';

const EMPTY_CONTEXT: PersonalContextProfile = {
  goals: '',
  recurringTriggers: '',
  dailyRoutines: '',
  values: '',
};

const QUICK_LOCAL_PASSPHRASE = 'iwhy-local-session-vault';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1';
  });
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('executor');

  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Vault cryptographic state
  const [vaultMeta, setVaultMeta] = useState<VaultMeta | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  // Encrypted + Decrypted notes
  const [rawCloudDocs, setRawCloudDocs] = useState<CloudEncryptedNoteDoc[]>([]);
  const [notes, setNotes] = useState<VaultNoteRecord[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncStatusMeta | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Personal context profile
  const [personalContext, setPersonalContext] = useState<PersonalContextProfile>(EMPTY_CONTEXT);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  // Local migration count
  const [localNotesCount, setLocalNotesCount] = useState(0);

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setVaultKey(null);
      setNotes([]);
      setRawCloudDocs([]);
      setPersonalContext(EMPTY_CONTEXT);
      setVaultError(null);
      setSyncError(null);

      try {
        if (nextUser) {
          const meta = await fetchCloudVaultMeta(nextUser.uid);
          setVaultMeta(meta);
          setLocalNotesCount(loadLocalEncryptedNotes().length);
        } else {
          const localMeta = loadLocalVaultMeta();
          setVaultMeta(localMeta);
          setLocalNotesCount(0);
        }
      } catch (err) {
        setVaultError(
          err instanceof Error ? err.message : 'Errore nel caricamento dei metadati del vault.'
        );
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Compute vault fingerprint whenever metadata changes
  useEffect(() => {
    if (!vaultMeta) {
      setFingerprint('');
      return;
    }
    computeVaultFingerprint(vaultMeta)
      .then(setFingerprint)
      .catch(() => setFingerprint(''));
  }, [vaultMeta]);

  // Support ?autostart=1 for immediate local exploration
  useEffect(() => {
    if (!authReady || user || vaultKey) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleQuickLocalStart();
    }
  }, [authReady, user, vaultKey]);

  // Real-time Firestore or Local encrypted notes subscription when unlocked
  useEffect(() => {
    if (!vaultKey) {
      setNotes([]);
      return;
    }

    if (user) {
      const unsub = subscribeCloudEncryptedNotes(
        user.uid,
        (docs, meta) => {
          setRawCloudDocs(docs);
          setSyncMeta(meta);
          setSyncError(null);
        },
        (err) => {
          setSyncError(err.message);
        }
      );

      fetchCloudContextProfile(user.uid, vaultKey)
        .then((ctx) => {
          if (ctx) setPersonalContext(ctx);
        })
        .catch(() => {});

      return () => unsub();
    }

    // Local mode
    const localDocs = loadLocalEncryptedNotes();
    setRawCloudDocs(localDocs);
    setSyncMeta({
      fromCache: false,
      hasPendingWrites: false,
      lastSyncedIso: new Date().toISOString(),
    });
    loadLocalContextProfile(vaultKey)
      .then((ctx) => {
        if (ctx) setPersonalContext(ctx);
      })
      .catch(() => {});
  }, [user, vaultKey]);

  // Decrypt raw encrypted docs in browser RAM whenever docs or key update
  useEffect(() => {
    if (!vaultKey) {
      setNotes([]);
      return;
    }
    let cancelled = false;
    decryptNoteDocs(rawCloudDocs, vaultKey).then((decryptedList) => {
      if (!cancelled) {
        setNotes(decryptedList);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rawCloudDocs, vaultKey]);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setVaultError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setVaultError(
        err instanceof Error ? err.message : 'Accesso Google annullato o non riuscito.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOutUser();
      setVaultKey(null);
      setActiveTab('executor');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCreateVault = async (passphrase: string) => {
    setVaultBusy(true);
    setVaultError(null);
    try {
      const { key, meta } = await createVaultCredentials(passphrase, VAULT_LIMITS.KEY_VERSION);
      if (user) {
        await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
        await saveCloudVaultMeta(user.uid, meta, false);
      } else {
        saveLocalVaultMeta(meta);
      }
      setVaultMeta(meta);
      setVaultKey(key);
    } catch (err) {
      setVaultError(
        err instanceof Error ? err.message : 'Impossibile creare il vault crittografato.'
      );
    } finally {
      setVaultBusy(false);
    }
  };

  const handleUnlockVault = async (passphrase: string) => {
    if (!vaultMeta) return;
    setVaultBusy(true);
    setVaultError(null);
    try {
      const key = await unlockVaultWithPassphrase(passphrase, vaultMeta);
      setVaultKey(key);
    } catch (err) {
      setVaultError(
        err instanceof Error ? err.message : 'Passphrase errata.'
      );
    } finally {
      setVaultBusy(false);
    }
  };

  const handleQuickLocalStart = useCallback(async () => {
    setVaultBusy(true);
    setVaultError(null);
    try {
      let existingMeta = loadLocalVaultMeta();
      if (!existingMeta) {
        const created = await createVaultCredentials(
          QUICK_LOCAL_PASSPHRASE,
          VAULT_LIMITS.KEY_VERSION
        );
        saveLocalVaultMeta(created.meta);
        setVaultMeta(created.meta);
        setVaultKey(created.key);
      } else {
        try {
          const key = await unlockVaultWithPassphrase(QUICK_LOCAL_PASSPHRASE, existingMeta);
          setVaultMeta(existingMeta);
          setVaultKey(key);
        } catch {
          setVaultError('Esiste già un vault locale protetto dalla tua passphrase personale.');
        }
      }
    } finally {
      setVaultBusy(false);
    }
  }, []);

  const handleLockVault = () => {
    setVaultKey(null);
    setNotes([]);
    setPersonalContext(EMPTY_CONTEXT);
    setActiveTab('executor');
  };

  const persistLocalNoteList = (updater: (prev: CloudEncryptedNoteDoc[]) => CloudEncryptedNoteDoc[]) => {
    setRawCloudDocs((prev) => {
      const next = updater(prev);
      saveLocalEncryptedNotes(next);
      return next;
    });
    setSyncMeta({
      fromCache: false,
      hasPendingWrites: false,
      lastSyncedIso: new Date().toISOString(),
    });
  };

  const handleSaveAnalysisNote = async (params: {
    analysis: BehavioralAnalysis;
    solutionRequested: boolean;
    personalReflection: string;
    emotionalIntensity: number;
  }): Promise<string> => {
    if (!vaultKey) throw new Error('Vault bloccato.');
    const id = generateSafeId('why');
    const now = new Date().toISOString();

    const payload: DecryptedNotePayload = {
      id,
      behaviorQuery: params.analysis.query,
      coreMotive: params.analysis.coreMotive,
      psychologicalAnalysis: params.analysis.psychologicalAnalysis,
      reflectionPrompts: params.analysis.reflectionPrompts,
      solutionSteps: params.analysis.solutionSteps,
      solutionRequested: params.solutionRequested,
      personalReflection: params.personalReflection,
      patternCategory: params.analysis.patternCategory,
      emotionalIntensity: params.emotionalIntensity,
      sources: params.analysis.sources,
      createdAtIso: now,
      updatedAtIso: now,
    };

    const encrypted = await encryptJson(
      vaultKey,
      payload,
      vaultMeta?.keyVersion ?? VAULT_LIMITS.KEY_VERSION
    );

    if (user) {
      await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
      await createCloudEncryptedNote(user.uid, id, 'to_explore', encrypted);
    } else {
      const localDoc: CloudEncryptedNoteDoc = {
        id,
        ownerId: 'local',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
        status: 'to_explore',
        createdAtIso: now,
        updatedAtIso: now,
      };
      persistLocalNoteList((prev) => [localDoc, ...prev]);
    }

    setSelectedNoteId(id);
    return id;
  };

  const handleCreateManualNote = async (params: {
    behaviorQuery: string;
    coreMotive: string;
    personalReflection: string;
    patternCategory: PatternCategory;
    emotionalIntensity: number;
  }): Promise<string> => {
    if (!vaultKey) throw new Error('Vault bloccato.');
    const id = generateSafeId('note');
    const now = new Date().toISOString();

    const payload: DecryptedNotePayload = {
      id,
      behaviorQuery: params.behaviorQuery,
      coreMotive: params.coreMotive,
      psychologicalAnalysis: '',
      reflectionPrompts: [],
      solutionSteps: [],
      solutionRequested: false,
      personalReflection: params.personalReflection,
      patternCategory: params.patternCategory,
      emotionalIntensity: params.emotionalIntensity,
      sources: [],
      createdAtIso: now,
      updatedAtIso: now,
    };

    const encrypted = await encryptJson(
      vaultKey,
      payload,
      vaultMeta?.keyVersion ?? VAULT_LIMITS.KEY_VERSION
    );

    if (user) {
      await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
      await createCloudEncryptedNote(user.uid, id, 'to_explore', encrypted);
    } else {
      const localDoc: CloudEncryptedNoteDoc = {
        id,
        ownerId: 'local',
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
        status: 'to_explore',
        createdAtIso: now,
        updatedAtIso: now,
      };
      persistLocalNoteList((prev) => [localDoc, ...prev]);
    }
    return id;
  };

  const handleUpdateNote = async (
    noteId: string,
    status: NoteStatus,
    updatedPayload: DecryptedNotePayload
  ) => {
    if (!vaultKey) return;
    const encrypted = await encryptJson(
      vaultKey,
      updatedPayload,
      vaultMeta?.keyVersion ?? VAULT_LIMITS.KEY_VERSION
    );

    if (user) {
      await updateCloudEncryptedNote(user.uid, noteId, status, encrypted);
    } else {
      persistLocalNoteList((prev) =>
        prev.map((docItem) =>
          docItem.id === noteId
            ? {
                ...docItem,
                status,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                keyVersion: encrypted.keyVersion,
                updatedAtIso: updatedPayload.updatedAtIso,
              }
            : docItem
        )
      );
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (user) {
      await deleteCloudEncryptedNote(user.uid, noteId);
    } else {
      persistLocalNoteList((prev) => prev.filter((item) => item.id !== noteId));
    }
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  };

  const handleSeedSampleNotes = async () => {
    if (!vaultKey) return;
    const samples: Array<{
      query: string;
      motive: string;
      analysis: string;
      pattern: PatternCategory;
      reflection: string;
      status: NoteStatus;
      intensity: number;
      daysAgo: number;
    }> = [
      {
        query: 'Perché controllo le notifiche del lavoro anche a tarda sera?',
        motive:
          'Il controllo costante riduce temporaneamente l’ansia di perdere un’urgenza, ma mantiene attivo il sistema nervoso.',
        analysis:
          'Questo comportamento nasce da un loop di rinforzo intermittente: verificare l’assenza di problemi offre un micro-sollievo immediato che rafforza l’abitudine serale.',
        pattern: 'Bisogno di Controllo',
        reflection: 'Ho impostato la modalità silenziosa alle 21:00 per 3 sere consecutive.',
        status: 'integrated',
        intensity: 3,
        daysAgo: 4,
      },
      {
        query: 'Perché rimando i progetti creativi che desidero davvero realizzare?',
        motive:
          'Quando un obiettivo tocca la nostra identità, la paura del giudizio trasforma l’inizio in una minaccia emotiva.',
        analysis:
          'La procrastinazione sui progetti personali è spesso una forma di auto-protezione dell’autostima: finché non inizio, l’idea resta perfetta.',
        pattern: 'Paura del Fallimento',
        reflection: 'Sto provando a dedicare solo 10 minuti di bozza imperfetta al mattino.',
        status: 'practicing',
        intensity: 4,
        daysAgo: 2,
      },
      {
        query: 'Perché dico subito di sì alle richieste anche quando ho l’agenda piena?',
        motive:
          'Dire sì evita il micro-disagio immediato del conflitto o della possibile delusione altrui.',
        analysis:
          'L’automatismo di compiacenza sacrifica i confini a medio termine per preservare la serenità relazionale nel breve termine.',
        pattern: 'Ricerca di Approvazione',
        reflection: '',
        status: 'to_explore',
        intensity: 4,
        daysAgo: 0,
      },
    ];

    for (const s of samples) {
      const id = generateSafeId('seed');
      const dt = new Date(Date.now() - s.daysAgo * 86400000).toISOString();
      const payload: DecryptedNotePayload = {
        id,
        behaviorQuery: s.query,
        coreMotive: s.motive,
        psychologicalAnalysis: s.analysis,
        reflectionPrompts: [
          'Quale bisogno cerco di proteggere in quel preciso istante?',
          'Come mi sento 30 minuti dopo aver agito così?',
        ],
        solutionSteps: [
          'Introduci una pausa consapevole di 60 secondi prima di rispondere o agire.',
          'Sostituisci il gesto automatico con una micro-azione intenzionale.',
        ],
        solutionRequested: true,
        personalReflection: s.reflection,
        patternCategory: s.pattern,
        emotionalIntensity: s.intensity,
        sources: [],
        createdAtIso: dt,
        updatedAtIso: dt,
      };
      const encrypted = await encryptJson(
        vaultKey,
        payload,
        vaultMeta?.keyVersion ?? VAULT_LIMITS.KEY_VERSION
      );
      if (user) {
        await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
        await createCloudEncryptedNote(user.uid, id, s.status, encrypted);
      } else {
        const localDoc: CloudEncryptedNoteDoc = {
          id,
          ownerId: 'local',
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          keyVersion: encrypted.keyVersion,
          status: s.status,
          createdAtIso: dt,
          updatedAtIso: dt,
        };
        persistLocalNoteList((prev) => [localDoc, ...prev]);
      }
    }
  };

  const handleSavePersonalContext = async (profile: PersonalContextProfile) => {
    if (!vaultKey) return;
    setSavingContext(true);
    try {
      if (user) {
        await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
        await saveCloudContextProfile(user.uid, vaultKey, profile);
      } else {
        await saveLocalContextProfile(vaultKey, profile);
      }
      setPersonalContext(profile);
    } finally {
      setSavingContext(false);
    }
  };

  const handleRotatePassphrase = async (newPassphrase: string) => {
    if (!vaultKey) throw new Error('Sblocca prima il vault.');
    const nextVersion = (vaultMeta?.keyVersion ?? 1) + 1;
    const { key: newKey, meta: newMeta } = await createVaultCredentials(newPassphrase, nextVersion);

    // Re-encrypt all decrypted notes with the new key
    const reEncryptedNotes = await Promise.all(
      notes
        .filter((n) => n.decrypted !== null)
        .map(async (n) => ({
          id: n.id,
          status: n.status,
          createdAtIso: n.createdAtIso,
          updatedAtIso: new Date().toISOString(),
          encrypted: await encryptJson(newKey, n.decrypted!, nextVersion),
        }))
    );

    if (user) {
      await saveCloudVaultMeta(user.uid, newMeta, true);
      for (const item of reEncryptedNotes) {
        await updateCloudEncryptedNote(user.uid, item.id, item.status, item.encrypted);
      }
      await saveCloudContextProfile(user.uid, newKey, personalContext);
    } else {
      saveLocalVaultMeta(newMeta);
      saveLocalEncryptedNotes(
        reEncryptedNotes.map((item) => ({
          id: item.id,
          ownerId: 'local',
          ciphertext: item.encrypted.ciphertext,
          iv: item.encrypted.iv,
          keyVersion: item.encrypted.keyVersion,
          status: item.status,
          createdAtIso: item.createdAtIso,
          updatedAtIso: item.updatedAtIso,
        }))
      );
      await saveLocalContextProfile(newKey, personalContext);
    }

    setVaultMeta(newMeta);
    setVaultKey(newKey);
  };

  const handleMigrateLocalToCloud = async (): Promise<number> => {
    if (!user || !vaultKey) return 0;
    const localDocs = loadLocalEncryptedNotes();
    if (localDocs.length === 0) return 0;

    await ensureCloudUserAccount(user.uid, user.displayName || user.email || 'Utente Privato');
    let count = 0;

    // Re-encrypt decrypted notes with the active cloud vault key
    const localMeta = loadLocalVaultMeta();
    let localKey: CryptoKey | null = vaultKey;
    if (localMeta && localMeta.salt !== vaultMeta?.salt) {
      try {
        localKey = await unlockVaultWithPassphrase(QUICK_LOCAL_PASSPHRASE, localMeta);
      } catch {
        localKey = vaultKey;
      }
    }

    if (localKey) {
      const decryptedLocal = await decryptNoteDocs(localDocs, localKey);
      for (const item of decryptedLocal) {
        if (!item.decrypted) continue;
        const encrypted = await encryptJson(
          vaultKey,
          item.decrypted,
          vaultMeta?.keyVersion ?? VAULT_LIMITS.KEY_VERSION
        );
        await createCloudEncryptedNote(user.uid, item.id, item.status, encrypted);
        count += 1;
      }
    }

    saveLocalEncryptedNotes([]);
    setLocalNotesCount(0);
    return count;
  };

  const recentThemes = useMemo(
    () =>
      notes
        .filter((n) => n.decrypted !== null)
        .slice(0, 6)
        .map((n) => `${n.decrypted!.behaviorQuery} (${n.decrypted!.patternCategory})`),
    [notes]
  );

  // Check if user wants quick status update helper exposed cleanly
  void updateCloudNoteStatus;

  const isHomeView = authReady && ((!vaultKey && activeTab !== 'crypto') || activeTab === 'executor');

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#14171C] transition-colors dark:bg-[#0B0D11] dark:text-[#F1F3F5]">
      {showSplash && <FramerSplash onEnter={() => setShowSplash(false)} />}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        vaultUnlocked={Boolean(vaultKey)}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        authBusy={authBusy}
      />

      {/* Workspace Sub-toolbar (Theme, Vault Status, Sync Status) */}
      {authReady && (
        <div className="border-b border-[#E6E4DD] bg-white/60 dark:border-[#1E232D] dark:bg-[#0F131A]/70">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs text-[#5C6470] sm:px-6 dark:text-[#9CA3AF]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#14171C] dark:text-[#E5E7EB]">
                {vaultKey ? 'Vault Sbloccato' : 'Vault Bloccato'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{user ? `Cloud Sync (${user.email ?? 'Google'})` : 'Archivio Locale AES-256-GCM'}</span>
              {fingerprint && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Chiave {fingerprint.slice(0, 11)}</span>
                </>
              )}
              {syncMeta?.hasPendingWrites && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#1D4ED8] dark:text-[#60A5FA]">Sincronizzazione...</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {vaultKey && (
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="inline-flex items-center gap-1.5 font-medium text-[#5C6470] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:text-white"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Blocca
                </button>
              )}
              <button
                type="button"
                aria-label={darkMode ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
                onClick={() => setDarkMode((d) => !d)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-[#5C6470] hover:bg-[#EBE8E0] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:bg-[#1C222D] dark:hover:text-white"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{darkMode ? 'Chiaro' : 'Scuro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {syncError && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-[1200px] rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          Errore sincronizzazione Firestore: {syncError}
        </div>
      )}

      <main className={isHomeView ? '' : 'px-4 py-8 sm:px-6'}>
        {!authReady ? (
          <div className="mx-auto max-w-md py-20 text-center text-sm text-[#5C6470] dark:text-[#9CA3AF]">
            Inizializzazione del vault crittografico...
          </div>
        ) : !vaultKey && activeTab !== 'crypto' ? (
          <HomePaperStage>
            <VaultGate
              embeddedInSheet
              user={user}
              hasExistingVault={Boolean(vaultMeta)}
              isBusy={vaultBusy || authBusy}
              error={vaultError}
              onCreateVault={handleCreateVault}
              onUnlockVault={handleUnlockVault}
              onQuickLocalStart={handleQuickLocalStart}
              onGoogleSignIn={handleGoogleSignIn}
            />
          </HomePaperStage>
        ) : (
          <>
            {activeTab === 'executor' && (
              <HomePaperStage>
                <ExecutorView
                  embeddedInSheet
                  personalContext={personalContext}
                  recentThemes={recentThemes}
                  onOpenContextModal={() => setContextModalOpen(true)}
                  onSaveNote={handleSaveAnalysisNote}
                  onNavigateToNotes={(noteId) => {
                    setSelectedNoteId(noteId);
                    setActiveTab('notes');
                  }}
                />
              </HomePaperStage>
            )}

            {activeTab === 'notes' && (
              <NotesView
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={setSelectedNoteId}
                onUpdateNote={handleUpdateNote}
                onCreateManualNote={handleCreateManualNote}
                onDeleteNote={handleDeleteNote}
                onSeedSampleNotes={handleSeedSampleNotes}
                onGoToExecutor={() => setActiveTab('executor')}
                isCloudSynced={Boolean(user)}
                lastSyncedIso={syncMeta?.lastSyncedIso ?? null}
              />
            )}

            {activeTab === 'awareness' && (
              <AwarenessView
                notes={notes}
                onGoToExecutor={() => setActiveTab('executor')}
              />
            )}

            {activeTab === 'crypto' && (
              <CryptoVaultView
                user={user}
                vaultMeta={vaultMeta}
                fingerprint={fingerprint}
                vaultUnlocked={Boolean(vaultKey)}
                notes={notes}
                localNotesCountToMigrate={localNotesCount}
                onLockVault={handleLockVault}
                onRotatePassphrase={handleRotatePassphrase}
                onGoogleSignIn={handleGoogleSignIn}
                onMigrateLocalToCloud={handleMigrateLocalToCloud}
              />
            )}
          </>
        )}
      </main>

      <PersonalContextModal
        open={contextModalOpen}
        profile={personalContext}
        isSaving={savingContext}
        onClose={() => setContextModalOpen(false)}
        onSave={handleSavePersonalContext}
      />
    </div>
  );
}
