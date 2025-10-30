/**
 * Check database contents
 * Displays all articles in the database with their slugs and basic info
 */

import { getTursoClient } from '../server/utils/turso';

async function checkDatabase() {
  const db = getTursoClient();

  try {
    // Check if table exists
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='articles'",
    );

    if (tables.rows.length === 0) {
      console.error('❌ Articles table does not exist!');
      console.log('Run: pnpm db:init (or pnpm db:init:local)');
      return;
    }

    console.log('✅ Articles table exists\n');

    // Get all articles
    const result = await db.execute(
      'SELECT * FROM articles ORDER BY folder, slug',
    );

    if (result.rows.length === 0) {
      console.error('❌ No articles found in database!');
      console.log('Run: pnpm index (or pnpm index:local)');
      return;
    }

    console.log(`📚 Found ${result.rows.length} articles:\n`);

    // Display articles grouped by folder
    interface ArticleRow {
      slug: string;
      title: string;
      content: string;
      folder: string;
      tags: string;
    }

    const articlesByFolder: Record<string, ArticleRow[]> = {};

    for (const row of result.rows) {
      const folder = row.folder as string;
      if (!articlesByFolder[folder]) {
        articlesByFolder[folder] = [];
      }
      articlesByFolder[folder].push(row as unknown as ArticleRow);
    }

    for (const [folder, articles] of Object.entries(articlesByFolder)) {
      console.log(`\n📁 ${folder}/`);
      for (const article of articles) {
        console.log(`   - ${article.slug}`);
        console.log(`     Title: ${article.title}`);
        console.log(`     Content length: ${article.content.length} chars`);
        console.log(`     Tags: ${article.tags || '[]'}`);
      }
    }

    console.log(`\n✅ Total: ${result.rows.length} articles indexed`);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  }
}

checkDatabase().catch(console.error);
