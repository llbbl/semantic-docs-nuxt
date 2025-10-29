/**
 * Get article by slug
 */
import { getArticleBySlug } from '@logan/libsql-search';
import { getTursoClient } from '../../utils/turso';

export default defineEventHandler(async (event) => {
  const slugParam = getRouterParam(event, 'slug');

  if (!slugParam) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    });
  }

  // Join slug segments with /
  const slug = slugParam;

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
