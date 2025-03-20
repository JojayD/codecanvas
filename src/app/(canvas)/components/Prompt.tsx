"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Prompt = () => {
    const [promptText, setPromptText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!promptText.trim()) return;

        setIsLoading(true);
        try {
            console.log("Submitting prompt:", promptText);

            // Mock API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Clear the input after submission
            setPromptText("");
        } catch (error) {
            console.error("Error submitting prompt:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Textarea
            placeholder="Enter your prompt here..."
            className="min-h-[800px] resize-none"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
        />
    );
};

export default Prompt;