/**
 * Environment variable type definitions
 */

interface ImportMetaEnv {
  TURSO_DB_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  EMBEDDING_PROVIDER?: 'local' | 'gemini' | 'openai';
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
