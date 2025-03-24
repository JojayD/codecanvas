"use client";
import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useRoom } from "@/app/context/RoomContextProivider";
import { debounce } from "lodash";

const Prompt = () => {
	const { prompt, updatePrompt } = useRoom();
	const [localPrompt, setLocalPrompt] = useState(prompt || "");
	const isLocalChange = useRef(true);

	// Update localPrompt when room prompt changes (from other users)
	useEffect(() => {
		// Only update if different from current state and not from local changes
		if (prompt !== localPrompt) {
			console.log("Received external prompt update, updating textarea");
			isLocalChange.current = false; // Mark this as an external change
			setLocalPrompt(prompt);
		}
	}, [prompt]);

	// Debounced function for updating the prompt in Supabase
	const debouncedUpdatePrompt = useRef(
		debounce((text: string) => {
			if (isLocalChange.current) {
				console.log("Sending prompt update to server");
				updatePrompt(text);
			} else {
				// Reset flag after handling external update
				isLocalChange.current = true;
			}
		}, 500)
	).current;

	// Call debounced update when local prompt changes
	useEffect(() => {
		debouncedUpdatePrompt(localPrompt);

		return () => {
			debouncedUpdatePrompt.cancel();
		};
	}, [localPrompt, debouncedUpdatePrompt]);

	const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (isLocalChange.current) {
			setLocalPrompt(e.target.value);
		} else {
			// Reset flag after handling external update
			isLocalChange.current = true;
		}
	};

	return (
		<Card className='flex flex-col h-full border-0 shadow-none'>
			<CardContent className='flex-grow flex flex-col'>
				<Textarea
					placeholder='Type your prompt here...'
					className='resize-none flex-grow border-slate-200 focus-visible:ring-blue-500'
					value={localPrompt}
					onChange={handlePromptChange}
				/>

				<div className='w-full mt-2 text-xs text-slate-400 flex justify-between'>
					<span className='text-slate-500'>
						{localPrompt !== prompt && "Syncing..."}
					</span>
					<span>
						{localPrompt.length > 0 ? `${localPrompt.length} characters` : ""}
					</span>
				</div>
			</CardContent>
		</Card>
	);
};

export default Prompt;
