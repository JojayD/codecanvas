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
	getRoom,
	joinRoom as joinRoomSupabase,
	leaveRoom as leaveRoomSupabase,
	updateRoom,
	subscribeToRoom,
	subscribeToCodeChanges,
	subscribeToPromptChanges,
	subscribeToLanguageChanges,
} from "@/lib/supabaseRooms";
import { Room, Room as SupabaseRoom } from "@/lib/supabase";

type Participant = { userId: string; username: string };
interface RoomContextType {
	roomId: string | number;
	participants: Participant[];
	code: string;
	prompt: string;
	language: string;
	updateCode: (code: string) => Promise<void>;
	updatePrompt: (prompt: string) => Promise<void>;
	updateLanguage: (language: string) => Promise<void>;
	joinRoom: () => Promise<void>;
	leaveRoom: () => Promise<void>;
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
				const roomData = await getRoom(roomIdFromParams);

				if (roomData) {
					console.log("Room data received:", roomData);
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

	// Leave room function - memoized with useCallback
	const leaveRoom = useCallback(async () => {
		if (!hasJoined) {
			console.log("Not joined this room, skipping leave");
			return;
		}

		try {
			console.log("Leaving room:", roomIdFromParams);
			// Mark this as an intentional leave to prevent auto-rejoin
			setIntentionalLeave(true);

			// First update in Supabase before local state to ensure consistency
			const result = await leaveRoomSupabase(roomIdFromParams, currentUser.userId);

			if (result) {
				console.log("Successfully left room in database");

				// Use functional update for setParticipants to ensure we use the latest state
				setParticipants((prevParticipants) => {
					const updated = prevParticipants.filter(
						(p) => p.userId !== currentUser.userId
					);
					// Log the participant change for debugging
					console.log(
						"Local participants updated after leaving (functional update):",
						{
							previous: prevParticipants.map((p) => p.userId),
							current: updated.map((p) => p.userId),
							timestamp: new Date().toISOString(),
						}
					);
					return updated; // Return the new state
				});

				setHasJoined(false);
			} else {
				console.error("Failed to leave room - no result returned from database");
				throw new Error("Failed to leave room - database update failed");
			}
		} catch (error) {
			console.error("Error leaving room:", error);
			setError(error instanceof Error ? error : new Error("Failed to leave room"));
		}
		// Keep `participants` removed from dependency array
	}, [roomIdFromParams, currentUser.userId, hasJoined]);

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
			if (hasJoined) {
				console.log("Component unmounting, leaving room");
				leaveRoomSupabase(roomIdFromParams, currentUser.userId)
					.then(() => console.log("Left room on unmount"))
					.catch((err) => console.error("Error leaving room on unmount:", err));
			}
		};
	}, [roomIdFromParams, currentUser.userId, hasJoined]);

	return (
		<RoomContext.Provider
			value={{
				roomId: roomIdFromParams,
				participants,
				code,
				prompt,
				language,
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
