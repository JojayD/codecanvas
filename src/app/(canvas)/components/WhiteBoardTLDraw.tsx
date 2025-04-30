"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { Tldraw, Editor, track, useEditor } from "@tldraw/tldraw";
import "tldraw/tldraw.css";
import { useRoom } from "@/app/context/RoomContextProivider";
import {
	getWhiteboard,
	updateWhiteboard,
	subscribeToWhiteboardChanges,
} from "@/lib/supabaseWhiteboard";
import { Eraser, Pencil } from "lucide-react";

import { useAuth } from "@/app/context/AuthProvider";
import { debounce } from "lodash";

// Type for our TLDraw document content
interface TLDrawContent {
	document: any;
	version: number;
	lastUpdated: string;
}

// Initialize empty TLDraw content
const createEmptyTLDrawContent = (): TLDrawContent => ({
	document: {},
	version: 1,
	lastUpdated: new Date().toISOString(),
});

const WhiteBoardTLDraw = () => {
	// Use the room context directly since we're now only using this in the canvas page
	const { roomId } = useRoom();
	const { refreshAuth } = useAuth();

	const [whiteboardId, setWhiteboardId] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Use a ref instead of state to avoid re-renders
	const isLocalChangeRef = useRef(true);

	// Keep a reference to the editor
	const editorRef = useRef<Editor | null>(null);

	// Load and subscribe to whiteboard
	useEffect(() => {
		let subscription: any = null;
		const roomIdString = roomId?.toString() || "";

		const loadWhiteboard = async () => {
			try {
				setLoading(true);

				// Refresh auth before loading whiteboard
				await refreshAuth();

				const whiteboard = await getWhiteboard(roomIdString);

				if (whiteboard) {
					setWhiteboardId(whiteboard.id);

					// Subscribe to changes
					subscription = subscribeToWhiteboardChanges(
						whiteboard.id,
						(updatedWhiteboard) => {
							console.log("Received whiteboard update from server");

							// Parse the updated content
							let updatedContent: any;
							try {
								if (typeof updatedWhiteboard.content === "string") {
									updatedContent = JSON.parse(updatedWhiteboard.content);
								} else {
									updatedContent = updatedWhiteboard.content;
								}
							} catch (err) {
								console.error("Failed to parse remote content:", err);
								return;
							}

							// Skip if there's no document content
							if (!updatedContent?.document) {
								console.log("No valid document in remote update");
								return;
							}

							// Compare versions to prevent loops
							const currentVersion =
								localStorage.getItem(`version-${whiteboardId}`) || "0";
							const remoteVersion = updatedContent.version?.toString() || "0";

							console.log(
								`Version check: local=${currentVersion}, remote=${remoteVersion}`
							);

							// Only skip if this is exactly the same version (our own update bouncing back)
							// Don't block older versions as they might contain valid changes
							if (currentVersion === remoteVersion) {
								console.log(
									"Skipping remote update - same version (likely our own update)"
								);
								return;
							}

							// Store the new version
							localStorage.setItem(`version-${whiteboardId}`, remoteVersion);

							// If editor is available, update the document
							if (editorRef.current) {
								try {
									// Set flag to prevent triggering another save
									isLocalChangeRef.current = false;

									console.log("Applying remote changes to document");

									// Force update regardless of version to ensure changes are applied
									editorRef.current.loadSnapshot(updatedContent.document);

									// Update the stored version with the remote version
									localStorage.setItem(`version-${whiteboardId}`, remoteVersion);

									// Also update the last-saved content to prevent immediate save loop
									localStorage.setItem(
										`last-saved-${whiteboardId}`,
										JSON.stringify(updatedContent.document)
									);

									console.log("Updated whiteboard with remote content");

									// Reset flag after a short delay to ensure state is updated
									setTimeout(() => {
										isLocalChangeRef.current = true;
									}, 500);
								} catch (err) {
									console.error("Error applying remote changes:", err);
									// Reset flag if there was an error
									isLocalChangeRef.current = true;
								}
							}
						}
					);
				} else {
					console.error("Failed to load or create whiteboard");
					setError(new Error("Failed to load or create whiteboard"));
				}
			} catch (error) {
				console.error("Error in whiteboard setup:", error);
				setError(error instanceof Error ? error : new Error("Unknown error"));
			} finally {
				setLoading(false);
			}
		};

		loadWhiteboard();

		// Cleanup subscription
		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [roomId, refreshAuth]); // Removed isLocalChange from dependencies

	// Save content with debounce
	const saveContent = useCallback(
		debounce(async (editor: Editor) => {
			if (!whiteboardId) {
				return;
			}

			try {
				console.log("Saving local changes to whiteboard");

				// Get current document state
				const snapshot = editor.store.getSnapshot();

				// Store last saved snapshot to compare
				const lastSavedContent = localStorage.getItem(`last-saved-${whiteboardId}`);
				const currentContent = JSON.stringify(snapshot);

				// Skip save if no changes AND this isn't the first save
				if (lastSavedContent === currentContent && lastSavedContent !== null) {
					console.log("No changes detected, skipping save");
					return;
				}

				// Generate new version number
				const newVersion = Date.now();

				// Update last saved content
				localStorage.setItem(`last-saved-${whiteboardId}`, currentContent);
				localStorage.setItem(`version-${whiteboardId}`, newVersion.toString());

				const content: TLDrawContent = {
					document: snapshot,
					version: newVersion,
					lastUpdated: new Date().toISOString(),
				};

				await refreshAuth();
				await updateWhiteboard(whiteboardId, content as any);
				console.log(`Saved whiteboard content with version ${newVersion}`);
			} catch (error) {
				console.error("Error saving whiteboard content:", error);
			}
		}, 1000), // Reduced debounce time to 1 second for more responsive saving
		[whiteboardId, refreshAuth]
	);

	// Handle changes in the editor
	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor;
			editor.setCameraOptions({ isLocked: true });

			// Subscribe to changes in the document
			editor.store.listen((event) => {
				// Skip internal events that don't represent user changes
				if (
					event.source === "user" ||
					event.source.startsWith("tlschema") ||
					event.source.includes("created") ||
					event.source.includes("updated") ||
					event.source.includes("deleted")
				) {
					// Don't save if we're processing a remote change
					if (!isLocalChangeRef.current) {
						console.log("Skipping save during remote update");
						return;
					}

					saveContent(editor);
				}
			});

			// Load initial document if available
			const loadInitialContent = async () => {
				if (!whiteboardId) return;

				try {
					console.log("Loading initial whiteboard content");
					const whiteboard = await getWhiteboard(roomId?.toString() || "");
					if (whiteboard && whiteboard.content) {
						// Parse the content
						let parsedContent;

						if (typeof whiteboard.content === "string") {
							try {
								parsedContent = JSON.parse(whiteboard.content);
							} catch {
								parsedContent = createEmptyTLDrawContent();
							}
						} else {
							parsedContent = whiteboard.content;
						}

						// Only load if we have a document
						if (parsedContent?.document) {
							console.log("Loading initial document snapshot");

							// Set flag to prevent save on initial load
							isLocalChangeRef.current = false;

							// Load the document
							editor.loadSnapshot(parsedContent.document);

							// Store the initial version and content
							if (parsedContent.version) {
								localStorage.setItem(
									`version-${whiteboardId}`,
									parsedContent.version.toString()
								);
								localStorage.setItem(
									`last-saved-${whiteboardId}`,
									JSON.stringify(parsedContent.document)
								);
							}

							// Reset flag after a short delay
							setTimeout(() => {
								isLocalChangeRef.current = true;
							}, 500);

							console.log("Initial document loaded successfully");
						} else {
							console.log("No document data in initial content");
						}
					} else {
						console.log("No whiteboard content to load");
					}
				} catch (error) {
					console.error("Error loading initial content:", error);
				}
			};

			loadInitialContent();
		},
		[roomId, whiteboardId, saveContent]
	);

	if (loading) {
		return (
			<div className='h-full w-full flex items-center justify-center bg-gray-100'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
				<span className='ml-3'>Loading whiteboard...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className='h-full w-full flex items-center justify-center bg-gray-100 text-red-500'>
				<div>Error: {error.message}</div>
			</div>
		);
	}

	// Generate a unique persistence key using room ID
	const persistenceKey = `codecanvas-room-${roomId}`;

	return (
		<div className='h-full w-full bg-white'>
			<div
				style={{
					position: "relative",
					width: "100%",
					height: "100%",
					minHeight: "400px", // Prevent squishing below a minimum height
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Tldraw
					onMount={handleMount}
					persistenceKey={persistenceKey}
					hideUi
				>
					<CustomToolbar />
				</Tldraw>
			</div>
		</div>
	);
};

// Create a custom toolbar component
const CustomToolbar = track(() => {
	const editor = useEditor();

	// Register keyboard shortcuts
	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Delete":
				case "Backspace": {
					editor.deleteShapes(editor.getSelectedShapeIds());
					break;
				}
				case "v": {
					editor.setCurrentTool("select");
					break;
				}
				case "e": {
					editor.setCurrentTool("eraser");
					break;
				}
				case "p":
				case "d": {
					editor.setCurrentTool("draw");
					break;
				}
			}
		};

		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [editor]);

	return (
		<div className='custom-toolbar flex items-center justify-center gap-2 p-2 bg-white rounded-md shadow-sm'>
			<button
				className={`p-2 rounded-md ${editor.getCurrentToolId() === "select" ? "bg-blue-100" : "hover:bg-gray-100"}`}
				onClick={() => editor.setCurrentTool("select")}
				title='Select'
			>
				<svg
					width='24'
					height='24'
					viewBox='0 0 24 24'
					fill='none'
					xmlns='http://www.w3.org/2000/svg'
				>
					<path
						d='M7 22L12 17L17 22M19 9C19 10.1046 18.1046 11 17 11C15.8954 11 15 10.1046 15 9C15 7.89543 15.8954 7 17 7C18.1046 7 19 7.89543 19 9ZM15 3L12 6L9 3M8.12132 15.8787C6.94975 14.7071 6.94975 12.7929 8.12132 11.6213C9.29289 10.4497 11.2071 10.4497 12.3787 11.6213C13.5503 12.7929 13.5503 14.7071 12.3787 15.8787C11.2071 17.0503 9.29289 17.0503 8.12132 15.8787Z'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
					/>
				</svg>
			</button>
			<button
				className={`p-2 rounded-md ${editor.getCurrentToolId() === "draw" ? "bg-blue-100" : "hover:bg-gray-100"}`}
				onClick={() => editor.setCurrentTool("draw")}
				title='Pencil'
			>
				<Pencil className='w-5 h-5' />
			</button>
			<button
				className={`p-2 rounded-md ${editor.getCurrentToolId() === "eraser" ? "bg-blue-100" : "hover:bg-gray-100"}`}
				onClick={() => editor.setCurrentTool("eraser")}
				title='Eraser'
			>
				<Eraser className='w-5 h-5' />
			</button>
		</div>
	);
});

export default WhiteBoardTLDraw;
