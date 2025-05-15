import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type ThemeState = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'theme-storage',
    }
  )
);

export default useThemeStore;