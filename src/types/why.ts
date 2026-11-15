export type NoteStatus = 'to_explore' | 'practicing' | 'integrated';

export type PatternCategory =
  | 'Evitamento Emotivo'
  | 'Ricerca di Approvazione'
  | 'Sovraccarico Cognitivo'
  | 'Abitudine Automatica'
  | 'Bisogno di Controllo'
  | 'Paura del Fallimento'
  | 'Regolazione Emotiva'
  | 'Altro';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BehavioralAnalysis {
  query: string;
  coreMotive: string;
  psychologicalAnalysis: string;
  reflectionPrompts: string[];
  solutionSteps: string[];
  patternCategory: PatternCategory;
  emotionalDrivers: string[];
  sources: GroundingSource[];
  searchQueries: string[];
}

export interface DecryptedNotePayload {
  id: string;
  behaviorQuery: string;
  coreMotive: string;
  psychologicalAnalysis: string;
  reflectionPrompts: string[];
  solutionSteps: string[];
  solutionRequested: boolean;
  personalReflection: string;
  patternCategory: PatternCategory;
  emotionalIntensity: number;
  sources: GroundingSource[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  keyVersion: number;
}

export interface VaultNoteRecord {
  id: string;
  status: NoteStatus;
  createdAtIso: string;
  updatedAtIso: string;
  encrypted: EncryptedPayload;
  decrypted: DecryptedNotePayload | null;
}

export interface PersonalContextProfile {
  goals: string;
  recurringTriggers: string;
  dailyRoutines: string;
  values: string;
}

export interface VaultMeta {
  salt: string;
  verifierCiphertext: string;
  verifierIv: string;
  iterations: number;
  keyVersion: number;
}

export const VAULT_LIMITS = {
  MAX_CIPHERTEXT_LENGTH: 200000,
  MAX_CONTEXT_CIPHERTEXT_LENGTH: 50000,
  MIN_PASSPHRASE_LENGTH: 6,
  PBKDF2_ITERATIONS: 250000,
  KEY_VERSION: 1,
} as const;
