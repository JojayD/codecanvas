"use client";

import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	language?: string;
	theme?: string;
}

export function CodeEditor({
	value,
	onChange,
	language = "javascript",
	theme = "vs-dark",
}: CodeEditorProps) {
	// Keep track of whether an edit was from this user or remote
	const isLocalEdit = useRef(true);

	// Handle editor value changes
	const handleEditorChange = (newValue: string | undefined) => {
		if (!newValue) return;

		// Only trigger onChange if this is a local edit
		if (isLocalEdit.current) {
			onChange(newValue);
		}
	};

	// Set up effect to handle remote changes
	useEffect(() => {
		// If value changed externally (not by local edits)
		// then update editor without triggering an onChange
		isLocalEdit.current = false;
		// The value will update automatically since we're passing it as a prop
		// to the Editor component

		// Reset the flag after the update
		setTimeout(() => {
			isLocalEdit.current = true;
		}, 0);
	}, [value]);

	return (
		<div className='h-full w-full'>
			<Editor
				height='100%'
				width='100%'
				language={language}
				theme={theme}
				value={value}
				onChange={handleEditorChange}
				options={{
					minimap: { enabled: true },
					wordWrap: "on",
					smoothScrolling: true,
					fontSize: 14,
					lineNumbers: "on",
					tabSize: 2,
					automaticLayout: true,
				}}
			/>
		</div>
	);
}
