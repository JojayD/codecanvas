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
} from "@/lib/supabaseRooms";
import { Room, Room as SupabaseRoom } from "@/lib/supabase";

type Participant = { userId: string; username: string };
type RoomContextType = {
	roomId: string;
	participants: Participant[];
	code: string;
	prompt: string;
	updateCode: (newCode: string) => Promise<void>;
	updatePrompt: (newPrompt: string) => Promise<void>;
	joinRoom: () => Promise<void>;
	leaveRoom: () => Promise<void>;
	loading: boolean;
	error: Error | null;
	currentUser: { userId: string; username: string };
};

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
	const roomIdFromParams = searchParams.get("roomId") || "";

	const [room, setRoom] = useState<Room | null>(null);
	const [code, setCode] = useState<string>("");
	const [prompt, setPrompt] = useState<string>("");
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);
	const [hasJoined, setHasJoined] = useState<boolean>(false);

	// Mock user for now - in a real app, this would come from auth
	// Use a stable user ID for testing multiple tabs/windows
	const [currentUser] = useState(() => {
		// Create a persistent user ID or use an existing one
		let userId = localStorage.getItem("userId");
		let username = localStorage.getItem("username");

		if (!userId || !username) {
			userId = `user-${Math.random().toString(36).substring(2, 7)}`;
			username = `User-${Math.random().toString(36).substring(2, 5)}`;
			localStorage.setItem("userId", userId);
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

	// Fetch room data on initial load
	useEffect(() => {
		async function fetchRoom() {
			if (!roomIdFromParams) return;

			try {
				setLoading(true);
				console.log("Fetching room data for:", roomIdFromParams);
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

			setParticipants(parsedParticipants);
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

			// Only update if this is not our own recent change and the code is different
			const now = Date.now();
			const timeSinceLocalUpdate = now - lastLocalUpdate.current.timestamp;
			const isOurRecentChange =
				timeSinceLocalUpdate < 5000 && // Within last 5 seconds
				updatedCode === lastLocalUpdate.current.code; // Same code we just sent

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

			// Force a complete state update for the prompt
			if (typeof updatedPrompt === "string" && updatedPrompt !== prompt) {
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
			// clearInterval(pollingInterval);
		};
	}, [roomIdFromParams, code]); // Add code as dependency to compare with incoming updates

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
			await leaveRoomSupabase(roomIdFromParams, currentUser.userId);
			console.log("Successfully left room");
			setHasJoined(false);
		} catch (error) {
			console.error("Error leaving room:", error);
			setError(error instanceof Error ? error : new Error("Failed to leave room"));
		}
	}, [roomIdFromParams, currentUser.userId, hasJoined]);

	// Update code function - memoized with useCallback
	const updateCode = useCallback(
		async (newCode: string) => {
			try {
				// Generate a unique change ID
				const changeId = Date.now().toString();

				// Set the local state immediately for a responsive UI
				setCode(newCode);

				// Record that we just made a local update
				lastLocalUpdate.current = {
					...lastLocalUpdate.current, // Keep existing values
					timestamp: Date.now(),
					code: newCode,
					changeId,
				};

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
				// Generate a unique change ID
				const changeId = Date.now().toString();

				// Set the local state immediately for a responsive UI
				setPrompt(newPrompt);

				// Record that we just made a local update
				lastLocalUpdate.current = {
					...lastLocalUpdate.current,
					timestamp: Date.now(),
					prompt: newPrompt,
					changeId,
				};

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
		if (!loading && room && !hasJoined) {
			console.log("Auto-joining room after initial load");
			joinRoom();
		}
	}, [loading, room, hasJoined, joinRoom]);

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
				updateCode,
				updatePrompt,
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
