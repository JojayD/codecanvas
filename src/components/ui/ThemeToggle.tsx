"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import useThemeStore from "@/store/useThemeStore";

export default function ThemeToggle() {
	const { isDarkMode, toggleDarkMode } = useThemeStore();

	const handleToggle = () => {
		// Toggle the theme state first
		toggleDarkMode();

		// Then save the NEW state (after toggle) to localStorage
		// This fixes the issue where the wrong theme was being saved
		localStorage.setItem("theme", !isDarkMode ? "dark" : "light");
	};

	return (
		<Button
			variant='ghost'
			size='icon'
			onClick={handleToggle}
			className='text-white hover:text-gray-200 dark:text-gray-200 dark:hover:text-gray-100 preserve-white light:hover:bg-gray-200'
		>
			{isDarkMode ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
		</Button>
	);
}
