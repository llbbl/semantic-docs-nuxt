/**
 * Get article by slug
 */
import { getArticleBySlug } from '@logan/libsql-search';
import { getTursoClient } from '../../utils/turso';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    });
  }

  const client = getTursoClient();
  const article = await getArticleBySlug(client, slug);

  if (!article) {
    throw createError({
      statusCode: 404,
      message: 'Article not found',
    });
  }

  return article;
});
