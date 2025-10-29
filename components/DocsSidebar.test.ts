import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Article } from '../types/article';
import DocsSidebar from './DocsSidebar.vue';

const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Getting Started',
    slug: 'getting-started/intro',
    content: 'Content',
    tags: [],
    folder: 'getting-started',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 2,
    title: 'Installation',
    slug: 'getting-started/installation',
    content: 'Content',
    tags: [],
    folder: 'getting-started',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 3,
    title: 'API Reference',
    slug: 'api/reference',
    content: 'Content',
    tags: [],
    folder: 'api',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

// Mock useRoute globally before imports
const mockRoute = {
  path: '/content/getting-started/intro',
};

vi.stubGlobal('useRoute', () => mockRoute);

describe('DocsSidebar', () => {
  it('renders sidebar with articles', () => {
    const wrapper = mount(DocsSidebar, {
      props: {
        articles: mockArticles,
        isOpen: true,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.find('aside').exists()).toBe(true);
    expect(wrapper.text()).toContain('Getting Started');
    expect(wrapper.text()).toContain('Installation');
  });

  it('groups articles by folder', () => {
    const wrapper = mount(DocsSidebar, {
      props: {
        articles: mockArticles,
        isOpen: true,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const folders = wrapper.vm.articlesByFolder;
    expect(Object.keys(folders)).toContain('getting-started');
    expect(Object.keys(folders)).toContain('api');
    expect(folders['getting-started']).toHaveLength(2);
    expect(folders.api).toHaveLength(1);
  });

  it('formats folder names correctly', () => {
    const wrapper = mount(DocsSidebar, {
      props: {
        articles: mockArticles,
        isOpen: true,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    expect(wrapper.vm.formatFolderName('getting-started')).toBe(
      'Getting Started',
    );
    expect(wrapper.vm.formatFolderName('api')).toBe('Api');
    expect(wrapper.vm.formatFolderName('root')).toBe('Documentation');
  });

  it('applies correct classes when sidebar is closed', () => {
    const wrapper = mount(DocsSidebar, {
      props: {
        articles: mockArticles,
        isOpen: false,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('-translate-x-full');
  });

  it('applies correct classes when sidebar is open', () => {
    const wrapper = mount(DocsSidebar, {
      props: {
        articles: mockArticles,
        isOpen: true,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    });

    const aside = wrapper.find('aside');
    expect(aside.classes()).toContain('translate-x-0');
  });
});
