import useThemeStore from "@/store/useThemeStore";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useTheme() {
  const { isDarkMode } = useThemeStore();
  return isDarkMode ? "dark" : "light";
}