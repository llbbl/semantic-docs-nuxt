<script setup lang="ts">
/**
 * Docs Sidebar Component
 * Collapsible navigation populated from Turso database
 */

import { computed, ref } from 'vue';
import type { Article } from '../types/article';

interface Props {
  articles: Article[];
  isOpen: boolean;
}

const props = defineProps<Props>();
const route = useRoute();

// Group articles by folder
const articlesByFolder = computed(() => {
  return props.articles.reduce(
    (acc, article) => {
      const folder = article.folder || 'root';
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(article);
      return acc;
    },
    {} as Record<string, Article[]>,
  );
});

// Format folder names for display
const formatFolderName = (folder: string): string => {
  if (folder === 'root') return 'Documentation';
  return folder
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Track open/closed state of each folder
const openFolders = ref<Record<string, boolean>>({});

// Initialize all folders as open
Object.keys(articlesByFolder.value).forEach((folder) => {
  openFolders.value[folder] = true;
});

const toggleFolder = (folder: string) => {
  openFolders.value[folder] = !openFolders.value[folder];
};

// Check if link is active
const isActive = (slug: string) => {
  const href = `/content/${slug}`;
  return route.path === href || route.path.startsWith(`${href}/`);
};
</script>

<template>
  <aside
    :class="[
      'fixed top-14 z-30 transition-transform duration-300 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar lg:block',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <div class="py-6 px-6">
      <nav class="space-y-2">
        <div
          v-for="(articles, folder) in articlesByFolder"
          :key="folder"
          class="mb-4"
        >
          <button
            @click="toggleFolder(String(folder))"
            class="flex w-full items-center justify-between py-2 text-sm font-medium text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
          >
            {{ formatFolderName(String(folder)) }}
            <svg
              :class="[
                'h-4 w-4 transition-transform',
                openFolders[folder] ? 'rotate-180' : '',
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <Transition name="slide">
            <div v-show="openFolders[folder]" class="mt-2 space-y-1">
              <NuxtLink
                v-for="article in articles"
                :key="article.id"
                :to="`/content/${article.slug}`"
                :class="[
                  'block py-2 text-sm transition-colors pl-4 border-l-2',
                  isActive(article.slug)
                    ? 'text-sidebar-foreground border-sidebar-primary font-medium'
                    : 'text-muted-foreground border-transparent hover:text-sidebar-foreground hover:border-muted-foreground/30',
                ]"
              >
                {{ article.title }}
              </NuxtLink>
            </div>
          </Transition>
        </div>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
