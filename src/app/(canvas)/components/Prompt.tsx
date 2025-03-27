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
	const isUserTyping = useRef(false);
	const lastUserEdit = useRef({ timestamp: 0 });

	// Update localPrompt when room prompt changes (from other users)
	useEffect(() => {
		// Only update if different from current state and not from local changes
		// AND the user is not currently typing
		if (prompt !== localPrompt && !isUserTyping.current) {
			console.log("Received external prompt update, updating textarea");
			isLocalChange.current = false; // Mark this as an external change
			setLocalPrompt(prompt || "");
		}
	}, [prompt, localPrompt]);

	// Debounced function for updating the prompt in Supabase
	const debouncedUpdatePrompt = useRef(
		debounce((text: string) => {
			if (isLocalChange.current) {
				console.log("Sending prompt update to server");
				updatePrompt(text);

				// Set a timeout to mark when typing stops
				setTimeout(() => {
					const now = Date.now();
					if (now - lastUserEdit.current.timestamp >= 1000) {
						isUserTyping.current = false;
					}
				}, 1100);
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
		// Mark that the user is actively typing
		isUserTyping.current = true;
		lastUserEdit.current.timestamp = Date.now();

		// Only update if this is a local change
		if (isLocalChange.current) {
			setLocalPrompt(e.target.value);
		} else {
			// Reset flag after handling external update
			isLocalChange.current = true;
		}
	};

	return (
		<Card className='w-full h-full flex flex-col overflow-hidden'>
			<CardContent className='flex-grow p-3 flex flex-col overflow-hidden'>
				<div className='mb-2 font-medium'>
					Share your thoughts with collaborators:
				</div>
				<Textarea
					placeholder='Enter any notes, questions, or ideas here...'
					className='h-full resize-none'
					value={localPrompt}
					onChange={handlePromptChange}
				/>
			</CardContent>
		</Card>
	);
};

export default Prompt;
