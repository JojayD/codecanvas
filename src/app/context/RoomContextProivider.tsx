"use client";
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import {
	getRoom,
	joinRoom as joinRoomSupabase,
	leaveRoom as leaveRoomSupabase,
	updateRoom,
	subscribeToRoom,
	subscribeToCodeChanges,
} from "@/lib/supabaseRooms";
import { Room as SupabaseRoom } from "@/lib/supabase";

type Participant = { userId: string; username: string };
type RoomContextType = {
	roomId: string;
	participants: Participant[];
	code: string;
	updateCode: (newCode: string) => Promise<void>;
	joinRoom: () => Promise<void>;
	leaveRoom: () => Promise<void>;
	loading: boolean;
	error: Error | null;
	currentUser: { userId: string; username: string };
};

interface Room {
	id: string;
	name: string;
	description: string;
	code: string;
	created_at: string;
	updated_at: string;
	participants: string[];
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
	roomId: string;
}> = ({ children, roomId }) => {
	const searchParams = useSearchParams();
	const roomIdFromParams = searchParams.get("roomId") || "";

	const [room, setRoom] = useState<Room | null>(null);
	const [code, setCode] = useState<string>("");
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

		// Subscribe to room updates (participants)
		const roomSubscription = subscribeToRoom(roomIdFromParams, (updatedRoom) => {
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
		});

		// Subscribe to code changes
		const codeSubscription = subscribeToCodeChanges(
			roomIdFromParams,
			(updatedCode) => {
				console.log("Code update received, length:", updatedCode?.length || 0);
				setCode(updatedCode || "");
			}
		);

		return () => {
			// Clean up subscriptions
			console.log("Cleaning up subscriptions");
			roomSubscription.unsubscribe();
			codeSubscription.unsubscribe();
		};
	}, [roomIdFromParams]);

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
				setCode(newCode);

				// Update the code in Supabase
				await updateRoom(roomIdFromParams, { code: newCode });
			} catch (error) {
				console.error("Error updating code:", error);
				setError(
					error instanceof Error ? error : new Error("Failed to update code")
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
				updateCode,
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
