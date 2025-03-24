"use client";

import MonacoEditor from "@monaco-editor/react";
import { useState, useEffect, useCallback } from "react";
import ChoiceEditor from "@/app/(canvas)/components/ChoiceEditor";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

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
	const [session, setSession] = useState<Session | null>(null);
	const [authError, setAuthError] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");

	useEffect(() => {
		const initAuth = async () => {
			try {
				// Use the singleton supabase client imported from your lib/supabaseClient.ts
				const { data, error } = (await supabase.auth.getSession()) as {
					data: { session: Session | null };
					error: Error | null;
				};
				if (error) {
					throw error;
				}

				if (data?.session) {
					console.log("Session loaded successfully:", data.session);
					setSession(data.session);
					setAuthError(null);
					if (documentId) {
						fetchDocument();
					} else {
						setIsLoading(false);
					}
				} else {
					console.error("No active session found");
					setAuthError("Not authenticated - Please login");
					setIsLoading(false);
				}
			} catch (error) {
				console.error("Auth initialization error:", error);
				setAuthError(
					`Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`
				);
				setIsLoading(false);
			}
		};

		initAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, currentSession) => {
			console.log("Auth state change:", event);
			setSession(currentSession);
			if (event === "SIGNED_OUT") {
				setAuthError("Not authenticated - Please login");
			} else if (event === "SIGNED_IN" && currentSession) {
				setAuthError(null);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [documentId]);

	const fetchDocument = async () => {
		if (!docId) return;

		try {
			setIsLoading(true);
			const response = await fetch(`/api/documents?id=${docId}`);

			if (!response.ok) {
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

			console.log("Document loaded successfully");
		} catch (error) {
			console.error("Error fetching document:", error);
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
				console.log("Saving document...");

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
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || `Failed to save: ${response.status}`);
				}

				console.log("Document saved successfully");
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
		[session, docId]
	);

	const handleEditorChange = (value: string | undefined) => {
		const newValue = value || "";
		setCode(newValue);
		if (onChange) onChange(newValue);

		// Only save if we have a valid session
		if (session?.access_token) {
			setSaveStatus("idle"); // Reset status before initiating new save
			saveDocument(newValue, currentLang);
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
						quickSuggestions: !disableAutocomplete,
						suggestOnTriggerCharacters: !disableAutocomplete,
						parameterHints: {
							enabled: !disableAutocomplete,
						},
					}}
				/>
			)}
		</div>
	);
};

export default CodeEditor;
