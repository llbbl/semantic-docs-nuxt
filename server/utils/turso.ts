/**
 * Turso/LibSQL client wrapper using libsql-search
 * Falls back to local SQLite file when Turso credentials aren't available
 */

import { type Client, createClient } from '@libsql/client';
import { logger } from '@logan/logger';

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    // Support both import.meta.env (Vite) and process.env (Node.js)
    const url = (process.env.TURSO_DB_URL || (typeof import.meta !== 'undefined' && (import.meta.env as Record<string, string>)?.TURSO_DB_URL)) as string | undefined;
    const authToken = (process.env.TURSO_AUTH_TOKEN || (typeof import.meta !== 'undefined' && (import.meta.env as Record<string, string>)?.TURSO_AUTH_TOKEN)) as string | undefined;

    if (url && authToken) {
      // Use Turso remote database
      logger.info(`Using Turso database: ${url}`);
      client = createClient({ url, authToken });
    } else {
      // Fall back to local libSQL file (for CI/development)
      logger.warn('Turso credentials not found, using local libSQL database');
      client = createClient({ url: 'file:local.db' });
    }
  }

  return client;
}

// Re-export search utilities from libsql-search
export {
  getAllArticles,
  getArticleBySlug,
  getArticlesByFolder,
  getFolders,
} from '@logan/libsql-search';
