<script setup lang="ts">
/**
 * Index Page
 * Welcome page with overview of the documentation
 */

import { ref } from 'vue';

definePageMeta({
  layout: 'default',
});

useHead({
  title: 'Documentation',
  meta: [
    {
      name: 'description',
      content: 'Browse documentation with semantic search',
    },
  ],
});

const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// Fetch all articles for sidebar from API
const { data: articles } = await useFetch('/api/articles');
</script>

<template>
  <div>
    <DocsHeader @toggle-sidebar="toggleSidebar" />

    <div class="flex">
      <DocsSidebar v-if="articles" :articles="articles" :is-open="sidebarOpen" />

      <main class="flex-1 lg:pl-64 xl:pr-64 min-w-0 relative z-10">
        <div class="mx-auto max-w-4xl px-6 py-8 lg:px-8">
          <article class="prose prose-neutral dark:prose-invert max-w-none">
            <div class="mb-8">
              <h1
                id="welcome"
                class="text-4xl font-bold tracking-tight text-balance mb-4"
              >
                Welcome to Your Documentation
              </h1>
              <p class="text-lg text-muted-foreground leading-relaxed">
                Your content is powered by libSQL with vector search
                capabilities.
              </p>
            </div>

            <section id="features" class="mb-12">
              <h2 class="text-3xl font-bold tracking-tight mb-4 text-balance">
                Features
              </h2>
              <ul class="space-y-2">
                <li>
                  📝 <strong>Database Storage</strong>: Content stored in
                  distributed libSQL database
                </li>
                <li>
                  🔍 <strong>Semantic Search</strong>: AI-powered vector search
                </li>
                <li>
                  🚀 <strong>Edge-Ready</strong>: Fast global access via Turso
                </li>
                <li>
                  🆓 <strong>Free Options</strong>: Local embeddings or Gemini
                  API
                </li>
              </ul>
            </section>

            <section id="getting-started" class="mb-12">
              <h2 class="text-3xl font-bold tracking-tight mb-4 text-balance">
                Getting Started
              </h2>
              <p class="text-base leading-relaxed mb-4">
                Select an article from the sidebar or use the search bar for
                semantic search.
              </p>
            </section>
          </article>
        </div>
      </main>

      <DocsToc />
    </div>
  </div>
</template>
