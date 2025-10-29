/**
 * Get all articles
 */
import { getAllArticles } from '@logan/libsql-search';
import { getTursoClient } from '../utils/turso';

export default defineEventHandler(async () => {
  const client = getTursoClient();
  const articles = await getAllArticles(client);
  return articles;
});
