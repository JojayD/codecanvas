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

					// Ensure participants is an array
					const participantsList = Array.isArray(roomData.participants)
						? roomData.participants
						: [];

					// Parse participants from array of strings to array of objects
					const parsedParticipants = participantsList.map((p) => {
						const parts = p.split(":");
						return {
							userId: parts[0] || "",
							username: parts[1] || "Unknown",
						};
					});

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
			console.log("Room update received:", updatedRoom);
			setRoom(updatedRoom);

			// Ensure participants is an array
			const participantsList = Array.isArray(updatedRoom.participants)
				? updatedRoom.participants
				: [];

			// Parse participants
			const parsedParticipants = participantsList.map((p) => {
				const parts = p.split(":");
				return {
					userId: parts[0] || "",
					username: parts[1] || "Unknown",
				};
			});

			// Log participants change for debugging
			console.log("Participants updated:", {
				previous: participants.map((p) => p.userId),
				current: parsedParticipants.map((p) => p.userId),
				timestamp: new Date().toISOString(),
			});

			setParticipants(parsedParticipants);

			// Check if room was closed by host (roomStatus is false and no participants)
			const isRoomClosed =
				updatedRoom.roomStatus === false ||
				(Array.isArray(updatedRoom.participants) &&
					updatedRoom.participants.length === 0);

			if (isRoomClosed) {
				console.log("Room was closed by host - all participants have been removed");
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

		if (participants.length >= 2) {
			console.log("Room already has 2 participants, cannot join");
			alert(
				"This room is already full (maximum 2 participants). You will be redirected to the dashboard."
			);
			// Use Next.js navigation approach since we're in a Next.js app
			window.location.href = "/dashboard";
			return;
		}

		try {
			console.log("Joining room as:", currentUser);

			const result = await joinRoomSupabase(
				roomIdFromParams,
				currentUser.userId,
				currentUser.username
			);

			if (result) {
				console.log("Successfully joined room");
				setHasJoined(true);
			} else {
				console.error("Failed to join room, no result returned");
			}
		} catch (error) {
			console.error("Error joining room:", error);
			setError(error instanceof Error ? error : new Error("Failed to join room"));
		}
	}, [roomIdFromParams, currentUser, hasJoined]);

	// Function to clean up local storage when leaving room
	const cleanupLocalStorage = () => {
		localStorage.removeItem("userId");
		localStorage.removeItem("username");
	};

	// Leave room function - memoized with useCallback
	const leaveRoom = useCallback(
		async (checkForHostExit: boolean = true, refresh: boolean = true) => {
			console.log("[LEAVE-ROOM] Starting leave room procedure...");

			try {
				if (!room) {
					console.log("[LEAVE-ROOM] No room to leave");
					return;
				}

				// Extract the correct roomId (use roomId field, not id)
				const roomIdToUse = room.roomId || room.id;

				console.log(`[LEAVE-ROOM] Using roomId: ${roomIdToUse}`);

				if (checkForHostExit) {
					try {
						// Enhanced host detection when checkForHostExit is true
						console.log("[LEAVE-ROOM] Checking for host exit...");

						// Get user ID (with and without username)
						const userId = currentUser.userId;
						const userName = currentUser.username;

						// Try to get the created_by from room if available
						const created_by = room.created_by || "";

						console.log("[LEAVE-ROOM] Current user:", {
							userId,
							userName,
							created_by,
						});

						// Call debug endpoint to check if user is host or last participant
						const response = await fetch(
							`/api/debug-host-detection?roomId=${roomIdToUse}&userId=${userId}${created_by ? `&created_by=${created_by}` : ""}`
						);

						if (!response.ok) {
							throw new Error(`Failed to check host status: ${response.statusText}`);
						}

						const data = await response.json();
						console.log("[LEAVE-ROOM] Host detection results:", data);

						// If user is host or last participant, close the room
						if (data.isHost || data.isLastParticipant) {
							console.log(
								"[LEAVE-ROOM] User is host or last participant, closing room..."
							);

							// Use force-close-room API to close room
							const closeResponse = await fetch("/api/force-close-room", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									roomId: roomIdToUse,
									userId,
								}),
							});

							if (!closeResponse.ok) {
								console.error(
									`[LEAVE-ROOM] Force close failed: ${closeResponse.statusText}`
								);
								throw new Error(
									`Failed to force close room: ${closeResponse.statusText}`
								);
							}

							const closeData = await closeResponse.json();
							console.log("[LEAVE-ROOM] Force close result:", closeData);

							if (closeData.success) {
								setRoom(null);
								if (refresh) router.refresh();
								router.push("/dashboard");

								// Clear local storage data
								cleanupLocalStorage();
								return; // Exit early if room closed
							} else {
								console.error(
									"[LEAVE-ROOM] Force close was not successful:",
									closeData.error
								);
							}
						}
					} catch (error) {
						console.error("[LEAVE-ROOM] Error in host exit check:", error);
						// Continue with normal leave procedure if host check fails
					}
				}

				// Standard leave procedure if not host or host check fails
				console.log(`[LEAVE-ROOM] Leaving room ${roomIdToUse}...`);

				// Call the leave-room API endpoint
				const response = await axios.post(`/api/leave-room/${roomIdToUse}`, {
					roomId: roomIdToUse,
					userId: currentUser.userId,
				});

				console.log("[LEAVE-ROOM] Leave room response:", response.data);

				setRoom(null);
				if (refresh) router.refresh();
				router.push("/dashboard");

				// Clear local storage data
				cleanupLocalStorage();
			} catch (error) {
				console.error("[LEAVE-ROOM] Error leaving room:", error);
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
		if (!loading && room && !hasJoined && !intentionalLeave) {
			console.log("Auto-joining room after initial load");
			joinRoom();
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
	console.log(`Setting up room subscription for roomId: ${roomId}`);

	// Get room info to determine the internal DB ID
	const room = await getRoomSupabase(roomId);
	if (!room) {
		console.error(`Cannot subscribe - room not found with roomId: ${roomId}`);
		throw new Error(`Room not found: ${roomId}`);
	}

	// Use the room ID for the subscription
	const dbId = room.id;

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
				console.log("Room update received:", payload);
				const updatedRoom = payload.new as Room;
				callback(updatedRoom);
			}
		)
		.subscribe();

	return {
		unsubscribe: () => {
			console.log(`Unsubscribing from room ${roomId}`);
			subscription.unsubscribe();
		},
	};
}
