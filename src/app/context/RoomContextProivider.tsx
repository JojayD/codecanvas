"use client";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import {
	joinRoom as joinRoomSupabase,
	leaveRoom as leaveRoomSupabase,
	getRoom as getRoomSupabase,
	updateRoom,
	subscribeToCodeChanges,
	subscribeToPromptChanges,
	subscribeToLanguageChanges,
	closeRoom as closeRoomSupabase,
} from "@/lib/supabaseRooms";
import { Room, Room as SupabaseRoom } from "@/lib/supabase";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import { useRouter } from "next/navigation";
import axios from "axios";

type Participant = { userId: string; username: string };
interface RoomContextType {
	roomId: string | number;
	participants: Participant[];
	code: string;
	prompt: string;
	language: string;
	room: Room | null;
	updateCode: (code: string) => Promise<void>;
	updatePrompt: (prompt: string) => Promise<void>;
	updateLanguage: (language: string) => Promise<void>;
	joinRoom: () => Promise<void>;
	leaveRoom: (checkForHostExit?: boolean) => Promise<void>;
	loading: boolean;
	error: Error | null;
	currentUser: { userId: string; username: string };
}

const RoomContext = createContext<RoomContextType | null>(null);

export const useRoom = () => {
	const context = useContext(RoomContext);
	if (!context) {
		throw new Error("useRoom must be used within a RoomProvider");
	}
	return context;
};

export const RoomProvider: React.FC<{
	children: React.ReactNode;
	roomId: string | number;
}> = ({ children, roomId }) => {
	const searchParams = useSearchParams();
	// Convert the roomId parameter to a number if it's a string
	const roomIdFromParams =
		typeof roomId === "string"
			? // Parse as integer, or use original value if parsing fails
				isNaN(parseInt(roomId))
				? roomId
				: parseInt(roomId)
			: roomId;

	const router = useRouter();
	const [room, setRoom] = useState<Room | null>(null);
	const [code, setCode] = useState<string>("");
	const [prompt, setPrompt] = useState<string>("");
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [language, setLanguage] = useState<string>("javascript");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [hasJoined, setHasJoined] = useState(false);
	// Mock user for now - in a real app, this would come from auth
	// Use a stable user ID for testing multiple tabs/windows
	const [currentUser] = useState(() => {
		// Create a persistent user ID or use an existing one
		let userId = localStorage.getItem("userId");
		let username = localStorage.getItem("username");

		if (!userId) {
			userId = `user-${Math.random().toString(36).substring(2, 7)}`;
			localStorage.setItem("userId", userId);
		}

		// If no username is set, use a default one
		if (!username) {
			username = `User-${Math.random().toString(36).substring(2, 5)}`;
			localStorage.setItem("username", username);
		}

		// Log current user info for debugging host detection
		console.log("[DEBUG USER] Current user info from localStorage:", {
			userId,
			username,
			authID: localStorage.getItem("supabase.auth.token"), // Try to get Supabase auth ID if available
		});

		return { userId, username };
	});

	// Add a ref to track the last local update timestamp and change ID
	const lastLocalUpdate = useRef({
		timestamp: 0,
		code: "",
		prompt: "",
		changeId: "",
	});

	// Add a ref to track if the user is currently typing
	const isUserTyping = useRef(false);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Add a ref to track join progress
	const joinInProgressRef = useRef(false);

	// Function to set typing status with automatic timeout
	const setTypingStatus = (isTyping: boolean) => {
		isUserTyping.current = isTyping;

		// Clear any existing timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}

		// Set a new timeout to clear typing status after 1.5 seconds of inactivity
		if (isTyping) {
			typingTimeoutRef.current = setTimeout(() => {
				isUserTyping.current = false;
			}, 1500);
		}
	};

	// Add state to track intentional leaves
	const [intentionalLeave, setIntentionalLeave] = useState(false);

	// Function to parse and normalize participants array
	const parseParticipants = (participantsList: any[]): Participant[] => {
		// Ensure we have an array to work with
		const participants = Array.isArray(participantsList) ? participantsList : [];

		// Parse participants from array of strings to array of objects
		// Also deduplicate participants by userId
		const seenUserIds = new Set<string>();
		const parsedParticipants: Participant[] = [];

		participants.forEach((p) => {
			const parts = typeof p === "string" ? p.split(":") : [p, "Unknown"];
			const userId = parts[0] || "";

			// Skip if we've already seen this userId (deduplicate)
			if (userId && !seenUserIds.has(userId)) {
				seenUserIds.add(userId);
				parsedParticipants.push({
					userId,
					username: parts[1] || "Unknown",
				});
			}
		});

		return parsedParticipants;
	};

	// Fetch room data on initial load
	useEffect(() => {
		async function fetchRoom() {
			if (!roomIdFromParams) return;

			try {
				setLoading(true);
				const roomData = await getRoomSupabase(roomIdFromParams);

				if (roomData) {
					console.log("Room data received:", roomData);
					console.log("Room status check - roomStatus:", roomData.roomStatus);

					// Check if the room is already closed
					if (roomData.roomStatus === false) {
						console.log("Room is already closed, will show alert");
						// Show alert after a short delay
						setTimeout(() => {
							alert(
								"This room has been closed by the host. You'll be redirected to the dashboard."
							);
						}, 1000);
						setError(new Error("Room is closed"));
						return;
					}

					setRoom(roomData);
					setCode(roomData.code || "// Start coding here...");
					setPrompt(roomData.prompt || "");

					// Use the parseParticipants helper to normalize and deduplicate participants
					const parsedParticipants = parseParticipants(roomData.participants || []);

					setParticipants(parsedParticipants);

					// Check if the current user is already in the room
					const isUserInRoom = parsedParticipants.some(
						(p) => p.userId === currentUser.userId
					);

					setHasJoined(isUserInRoom);
				} else {
					console.error("Room not found:", roomIdFromParams);
					setError(new Error("Room not found"));
				}
			} catch (error) {
				console.error("Error fetching room:", error);
				setError(
					error instanceof Error ? error : new Error("Failed to fetch room")
				);
			} finally {
				setLoading(false);
			}
		}

		fetchRoom();
	}, [roomIdFromParams, currentUser.userId]);

	// Set up real-time subscription for room changes
	useEffect(() => {
		if (!roomIdFromParams) return;

		console.log("Setting up real-time subscriptions for room:", roomIdFromParams);

		// Create refs to hold the subscription objects
		let roomSubscription: { unsubscribe: () => void } | null = null;
		let codeSubscription: { unsubscribe: () => void } | null = null;
		let promptSubscription: { unsubscribe: () => void } | null = null;

		// Set up the room subscription
		subscribeToRoom(roomIdFromParams, (updatedRoom) => {
			console.log("[ROOM-UPDATE] Raw Payload Received:", {
				roomId: updatedRoom.roomId,
				participants: updatedRoom.participants, // Log raw participants
				roomStatus: updatedRoom.roomStatus,
				timestamp: new Date().toISOString(),
			});

			// Store previous participants for comparison (optional, but good for debugging)
			const previousParticipants = [...participants]; // Shallow copy

			// Important: Update the room state with the latest data first
			setRoom(updatedRoom);

			// Use the parseParticipants helper to normalize and deduplicate participants
			const parsedParticipants = parseParticipants(updatedRoom.participants || []);
			console.log("[ROOM-UPDATE] Parsed Participants:", parsedParticipants);

			// Check if the participants list actually changed
			const participantsChanged =
				JSON.stringify(previousParticipants) !== JSON.stringify(parsedParticipants);

			if (participantsChanged) {
				console.log("[ROOM-UPDATE] Participants changed. Updating state:", {
					from: previousParticipants,
					to: parsedParticipants,
				});
				setParticipants(parsedParticipants);

				// Update hasJoined status based on the new participant list
				const isUserStillInRoom = parsedParticipants.some(
					(p) => p.userId === currentUser.userId
				);
				if (hasJoined !== isUserStillInRoom) {
					console.log(
						`[ROOM-UPDATE] Updating hasJoined status from ${hasJoined} to ${isUserStillInRoom}`
					);
					setHasJoined(isUserStillInRoom);
				}
			} else {
				console.log("[ROOM-UPDATE] Participants unchanged. Skipping state update.");
			}

			// Handle room closure detected via real-time update
			if (updatedRoom.roomStatus === false) {
				console.log("Room was closed by host - roomStatus is false");
				// Set hasJoined to false since everyone has been kicked out
				setHasJoined(false);
				// Show an alert or notification that the room was closed by host
				if (typeof window !== "undefined") {
					// Only show alert in browser environment
					alert("The host has left the room. The room is now closed.");

					// If the user is not on the dashboard already, redirect them
					if (window.location.pathname.includes("/canvas")) {
						console.log("Redirecting to dashboard due to room closure");
						window.location.href = "/dashboard";
					}
				}
				return;
			}

			// Check if current user was removed from the room (kicked or left in another tab)
			const isCurrentUserInRoom = parsedParticipants.some(
				(p) => p.userId === currentUser.userId
			);

			if (hasJoined && !isCurrentUserInRoom) {
				console.log("Current user no longer in room - updating hasJoined status");
				setHasJoined(false);
			}
		})
			.then((subscription) => {
				roomSubscription = subscription;
			})
			.catch((error) => {
				console.error("Failed to setup room subscription:", error);
			});

		// Set up the code subscription
		subscribeToCodeChanges(roomIdFromParams, (updatedCode) => {
			console.log("Code update received from Supabase:", {
				length: updatedCode?.length || 0,
				firstChars: updatedCode?.substring(0, 20),
				lastUpdate: new Date().toISOString(),
			});

			// Skip updates if the user is actively typing
			if (isUserTyping.current) {
				console.log("User is actively typing - ignoring remote update");
				return;
			}

			// Only update if this is not our own recent change and the code is different
			const now = Date.now();
			const timeSinceLocalUpdate = now - lastLocalUpdate.current.timestamp;

			// Improve the detection of our own changes with exact content matching
			const isOurRecentChange =
				(timeSinceLocalUpdate < 5000 &&
					updatedCode === lastLocalUpdate.current.code) || // Same code we just sent
				(lastLocalUpdate.current.changeId &&
					updatedCode === lastLocalUpdate.current.code); // Match by changeId

			if (isOurRecentChange) {
				console.log("Ignoring update as it's our own recent change");
				return;
			}

			// Force a complete state update for the code
			if (typeof updatedCode === "string" && updatedCode !== code) {
				console.log("Updating code state with new value from remote");
				setCode(updatedCode);
			}
		})
			.then((subscription) => {
				codeSubscription = subscription;
			})
			.catch((error) => {
				console.error("Failed to setup code subscription:", error);
			});

		// Set up the prompt subscription
		subscribeToPromptChanges(roomIdFromParams, (updatedPrompt) => {
			console.log("Prompt update received from Supabase:", {
				length: updatedPrompt?.length || 0,
				firstChars: updatedPrompt?.substring(0, 20),
				lastUpdate: new Date().toISOString(),
			});

			// Only update if this is not our own recent change and the prompt is different
			const now = Date.now();
			const timeSinceLocalUpdate = now - lastLocalUpdate.current.timestamp;
			const isOurRecentChange =
				timeSinceLocalUpdate < 5000 && // Within last 5 seconds
				updatedPrompt === lastLocalUpdate.current.prompt; // Same prompt we just sent

			if (isOurRecentChange) {
				console.log("Ignoring prompt update as it's our own recent change");
				return;
			}

			// Force a complete state update for the prompt, even if content looks the same
			// This ensures deletions are properly synchronized
			if (typeof updatedPrompt === "string") {
				console.log("Updating prompt state with new value from remote");
				setPrompt(updatedPrompt);
			}
		})
			.then((subscription) => {
				promptSubscription = subscription;
			})
			.catch((error) => {
				console.error("Failed to setup prompt subscription:", error);
			});

		// Set up language subscription
		let languageSubscription: { unsubscribe: () => void } | null = null;
		subscribeToLanguageChanges(roomIdFromParams, (updatedLanguage) => {
			console.log("Language update received from Supabase:", updatedLanguage);

			// Only update if this is not our own recent change
			const now = Date.now();
			const timeSinceLocalUpdate = now - lastLocalUpdate.current.timestamp;
			const isOurRecentChange = timeSinceLocalUpdate < 5000;

			if (isOurRecentChange) {
				console.log(
					"Ignoring language update as it's likely our own recent change"
				);
				return;
			}

			// Force a complete state update for the language
			console.log(
				"Updating language state with new value from remote:",
				updatedLanguage
			);
			setLanguage(updatedLanguage);
		})
			.then((subscription) => {
				languageSubscription = subscription;
				console.log("Language subscription established successfully");
			})
			.catch((error) => {
				console.error("Failed to setup language subscription:", error);
			});

		// Set up polling as a fallback for real-time updates
		// This will refresh room data every 5 seconds in case real-time updates fail
		// const pollingInterval = setInterval(async () => {
		// 	try {
		// 		console.log("Polling for room updates...");
		// 		const roomData = await getRoom(roomIdFromParams);

		// 		if (roomData) {
		// 			// Only update if we got valid data
		// 			console.log("Room data refreshed through polling");
		// 			setRoom(roomData);

		// 			// Ensure participants is an array
		// 			const participantsList = Array.isArray(roomData.participants)
		// 				? roomData.participants
		// 				: [];

		// 			// Parse participants
		// 			const parsedParticipants = participantsList.map((p) => {
		// 				const parts = p.split(":");
		// 				return {
		// 					userId: parts[0] || "",
		// 					username: parts[1] || "Unknown",
		// 				};
		// 			});

		// 			setParticipants(parsedParticipants);
		// 			setCode(roomData.code || "");
		// 			setPrompt(roomData.prompt || "");
		// 		}
		// 	} catch (error) {
		// 		console.error("Error polling for room updates:", error);
		// 	}
		// }, 5000); // Poll every 5 seconds

		return () => {
			// Clean up subscriptions and polling
			console.log("Cleaning up subscriptions and polling");
			if (roomSubscription) roomSubscription.unsubscribe();
			if (codeSubscription) codeSubscription.unsubscribe();
			if (promptSubscription) promptSubscription.unsubscribe();
			if (languageSubscription) languageSubscription.unsubscribe();

			// Clean up any existing typing timeout
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [roomIdFromParams]); // Remove 'code' from dependency array to prevent recreating subscriptions

	// Join room function - memoized with useCallback
	const joinRoom = useCallback(async () => {
		if (hasJoined) {
			console.log("Already joined this room, skipping");
			return;
		}

		// Check if user is already in participants list
		const isUserAlreadyInRoom = participants.some(
			(p) => p.userId === currentUser.userId
		);
		if (isUserAlreadyInRoom) {
			console.log("User already in participants list, updating hasJoined state");
			setHasJoined(true);
			return;
		}

		if (participants.length > 2) {
			console.log("Room already has 2 participants, cannot join");
			alert(
				"This room is already full (maximum 2 participants). You will be redirected to the dashboard."
			);
			// Use Next.js navigation approach since we're in a Next.js app
			window.location.href = "/dashboard";
			return;
		}

		try {
			// Set join in progress flag
			if (joinInProgressRef.current) {
				console.log("Join already in progress, skipping duplicate request");
				return;
			}

			joinInProgressRef.current = true;
			console.log("Joining room as:", currentUser);
			console.log("[JOIN] Room state before joining:", {
				roomId: roomIdFromParams,
				participants: room?.participants || [],
				currentUserId: currentUser.userId,
				isCreator: room?.created_by === currentUser.userId,
				timestamp: new Date().toISOString(),
			});

			const result = await joinRoomSupabase(
				roomIdFromParams,
				currentUser.userId,
				currentUser.username
			);

			if (result) {
				console.log("[JOIN] Successfully joined room. Updated room state:", {
					participants: result.participants || [],
					participantCount: Array.isArray(result.participants)
						? result.participants.length
						: 0,
					roomStatus: result.roomStatus,
				});
				setHasJoined(true);
			} else {
				console.error("Failed to join room, no result returned");
			}
		} catch (error) {
			console.error("[JOIN] Error joining room:", error);
			setError(error instanceof Error ? error : new Error("Failed to join room"));
		} finally {
			joinInProgressRef.current = false;
		}
	}, [roomIdFromParams, currentUser, hasJoined, room, participants]);

	// Function to clean up local storage when leaving room
	const cleanupLocalStorage = () => {
		localStorage.removeItem("userId");
		localStorage.removeItem("username");
	};

	// Leave room function - memoized with useCallback
	const leaveRoom = useCallback(
		async (checkForHostExit: boolean = true, refresh: boolean = true) => {
			try {
				if (!room) {
					return;
				}

				// Extract the correct roomId (use roomId field, not id)
				const roomIdToUse = room.roomId || room.id;
				console.log(`[LEAVE] Preparing to leave room ${roomIdToUse}`);

				if (checkForHostExit) {
					try {
						// Enhanced host detection when checkForHostExit is true

						// Get user ID (with and without username)
						const userId = currentUser.userId;
						const userName = currentUser.username;

						// Try to get the created_by from room if available
						const created_by = room.created_by || "";

						// Call debug endpoint to check if user is host or last participant
						console.log(
							`[LEAVE] Calling debug-host-detection for roomId: ${roomIdToUse}, userId: ${userId}`
						);
						const response = await fetch(
							`/api/debug-host-detection?roomId=${roomIdToUse}&userId=${userId}${created_by ? `&created_by=${created_by}` : ""}`
						);

						if (!response.ok) {
							console.error(
								`[LEAVE] Host detection API error: ${response.status} ${response.statusText}`
							);
							// IMPORTANT FIX: Don't try to force close if we can't confirm host status
							console.log(
								"[LEAVE] Could not confirm host status, proceeding with normal leave"
							);
							// Skip rest of host check and proceed with normal leave
							throw new Error(`Failed to check host status: ${response.statusText}`);
						}

						const data = await response.json();
						console.log("[LEAVE] Host detection results:", data);

						// BUG FIX: Only close the room if the user is the host, not if they're just the last participant
						if (data.isHost) {
							// Removed the "|| data.isLastParticipant" condition
							console.log("[LEAVE] User is host, closing room...");

							// Use force-close-room API to close room
							const closeResponse = await fetch("/api/force-close-room", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									// Add authorization headers if needed
								},
								body: JSON.stringify({
									roomId: roomIdToUse,
									userId,
									matchType: data.matchType, // Include the matchType from host detection
								}),
							});

							if (!closeResponse.ok) {
								console.error(
									`[LEAVE] Force close API error: ${closeResponse.status} ${closeResponse.statusText}`
								);
								// IMPORTANT FIX: Handle the 403 error specifically and fall back to normal leave
								if (closeResponse.status === 403) {
									console.log(
										"[LEAVE] 403 error from force-close, proceeding with normal leave"
									);
									// Fallback to normal leave procedure without throwing an error
								} else {
									throw new Error(
										`Failed to force close room: ${closeResponse.statusText}`
									);
								}
							} else {
								const closeData = await closeResponse.json();
								console.log("[LEAVE] Force close result:", closeData);

								if (closeData.success) {
									// Delay navigation to ensure other clients get the update
									setTimeout(() => {
										setRoom(null);
										if (refresh) router.refresh();
										router.push("/dashboard");

										// Clear local storage data
										cleanupLocalStorage();
									}, 500);
									return; // Exit early if room closed
								}
							}
						} else if (data.isLastParticipant) {
							console.log(
								"[LEAVE] User is last participant but not host, proceeding with normal leave"
							);
						} else {
							console.log(
								"[LEAVE] User is not host and not last participant, proceeding with normal leave"
							);
						}
					} catch (error) {
						console.error("[LEAVE] Error in host exit check:", error);
						// Continue with normal leave procedure if host check fails
					}
				}

				// Standard leave procedure if not host or host check fails
				console.log("[LEAVE] Executing standard leave procedure for non-host");

				// CRITICAL FIX: Use the leave-room API endpoint and wait for response
				// before navigating away
				try {
					// Mark that this is an intentional leave to prevent auto-join
					setIntentionalLeave(true);

					// Call the leave-room API endpoint with the correct path format
					console.log(
						`[LEAVE] POST to /api/leave-room/${roomIdToUse} with userId: ${currentUser.userId}`
					);

					const response = await fetch(`/api/leave-room/${roomIdToUse}`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							userId: currentUser.userId,
							checkForHostExit: false, // Explicitly indicate non-host leave
						}),
					});

					if (!response.ok) {
						throw new Error(
							`Leave room API error: ${response.status} ${response.statusText}`
						);
					}

					const data = await response.json();
					console.log("[LEAVE] Leave room API response:", data);

					// IMPORTANT: Add a delay to allow real-time updates to propagate
					// This is crucial for the host to receive the update before this user leaves
					console.log(
						"[LEAVE] Waiting 1000ms to allow real-time updates to propagate..."
					);
					await new Promise((resolve) => setTimeout(resolve, 1000));

					// Now navigate away
					setRoom(null);
					if (refresh) router.refresh();
					router.push("/dashboard");

					// Clear local storage data
					cleanupLocalStorage();
				} catch (error) {
					console.error("[LEAVE] Error during leave room procedure:", error);
					// Even on error, try to navigate away
					setRoom(null);
					if (refresh) router.refresh();
					router.push("/dashboard");
				}
			} catch (error) {
				console.error("[LEAVE] Error in leaveRoom function:", error);
			}
		},
		[room, currentUser, router]
	);

	// Update language function - memoized with useCallback
	const updateLanguageInDatabase = useCallback(
		async (newLanguage: string) => {
			try {
				// Set typing status to true when user makes changes
				setTypingStatus(true);

				// Generate a unique change ID
				const changeId = Date.now().toString();

				// Record that we just made a local update BEFORE setting state
				lastLocalUpdate.current = {
					...lastLocalUpdate.current,
					timestamp: Date.now(),
					changeId,
				};

				// Set the local state immediately for a responsive UI
				setLanguage(newLanguage);

				console.log("Sending language update to Supabase:", {
					language: newLanguage,
					changeId,
				});

				// Update the language in Supabase
				const result = await updateRoom(roomIdFromParams, {
					language: newLanguage,
				});
				if (!result) {
					console.error("Failed to update language in Supabase");
				}
			} catch (error) {
				console.error("Error updating language:", error);
				setError(
					error instanceof Error ? error : new Error("Failed to update language")
				);
			}
		},
		[roomIdFromParams]
	);

	// Update code function - memoized with useCallback
	const updateCode = useCallback(
		async (newCode: string) => {
			try {
				// Set typing status to true when user makes changes
				setTypingStatus(true);

				// Generate a unique change ID
				const changeId = Date.now().toString();

				// Record that we just made a local update BEFORE setting state
				lastLocalUpdate.current = {
					...lastLocalUpdate.current,
					timestamp: Date.now(),
					code: newCode,
					changeId,
				};

				// Set the local state immediately for a responsive UI
				setCode(newCode);

				console.log("Sending code update to Supabase:", {
					length: newCode.length,
					firstChars: newCode.substring(0, 20),
					changeId,
				});

				// Update the code in Supabase
				const result = await updateRoom(roomIdFromParams, { code: newCode });
				if (!result) {
					console.error("Failed to update code in Supabase");
				}
			} catch (error) {
				console.error("Error updating code:", error);
				setError(
					error instanceof Error ? error : new Error("Failed to update code")
				);
			}
		},
		[roomIdFromParams]
	);

	// Update prompt function - memoized with useCallback
	const updatePrompt = useCallback(
		async (newPrompt: string) => {
			try {
				// Set typing status to true when user makes changes
				setTypingStatus(true);

				// Generate a unique change ID
				const changeId = Date.now().toString();

				// Record that we just made a local update BEFORE setting state (fix order)
				lastLocalUpdate.current = {
					...lastLocalUpdate.current,
					timestamp: Date.now(),
					prompt: newPrompt,
					changeId,
				};

				// Set the local state immediately for a responsive UI
				setPrompt(newPrompt);

				console.log("Sending prompt update to Supabase:", {
					length: newPrompt.length,
					firstChars: newPrompt.substring(0, 20),
					changeId,
				});

				// Update the prompt in Supabase
				const result = await updateRoom(roomIdFromParams, { prompt: newPrompt });
				if (!result) {
					console.error("Failed to update prompt in Supabase");
				}
			} catch (error) {
				console.error("Error updating prompt:", error);
				setError(
					error instanceof Error ? error : new Error("Failed to update prompt")
				);
			}
		},
		[roomIdFromParams]
	);

	// Auto-join the room when the component mounts and room data is loaded
	useEffect(() => {
		if (
			!loading &&
			room &&
			!hasJoined &&
			!intentionalLeave &&
			!joinInProgressRef.current
		) {
			console.log("Auto-joining room after initial load");
			joinRoom().catch((err) => {
				console.error("Error during auto-join:", err);
				joinInProgressRef.current = false;
			});
		}
	}, [loading, room, hasJoined, joinRoom, intentionalLeave]);

	// Clean up when component unmounts
	useEffect(() => {
		return () => {
			// Skip automatic leaving during development to prevent issues during hot reloading and testing
			const isDevelopment = process.env.NODE_ENV === "development";

			if (hasJoined && !isDevelopment) {
				console.log("Component unmounting, leaving room");
				leaveRoom(true, false)
					.then(() => console.log("Left room on unmount"))
					.catch((err) => console.error("Error leaving room on unmount:", err));
			} else if (isDevelopment && hasJoined) {
				console.log("Skipping leave room on unmount in development mode");
			}
		};
	}, [roomIdFromParams, currentUser.userId, hasJoined, leaveRoom]);

	return (
		<RoomContext.Provider
			value={{
				roomId: roomIdFromParams,
				participants,
				code,
				prompt,
				language,
				room,
				updateCode,
				updatePrompt,
				updateLanguage: updateLanguageInDatabase,
				joinRoom,
				leaveRoom,
				loading,
				error,
				currentUser,
			}}
		>
			{children}
		</RoomContext.Provider>
	);
};

// Define the subscribeToRoom function locally since it doesn't exist
async function subscribeToRoom(
	roomId: string | number,
	callback: (room: Room) => void
) {
	console.log(
		`[SUBSCRIPTION] Setting up room subscription for roomId: ${roomId}`
	);

	// Get room info to determine the internal DB ID
	const room = await getRoomSupabase(roomId);
	if (!room) {
		console.error(
			`[SUBSCRIPTION] Cannot subscribe - room not found with roomId: ${roomId}`
		);
		throw new Error(`Room not found: ${roomId}`);
	}

	// Use the room ID for the subscription
	const dbId = room.id;
	console.log(
		`[SUBSCRIPTION] Found room with database ID: ${dbId}, setting up real-time channel`
	);

	// Set up the real-time subscription
	const subscription = supabase
		.channel(`room:${dbId}`)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "rooms",
				filter: `id=eq.${dbId}`,
			},
			(payload) => {
				console.log(
					`[SUBSCRIPTION] Room update event received for room ${roomId}:`,
					{
						eventType: payload.eventType,
						timestamp: new Date().toISOString(),
						participants: (payload.new as Room).participants,
						oldParticipants: (payload.old as any)?.participants, // May not be available in all events
					}
				);

				const updatedRoom = payload.new as Room;
				callback(updatedRoom);
			}
		)
		.subscribe((status) => {
			console.log(
				`[SUBSCRIPTION] Subscription status for room ${roomId}: ${status}`
			);
		});

	console.log(
		`[SUBSCRIPTION] Subscription established for room ${roomId} (DB ID: ${dbId})`
	);

	return {
		unsubscribe: () => {
			console.log(`[SUBSCRIPTION] Unsubscribing from room ${roomId}`);
			subscription.unsubscribe();
		},
	};
}
