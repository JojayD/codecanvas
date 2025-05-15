"use client";
import {ReactNode, useEffect} from "react";
import useThemeStore from "@/store/useThemeStore";

export default function ThemeProvider({children}: {children: ReactNode}) {
  const {isDarkMode, toggleDarkMode} = useThemeStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      useThemeStore.getState().toggleDarkMode();
    }
  },[]);

  return (
    <>{children}</>
  );
};