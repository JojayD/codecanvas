"use client"
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";

import { monocoLanguages } from "@/app/_constants/languages";

interface ChoiceEditorProps {
  selectedLanguage: string;
  onLanguageChange?: (language: string) => void;
}

export default function ChoiceEditor({
  selectedLanguage = "typescript",
  onLanguageChange
}: ChoiceEditorProps) {
  const handleLanguageChange = (language: string) => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  }

  return (
    <div className="p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            {selectedLanguage}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-80 overflow-y-auto bg-blue-600">
          {monocoLanguages.map((language) => (
            <DropdownMenuItem
              onClick={() => handleLanguageChange(language)}
              key={language}
            >
              {language}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}