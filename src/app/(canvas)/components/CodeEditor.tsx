"use client";

import MonacoEditor from "@monaco-editor/react";
import { useState, useEffect, useCallback, useRef } from "react";
import ChoiceEditor from "@/app/(canvas)/components/ChoiceEditor";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { Session } from "@supabase/supabase-js";
import { supabase, checkAndRefreshAuth } from "@/lib/supabaseClient";
import { useAuth } from "@/app/context/AuthProvider";

type EditorProps = {
	defaultValue?: string;
	language?: string;
	theme?: string;
	documentId?: string;
	onChange?: (value: string | undefined) => void;
	disableAutocomplete?: boolean;
	onLanguageChange?: (language: string) => void;
};

const CodeEditor = ({
	defaultValue = "// Write your code here",
	language = "typescript",
	theme = "vs-dark",
	documentId,
	onChange,
	disableAutocomplete = false,
	onLanguageChange,
}: EditorProps) => {
	const [code, setCode] = useState(defaultValue);
	const [docId, setDocId] = useState(documentId || uuidv4());
	const [currentLang, setCurrentLang] = useState(language);
	const [isLoading, setIsLoading] = useState(!!documentId);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");

	// Use the auth context instead of managing session directly
	const { session, error: authContextError, refreshAuth } = useAuth();
	const [authError, setAuthError] = useState<string | null>(authContextError);

	// Flag to track if edit is local or remote
	const isLocalChange = useRef(true);

	// Update code when defaultValue changes (for real-time updates)
	useEffect(() => {
		// Only update if the new value is different from current state
		// and it's not a result of a local change
		if (defaultValue !== code) {
			isLocalChange.current = false; // Mark this as an external change
			setCode(defaultValue);
		}
	}, [defaultValue]);

	// Initialize document and handle auth changes
	useEffect(() => {
		if (documentId) {
			fetchDocument();
		} else {
			setIsLoading(false);
		}

		// Update auth error when context error changes
		if (authContextError) {
			setAuthError(authContextError);
		}
	}, [documentId, authContextError]);

	const fetchDocument = async () => {
		if (!docId) return;

		try {
			setIsLoading(true);

			// Refresh auth before fetching
			if (session) {
				await refreshAuth();
			}

			const response = await fetch(`/api/documents?id=${docId}`);

			if (!response.ok) {
				// Handle 401 errors by refreshing token and retrying
				if (response.status === 401) {
					await refreshAuth();
					const retryResponse = await fetch(`/api/documents?id=${docId}`);
					if (!retryResponse.ok) {
						throw new Error(`Failed to fetch after refresh: ${retryResponse.status}`);
					}
					const data = await retryResponse.json();
					setCode(data.content || defaultValue);
					if (data.language) {
						setCurrentLang(data.language);
						if (onLanguageChange) onLanguageChange(data.language);
					}
					setIsLoading(false);
					return;
				}

				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `Failed to fetch document: ${response.status}`
				);
			}

			const data = await response.json();
			setCode(data.content || defaultValue);

			if (data.language) {
				setCurrentLang(data.language);
				if (onLanguageChange) onLanguageChange(data.language);
			}
		} catch (error) {
			console.error("Error fetching document:", error);
			setAuthError(
				error instanceof Error ? error.message : "Failed to fetch document"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const saveDocument = useCallback(
		debounce(async (content: string, lang: string) => {
			if (!session?.access_token) {
				console.error("Not authenticated - no access token available");
				setAuthError("Not authenticated - Please login");
				return;
			}

			try {
				setSaveStatus("saving");

				// Refresh auth before saving
				await refreshAuth();

				const response = await fetch("/api/documents", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						documentId: docId,
						content,
						language: lang,
					}),
				});

				if (!response.ok) {
					// Handle 401 errors by refreshing token and retrying
					if (response.status === 401) {
						const refreshed = await refreshAuth();
						if (refreshed && session) {
							// Retry the save with the new token
							const retryResponse = await fetch("/api/documents", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${session.access_token}`,
								},
								body: JSON.stringify({
									documentId: docId,
									content,
									language: lang,
								}),
							});

							if (retryResponse.ok) {
								setSaveStatus("saved");
								setTimeout(() => setSaveStatus("idle"), 2000);
								return;
							}
							throw new Error(
								`Failed to save after token refresh: ${retryResponse.status}`
							);
						}
					}

					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || `Failed to save: ${response.status}`);
				}

				setSaveStatus("saved");

				// Reset save status after a delay
				setTimeout(() => setSaveStatus("idle"), 2000);
			} catch (error) {
				console.error("Error saving document:", error);
				setSaveStatus("error");
				setAuthError(
					error instanceof Error ? error.message : "Failed to save document"
				);
			}
		}, 1000),
		[session, docId, refreshAuth]
	);

	const handleEditorChange = (value: string | undefined) => {
		const newValue = value || "";

		// Only trigger onChange if this is a local change, not from props
		if (isLocalChange.current) {
			setCode(newValue);
			if (onChange) onChange(newValue);

			// Only save if we have a valid session
			if (session?.access_token) {
				setSaveStatus("idle"); // Reset status before initiating new save
				saveDocument(newValue, currentLang);
			}
		} else {
			// Reset the flag after handling an external update
			isLocalChange.current = true;
		}
	};

	const handleLanguageChange = (newLang: string) => {
		setCurrentLang(newLang);
		if (onLanguageChange) onLanguageChange(newLang);

		// Only save if we have a valid session
		if (session?.access_token) {
			saveDocument(code, newLang);
		}
	};

	if (isLoading) {
		return (
			<div className='h-[600px] w-full border border-gray-300 rounded flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4'></div>
					<p>Loading editor...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='h-[600px] w-full border border-gray-300 rounded flex flex-col'>
			<div className='flex justify-between items-center p-2 bg-gray-100'>
				<ChoiceEditor
					selectedLanguage={currentLang}
					onLanguageChange={handleLanguageChange}
				/>
				<div className='flex items-center gap-3'>
					{saveStatus === "saving" && (
						<span className='text-sm text-yellow-600'>Saving...</span>
					)}
					{saveStatus === "saved" && (
						<span className='text-sm text-green-600'>Saved</span>
					)}
					{saveStatus === "error" && (
						<span className='text-sm text-red-600'>Save failed</span>
					)}
					<div className='text-sm text-gray-500'>Document ID: {docId}</div>
				</div>
			</div>

			{authError ? (
				<div className='bg-red-100 border-l-4 border-red-500 text-red-700 p-4 flex-grow'>
					<p className='font-bold'>Authentication Error</p>
					<p>{authError}</p>
					<p className='mt-2'>
						Please ensure you are logged in and try refreshing the page.
					</p>
				</div>
			) : (
				<MonacoEditor
					height='100%'
					width='100%'
					language={currentLang}
					theme={theme}
					value={code}
					onChange={handleEditorChange}
					options={{
						minimap: { enabled: true },
						scrollBeyondLastLine: false,
						fontSize: 14,
						automaticLayout: true,
						quickSuggestions: false,
						suggestOnTriggerCharacters: false,
						parameterHints: {
							enabled: false, // Disable parameter hints
						},
					}}
				/>
			)}
		</div>
	);
};

export default CodeEditor;
