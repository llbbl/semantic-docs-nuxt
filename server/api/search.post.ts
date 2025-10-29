/**
 * Vector Search API Endpoint
 * Uses libsql-search for semantic search
 */

import { search } from '@logan/libsql-search';
import { logger } from '@logan/logger';
import { checkRateLimit, createRateLimitHeaders } from '../utils/rateLimit';
import { getTursoClient } from '../utils/turso';

export default defineEventHandler(async (event) => {
  // Rate limiting: 20 requests per minute per IP
  const rateLimitResult = checkRateLimit(event, {
    maxRequests: 20,
    windowSeconds: 60,
  });

  const rateLimitHeaders = {
    'Content-Type': 'application/json',
    ...createRateLimitHeaders(rateLimitResult),
  };

  // Set headers
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    setResponseHeader(event, key, value);
  }

  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    setResponseStatus(event, 429);
    // Retry-After header accepts number of seconds
    setResponseHeader(event, 'Retry-After', retryAfterSeconds);
    return {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: retryAfterSeconds,
    };
  }

  try {
    const body = await readBody(event);
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      setResponseStatus(event, 400);
      return { error: 'Query parameter is required' };
    }

    // Limit query length to prevent abuse
    if (query.length > 500) {
      setResponseStatus(event, 400);
      return {
        error: 'Query too long',
        message: 'Query must be less than 500 characters',
      };
    }

    // Limit max results to prevent excessive database queries
    const sanitizedLimit = Math.min(Math.max(1, Number(limit) || 10), 20);

    const client = getTursoClient();

    // Perform vector search
    const results = await search({
      client,
      query,
      limit: sanitizedLimit,
      embeddingOptions: {
        provider:
          (process.env.EMBEDDING_PROVIDER as 'local' | 'gemini' | 'openai') ||
          'local',
      },
    });

    return {
      results,
      count: results.length,
      query,
    };
  } catch (error) {
    logger.error('Search error:', error);

    setResponseStatus(event, 500);
    return {
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
