"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { generateClient } from "aws-amplify/api";
import { getCurrentUser } from "aws-amplify/auth";
import {
	getRoomQuery,
	updateRoomMutation,
} from "../api/graphql/GraphQlFunctions";

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
	createdAt: string;
	updatedAt: string;
	participants: string[];
}

interface GetRoomQueryResponse {
	getRoom: Room;
}

interface GraphQLResult {
	data?: GetRoomQueryResponse;
	errors?: any[];
}

const RoomContext = createContext<RoomContextType | null>(null);
const client = generateClient();

export const RoomProvider = ({
	children,
	roomId,
}: {
	children: React.ReactNode;
	roomId: string;
}) => {
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [code, setCode] = useState("// Start coding here...");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [currentUser, setCurrentUser] = useState({ userId: "", username: "" });

	// Initialize the user (authenticated or guest)
	useEffect(() => {
		const initializeUser = async () => {
			try {
				// Try to get authenticated user
				const userInfo = await getCurrentUser();
				setCurrentUser({
					userId: userInfo.userId,
					username: userInfo.username || userInfo.userId,
				});
			} catch (error) {
				console.error("Auth error:", error);
				// Use a guest user ID if not authenticated
				const guestId = `guest-${Math.random().toString(36).substring(2, 8)}`;
				setCurrentUser({
					userId: guestId,
					username: `Guest-${guestId.slice(-4)}`,
				});
				// We'll consider this a normal state, not an error
				setError(null);
			}
		};

		initializeUser();
	}, []);

	// Fetch room data when roomId changes
	useEffect(() => {
		if (!currentUser.userId || !roomId) return;

		const fetchRoom = async () => {
			try {
				console.log("Fetching room data for ID:", roomId);

				// Make sure we have a valid room ID
				if (!roomId) {
					console.log("Invalid room ID, using default values");
					setLoading(false);
					return;
				}

				// Fetch room data
				const result = await client.graphql({
					query: getRoomQuery,
					variables: { id: roomId },
				});

				const typedResult = result as unknown as GraphQLResult;
				console.log("Room data response:", JSON.stringify(typedResult, null, 2));

				// Handle GraphQL errors
				if (typedResult.errors && typedResult.errors.length > 0) {
					console.error(
						"GraphQL errors:",
						JSON.stringify(typedResult.errors, null, 2)
					);
					setLoading(false);
					return;
				}

				const roomData = typedResult.data?.getRoom;

				if (roomData) {
					console.log("Room data found:", JSON.stringify(roomData, null, 2));

					// Try to load code from localStorage
					const savedCode = localStorage.getItem(`code-${roomId}`);
					if (savedCode) {
						setCode(savedCode);
					}

					// Parse participants
					if (roomData.participants && Array.isArray(roomData.participants)) {
						const participantList = roomData.participants
							.map((p: string) => {
								try {
									const parts = p.split(":");
									if (parts.length >= 2) {
										return {
											userId: parts[0],
											username: parts[1],
										};
									}
									return null;
								} catch (err) {
									console.warn(`Error parsing participant: ${p}`, err);
									return null;
								}
							})
							.filter((p): p is Participant => p !== null);

						setParticipants(participantList);
					}
				} else {
					console.log("Room not found, will create on join");
				}

				setLoading(false);
			} catch (err) {
				console.error("Error fetching room:", err);
				setLoading(false);
			}
		};

		fetchRoom();

		// Set up polling for participant updates
		const interval = setInterval(fetchRoom, 5000);
		return () => clearInterval(interval);
	}, [roomId, currentUser.userId]);

	// Join room function - adds current user to participants
	const joinRoom = async () => {
		try {
			// Check if the user is already in the participants list
			const existingParticipant = participants.find(
				(p) => p.userId === currentUser.userId
			);
			if (existingParticipant) {
				console.log("User already in room, skipping join");
				return;
			}

			// Create participant strings in format "userId:username"
			const participantsList = [
				...participants.map((p) => `${p.userId}:${p.username}`),
				`${currentUser.userId}:${currentUser.username}`,
			];

			console.log("Joining room with participants:", participantsList);

			// Update the room with new participant
			const result = await client.graphql({
				query: updateRoomMutation,
				variables: {
					input: {
						id: roomId,
						participants: participantsList,
					},
				},
			});

			console.log("Join room result:", result);

			// Update local state
			setParticipants([
				...participants,
				{ userId: currentUser.userId, username: currentUser.username },
			]);
		} catch (error) {
			console.error("Error joining room:", error);

			// Create a more detailed error object
			const errObj =
				error instanceof Error ? error : new Error("Failed to join room");

			// Log more info about the error
			if (error && typeof error === "object" && "errors" in error) {
				console.error("GraphQL errors:", error);
			}

			setError(errObj);
		}
	};

	// Leave room function - removes current user from participants
	const leaveRoom = async () => {
		try {
			const participantsList = participants
				.filter((p) => p.userId !== currentUser.userId)
				.map((p) => `${p.userId}:${p.username}`);

			console.log("Leaving room, remaining participants:", participantsList);

			const result = await client.graphql({
				query: updateRoomMutation,
				variables: {
					input: {
						id: roomId,
						participants: participantsList,
					},
				},
			});

			console.log("Leave room result:", result);
			setParticipants(participants.filter((p) => p.userId !== currentUser.userId));
		} catch (error) {
			console.error("Error leaving room:", error);
			setError(error instanceof Error ? error : new Error("Failed to leave room"));
		}
	};

	// Update code function - stores in localStorage only
	const updateCode = async (newCode: string) => {
		try {
			// Update local state
			setCode(newCode);

			// Store in localStorage
			localStorage.setItem(`code-${roomId}`, newCode);
			console.log("Code updated locally:", newCode.substring(0, 20) + "...");
		} catch (error) {
			console.error("Error updating code:", error);
			setError(
				error instanceof Error ? error : new Error("Failed to update code")
			);
		}
	};

	return (
		<RoomContext.Provider
			value={{
				roomId,
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

export const useRoom = () => {
	const context = useContext(RoomContext);
	if (!context) {
		throw new Error("useRoom must be used within a RoomProvider");
	}
	return context;
};
