<script setup lang="ts">
/**
 * Semantic Search Component
 * Modal dialog with ⌘K keyboard shortcut
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  folder: string;
  tags: string[];
  distance: number;
}

interface Props {
  placeholder?: string;
  maxResults?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search articles...',
  maxResults: 10,
});

const open = ref(false);
const query = ref('');
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let searchTimeout: NodeJS.Timeout | null = null;

// Handle ⌘K keyboard shortcut
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    open.value = !open.value;
  }
  if (e.key === 'Escape' && open.value) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});

// Perform search function
const performSearch = async (searchQuery: string) => {
  if (searchQuery.length < 2) {
    results.value = [];
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        limit: props.maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    results.value = data.results || [];
  } catch (err) {
    console.error('Search error:', err);
    error.value = 'Search failed. Please try again.';
    results.value = [];
  } finally {
    loading.value = false;
  }
};

// Handle input changes with debouncing
watch(query, (value) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (value.length >= 2) {
    searchTimeout = setTimeout(() => {
      performSearch(value);
    }, 300);
  } else {
    results.value = [];
  }
});

// Reset query when dialog closes
watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = '';
    results.value = [];
  }
});

// Group results by folder
const groupedResults = computed(() => {
  return results.value.reduce(
    (acc, result) => {
      if (!acc[result.folder]) {
        acc[result.folder] = [];
      }
      const folder = acc[result.folder];
      if (folder) {
        folder.push(result);
      }
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );
});

const handleResultClick = (slug: string) => {
  navigateTo(`/content/${slug}`);
  open.value = false;
};
</script>

<template>
  <div>
    <!-- Search Button -->
    <button
      type="button"
      @click="open = true"
      class="relative w-full h-10 flex items-center justify-center sm:justify-start px-2 py-2 text-left text-sm bg-muted/50 border border-input rounded-lg hover:bg-muted transition-colors sm:px-3 sm:pl-10"
      aria-label="Search"
    >
      <svg
        class="h-4 w-4 text-muted-foreground sm:absolute sm:left-3 sm:top-1/2 sm:-translate-y-1/2"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <span class="text-muted-foreground truncate hidden sm:inline">
        {{ placeholder }}
      </span>
      <kbd
        class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100"
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </button>

    <!-- Search Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="open"
          class="fixed inset-0 z-50 bg-black/80"
          @click="open = false"
        />
      </Transition>

      <Transition name="dialog">
        <div
          v-if="open"
          class="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 grid gap-4 border border-border bg-background p-0 shadow-lg rounded-lg overflow-hidden"
          @click.stop
        >
          <!-- Search Input -->
          <div class="relative flex items-center border-b border-border">
            <svg
              class="absolute left-3 h-5 w-5 shrink-0 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              v-model="query"
              type="text"
              :placeholder="placeholder"
              class="flex h-12 w-full bg-transparent px-3 pl-10 text-sm outline-none placeholder:text-muted-foreground"
              autofocus
            />
            <button
              type="button"
              @click="open = false"
              class="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <svg
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Results List -->
          <div class="max-h-[500px] overflow-y-auto overflow-x-hidden p-2">
            <div v-if="loading" class="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>

            <div
              v-else-if="error"
              class="py-4 px-2 text-center text-sm text-destructive"
            >
              {{ error }}
            </div>

            <div
              v-else-if="query.length >= 2 && results.length === 0"
              class="py-6 text-center text-sm text-muted-foreground"
            >
              No results found for "{{ query }}"
            </div>

            <div
              v-else-if="query.length < 2"
              class="py-6 text-center text-sm text-muted-foreground"
            >
              Type at least 2 characters to search...
            </div>

            <div v-else>
              <div
                v-for="(folderResults, folder) in groupedResults"
                :key="folder"
                class="mb-4"
              >
                <div
                  class="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase"
                >
                  {{ folder }}
                </div>
                <div
                  v-for="result in folderResults"
                  :key="result.id"
                  @click="handleResultClick(result.slug)"
                  class="flex flex-col items-start gap-1 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <div class="font-medium text-sm">{{ result.title }}</div>
                  <div v-if="result.tags.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in result.tags"
                      :key="tag"
                      class="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px]"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.2s;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: translate(-50%, -10%) scale(0.95);
}
</style>
