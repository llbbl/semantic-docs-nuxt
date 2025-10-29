import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { themes } from '../config/themes';
import ThemeSwitcher from './ThemeSwitcher.vue';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders theme button', () => {
    const wrapper = mount(ThemeSwitcher);
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('shows all available themes when opened', async () => {
    const wrapper = mount(ThemeSwitcher);
    await wrapper.find('button').trigger('click');

    const themeButtons = wrapper.findAll('button');
    // +1 for the main toggle button, +1 for the overlay/backdrop button
    expect(themeButtons.length).toBe(themes.length + 2);
  });

  it('applies saved theme from localStorage on mount', () => {
    localStorageMock.setItem('theme', 'ocean');
    const wrapper = mount(ThemeSwitcher);

    expect(wrapper.vm.currentTheme).toBe('ocean');
  });

  it('defaults to dark theme when no saved theme', () => {
    const wrapper = mount(ThemeSwitcher);
    expect(wrapper.vm.currentTheme).toBe('dark');
  });

  it('closes dropdown when theme is selected', async () => {
    const wrapper = mount(ThemeSwitcher);
    await wrapper.find('button').trigger('click');
    expect(wrapper.vm.isOpen).toBe(true);

    // Find and click a theme button (skip the first button which is the toggle)
    const themeButtons = wrapper.findAll('button');
    await themeButtons[1].trigger('click');

    expect(wrapper.vm.isOpen).toBe(false);
  });
});
