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
import { supabase } from "@/lib/supabase";
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
	leaveRoom: (refresh?: boolean) => Promise<void>;
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
	const roomJoinedRef = useRef(false);
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
						alert(
							"This room has been closed by the host. You'll be redirected to the dashboard."
						);
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

			// IMPORTANT: Add safeguard for production
			// Skip any updates where participants array is empty but room is still open
			// This prevents unintended participant removals during Supabase payload issues
			if (
				Array.isArray(updatedRoom.participants) &&
				updatedRoom.participants.length === 0 &&
				updatedRoom.roomStatus !== false &&
				previousParticipants.length > 0
			) {
				console.log(
					"[ROOM-UPDATE] ⚠️ Suspicious empty participants array in active room. Skipping update."
				);
				console.log(
					"[ROOM-UPDATE] This may be a Supabase real-time subscription glitch."
				);
				return; // Skip this update entirely
			}

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
				console.log("Room was closed - roomStatus is false");
				// Set hasJoined to false since everyone has been kicked out
				setHasJoined(false);
				// Show an alert or notification that the room was closed
				if (typeof window !== "undefined") {
					// Only show alert in browser environment
					alert(
						"The room has been closed. You will be redirected to the dashboard."
					);

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
				const updatedParticipants = parseParticipants(result.participants || []);
				setParticipants(updatedParticipants);
				setHasJoined(true);
			} else {
				console.error("Failed to join room, no result returned");
				// Consider if the room was closed or another issue occurred
				// Fetch the room again to check status if needed
				const currentRoomState = await getRoomSupabase(roomIdFromParams);
				if (currentRoomState && currentRoomState.roomStatus === false) {
					alert("Cannot join, the room is closed.");
					window.location.href = "/dashboard";
				} else {
					setError(new Error("Failed to join room - check logs for details."));
				}
			}
		} catch (error) {
			console.error("[JOIN] Error joining room:", error);
			setError(error instanceof Error ? error : new Error("Failed to join room"));
		} finally {
			joinInProgressRef.current = false;
		}
	}, [
		roomIdFromParams,
		currentUser,
		hasJoined,
		room,
		participants,
		setParticipants,
	]); // Ensure setParticipants is in dependencies

	// Function to clean up local storage when leaving room
	const cleanupLocalStorage = () => {
		localStorage.removeItem("userId");
		localStorage.removeItem("username");
	};

	// Leave room function - memoized with useCallback
	const leaveRoom = useCallback(
		async (refresh: boolean = true) => {
			try {
				if (!room) {
					return;
				}

				// Extract the correct roomId (use roomId field, not id)
				const roomIdToUse = room.roomId || room.id;
				console.log(`[LEAVE] Preparing to leave room ${roomIdToUse}`);

				// If room is already closed, just navigate away
				if (room.roomStatus === false) {
					console.log(
						"[LEAVE] Room is already closed, skipping leave room API call"
					);
					setRoom(null);
					if (refresh) router.refresh();
					router.push("/dashboard");

					// Clear local storage data
					cleanupLocalStorage();
					return;
				}

				// Standard leave procedure
				console.log("[LEAVE] Executing standard leave procedure");

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
						}),
					});

					if (!response.ok) {
						throw new Error(
							`Leave room API error: ${response.status} ${response.statusText}`
						);
					}

					const data = await response.json();
					console.log("[LEAVE] Leave room API response:", data);

					// Add a delay to allow real-time updates to propagate
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

	// Set up a reliable method to leave the room when user navigates away
	useEffect(() => {
		// Track if we've actually joined the room

		// When a user successfully joins, mark the room as joined
		if (hasJoined) {
			roomJoinedRef.current = true;
		}

		// Skip cleanup steps if we never actually joined the room
		// or if the intentional leave already handled it
		const cleanupRoom = () => {
			if (!roomJoinedRef.current || intentionalLeave) {
				console.log(
					"Skipping leave room on unmount - never properly joined or already left"
				);
				return;
			}

			// Try to clean up properly on unmount
			console.log("Component unmounting, leaving room");

			// Skip leave check in development mode to prevent issues with hot reloading
			const isDevelopment = process.env.NODE_ENV === "development";
			if (isDevelopment) {
				console.log("Skipping leave room on unmount in development mode");
				return;
			}

			// Try to leave the room but don't block unmounting
			try {
				if (roomIdFromParams && currentUser?.userId) {
					console.log("[LEAVE] Calling leaveRoom from cleanup");
					// Call leaveRoom without host exit check on unmount
					leaveRoomSupabase(roomIdFromParams, currentUser.userId, false).catch((e) =>
						console.error("Error leaving room on unmount:", e)
					);
				}
			} catch (error) {
				console.error("Error in RoomProvider cleanup when unmounting:", error);
			}
		};

		// Return the cleanup function
		return cleanupRoom;
	}, [roomIdFromParams, currentUser?.userId, hasJoined, intentionalLeave]);

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
