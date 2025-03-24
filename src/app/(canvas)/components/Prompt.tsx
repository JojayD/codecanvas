"use client";
import React, { useState, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SparklesIcon } from "lucide-react";

const Prompt = () => {
    const [promptText, setPromptText] = useState("");
    
    // Auto-save effect that runs when promptText changes
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            if (promptText.trim()) {
                console.log("Auto-updating with:", promptText);
            }
        }, 500);

        return () => clearTimeout(debounceTimeout);
    }, [promptText]);

    return (
        <Card className="flex flex-col h-full border-0 shadow-none">
            
            <CardContent className="flex-grow flex flex-col">
                <Textarea
                    placeholder="Type your prompt here..."
                    className="resize-none flex-grow border-slate-200 focus-visible:ring-blue-500"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                />
                
                <div className="w-full mt-2 text-xs text-slate-400 flex justify-end">
                    <span>{promptText.length > 0 ? `${promptText.length} characters` : ''}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default Prompt;