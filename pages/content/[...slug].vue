<script setup lang="ts">
/**
 * Dynamic Content Page
 * Displays individual articles with markdown rendering
 */

import { marked, type Tokens } from 'marked';
import { computed, ref, watch } from 'vue';
import type { Article } from '../types/article';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const slug = computed(() =>
  Array.isArray(route.params.slug)
    ? route.params.slug.join('/')
    : route.params.slug,
);

const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// Configure marked to add IDs to headings and handle external links
marked.use({
  renderer: {
    heading({ tokens, depth }: { tokens: Tokens.Generic[]; depth: number }) {
      const text = this.parser.parseInline(tokens);
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    link({
      href,
      title,
      tokens,
    }: {
      href?: string;
      title?: string | null;
      tokens: Tokens.Generic[];
    }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : '';

      // Open external links in new tab
      if (href?.startsWith('http://') || href?.startsWith('https://')) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      // Internal links open in same tab
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },
  },
});

// Fetch the article from API
const {
  data: article,
  error,
  refresh,
} = await useFetch<Article>(() => `/api/articles/${slug.value}`, {
  key: () => `article-${slug.value}`,
  watch: false, // We'll manually watch below
});

// Watch slug changes and refresh data
watch(slug, () => {
  refresh();
});

if (error.value || !article.value) {
  throw createError({
    statusCode: 404,
    message: 'Article not found',
  });
}

// Convert markdown to HTML reactively
const htmlContent = computed(() => {
  if (!article.value) return '';
  return marked.parse(article.value.content);
});

// Parse tags reactively
const tags = computed(() => article.value?.tags || []);

// Fetch all articles for sidebar from API
const { data: articles } = await useFetch<Article[]>('/api/articles');

// Update head metadata reactively
useHead(() => ({
  title: article.value?.title || 'Documentation',
  meta: [
    {
      name: 'description',
      content: article.value?.title || '',
    },
  ],
}));
</script>

<template>
  <div>
    <DocsHeader @toggle-sidebar="toggleSidebar" />

    <div class="flex">
      <DocsSidebar v-if="articles" :articles="articles" :is-open="sidebarOpen" />

      <main class="flex-1 lg:pl-64 xl:pr-64 min-w-0 relative z-10">
        <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <article
            v-if="article"
            class="prose prose-neutral dark:prose-invert max-w-none overflow-x-auto relative"
          >
            <header class="mb-8 pb-6 border-b border-border">
              <h1 class="text-4xl font-bold tracking-tight text-balance mb-4">
                {{ article.title }}
              </h1>
              <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="tag in tags"
                  :key="tag"
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                >
                  {{ tag }}
                </span>
              </div>
            </header>

            <div class="article-content" v-html="htmlContent" />

            <footer class="mt-12 pt-6 border-t border-border">
              <p class="text-sm text-muted-foreground">
                Last updated:
                {{
                  new Date(article.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }}
              </p>
            </footer>
          </article>
        </div>
      </main>

      <DocsToc />
    </div>
  </div>
</template>

<style>
/* Article content styling */
.article-content {
  line-height: 1.75;
  color: var(--foreground);
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4),
.article-content :deep(h5),
.article-content :deep(h6) {
  color: var(--foreground);
  font-weight: 700;
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.article-content :deep(h1) {
  font-size: 2.25rem;
}

.article-content :deep(h2) {
  font-size: 1.875rem;
  scroll-margin-top: 5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  margin-top: 3rem;
}

.article-content :deep(h3) {
  font-size: 1.5rem;
  scroll-margin-top: 5rem;
}

.article-content :deep(h4) {
  font-size: 1.25rem;
}

.article-content :deep(p) {
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
  padding-left: 1.75rem;
}

.article-content :deep(ul) {
  list-style-type: disc;
}

.article-content :deep(ol) {
  list-style-type: decimal;
}

.article-content :deep(li) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.article-content :deep(li::marker) {
  color: var(--muted-foreground);
}

.article-content :deep(strong) {
  color: var(--foreground);
  font-weight: 600;
}

.article-content :deep(pre) {
  background: var(--muted);
  color: var(--foreground);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1.5rem 0;
  border: 1px solid var(--border);
}

.article-content :deep(code) {
  background: var(--muted);
  color: var(--foreground);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: ui-monospace, 'Monaco', 'Courier New', monospace;
  border: 1px solid var(--border);
}

.article-content :deep(pre code) {
  background: transparent;
  padding: 0;
  border: none;
  font-size: 0.875rem;
}

.article-content :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-color: var(--primary);
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
  font-weight: 500;
  transition: all 0.2s;
}

.article-content :deep(a:hover) {
  text-decoration-thickness: 3px;
  opacity: 0.8;
}

.article-content :deep(blockquote) {
  border-left: 4px solid var(--border);
  padding-left: 1rem;
  font-style: italic;
  color: var(--muted-foreground);
  margin: 1.5rem 0;
}

.article-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 3rem 0;
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 2rem 0;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
}

.article-content :deep(th),
.article-content :deep(td) {
  padding: 0.75rem;
  border: 1px solid var(--border);
  text-align: left;
}

.article-content :deep(th) {
  background: var(--muted);
  font-weight: 600;
}
</style>
