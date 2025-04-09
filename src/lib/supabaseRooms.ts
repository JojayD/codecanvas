import { log, time } from "console";
import {
	supabase,
	Room,
	CreateRoomPayload,
	UpdateRoomPayload,
} from "./supabase";
import { createWhiteboard } from "./supabaseWhiteboard";

/**
 * Create a new room
 */
export async function createRoom(
	roomData: CreateRoomPayload
): Promise<Room | null> {
	try {
		// Generate a numeric ID if not provided
		if (!roomData.roomId) {
			// Generate a numeric ID to match the bigint column 	type in Supabase
			roomData.roomId = Math.floor(Math.random() * 1000000);
		}

		const { data, error } = await supabase
			.from("rooms") // Make sure this matches your table name exactly
			.insert([roomData])
			.select()
			.single();

		if (error) throw error;

		// Create a whiteboard for this room
		if (data) {
			try {
				console.log(`Creating whiteboard for room ${data.roomId}`);
				const whiteboard = await createWhiteboard(data.roomId, roomData.created_by);
				if (!whiteboard) {
					console.warn(`Failed to create whiteboard for room ${data.roomId}`);
				} else {
					console.log(`Whiteboard created successfully for room ${data.roomId}`);
				}
			} catch (whiteboardError) {
				console.error("Error creating whiteboard:", whiteboardError);
				// We don't throw here as the room was still created successfully
			}
		}

		return data;
	} catch (error) {
		console.error("Error creating room:", error);
		return null;
	}
}

/**
 * Get a room by ID
 */
export async function getRoom(roomId: string | number): Promise<Room | null> {
	try {
		console.log(`Fetching room with roomId: ${roomId}`);
		// Try looking up by roomId first (prioritize this)
		let data;
		let error;

		// Convert to number if it's a string
		const roomIdNumber = typeof roomId === "string" ? parseInt(roomId) : roomId;

		// First try with roomId field (the random number) - more secure
		const result = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomIdNumber)
			.single();

		if (result.error || !result.data) {
			console.log(
				`No room found with roomId=${roomIdNumber}, trying id field as fallback`
			);

			// Fall back to id field if roomId lookup fails
			const altResult = await supabase
				.from("rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			data = altResult.data;
			error = altResult.error;
		} else {
			data = result.data;
			error = result.error;
		}

		if (error) throw error;
		if (!data) throw new Error(`Room not found with roomId: ${roomId}`);

		console.log(`Room found:`, data);
		return data;
	} catch (error) {
		console.error("Error fetching room:", error);
		return null;
	}
}

/**
 * Update a room
 */
export async function updateRoom(
	roomId: string | number,
	updates: UpdateRoomPayload
): Promise<Room | null> {
	try {
		console.log(`Updating room ${roomId} with:`, updates);
		// Get the room first to determine which ID field to use
		const room = await getRoom(roomId);
		if (!room) {
			throw new Error(`Cannot update - room not found with roomId: ${roomId}`);
		}

		// Use the actual database ID for the update operation (required by Supabase)
		const { data, error } = await supabase
			.from("rooms")
			.update(updates)
			.eq("id", room.id) // Must use primary key ID for database updates
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error updating room:", error);
		return null;
	}
}

/**
 * Join a room (add participant)
 */
export async function joinRoom(
	roomId: string | number,
	userId: string,
	username: string
): Promise<Room | null> {
	try {
		console.log(`Attempting to join room ${roomId} as ${userId}:${username}`);

		// First get the current room data
		const room = await getRoom(roomId);
		if (!room) {
			console.error("Room not found:", roomId);
			throw new Error("Room not found");
		}

		// Ensure participants is an array
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];

		// Check if user is already in the room
		const participantString = `${userId}:${username}`;
		if (participants.includes(participantString)) {
			console.log("User already in room, skipping join");
			return room; // User already in room
		}

		// Add participant and update
		const updatedParticipants = [...participants, participantString];
		console.log("Updating participants:", updatedParticipants);
		// Use the room.roomId to ensure we use the random ID for updates
		return await updateRoom(room.roomId || room.id, {
			participants: updatedParticipants,
		});
	} catch (error) {
		console.error("Error joining room:", error);
		return null;
	}
}

/**
 * Leave a room (remove participant)
 */
export async function leaveRoom(
	roomId: string | number,
	userId: string
): Promise<Room | null> {
	try {
		console.log(`Attempting to leave room ${roomId} as user ${userId}`);

		// First get the current room data
		const room = await getRoom(roomId);
		console.log("Leave room function in supabaseRoom.ts", room);
		if (!room) {
			console.error("Room not found:", roomId);
			throw new Error("Room not found");
		}
		console.log(room.participants);
		// Ensure participants is an array
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];

		// Filter out the leaving participant
		const updatedParticipants = participants.filter(
			(p) => !p.startsWith(`${userId}:`)
		);
		let dateTime = new Date();
		console.log(
			"Here are the upadted participants",
			updatedParticipants,
			dateTime
		);
		console.log("Updating participants:", updatedParticipants);
		// Use the room.roomId to ensure we use the random ID for updates
		return await updateRoom(room.roomId || room.id, {
			participants: updatedParticipants,
		});
	} catch (error) {
		console.error("Error leaving room:", error);
		return null;
	}
}

/**
 * Subscribe to room changes
 */
export function subscribeToRoom(
	roomId: string | number,
	callback: (room: Room) => void
) {
	console.log(`Setting up subscription for room ${roomId}`);

	// First get the room to determine the actual ID to use in filters
	return getRoom(roomId)
		.then((room) => {
			if (!room) {
				console.error(`Cannot subscribe - room not found with ID: ${roomId}`);
				return {
					unsubscribe: () => console.log("No subscription to unsubscribe from"),
				};
			}

			const actualId = room.id;
			console.log(`Starting real-time subscription for room ID: ${actualId}`);

			return supabase
				.channel(`room-changes:${actualId}`)
				.on(
					"postgres_changes",
					{
						event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
						schema: "public",
						table: "rooms",
						filter: `id=eq.${actualId}`,
					},
					(payload: any) => {
						console.log(`Room event received (${payload.eventType}):`, payload);
						if (payload.eventType === "DELETE") {
							console.log("Room was deleted");
							return; // Handle deletion if needed
						}
						callback(payload.new as Room);
					}
				)
				.subscribe((status: { event: string; status: string }) => {
					console.log(`Subscription status for room ${actualId}:`, status);
				});
		})
		.catch((err) => {
			console.error("Error setting up room subscription:", err);
			return {
				unsubscribe: () =>
					console.log("Error subscription - nothing to unsubscribe"),
			};
		});
}

/**
 * Subscribe to code changes
 */
export function subscribeToCodeChanges(
	roomId: string | number,
	callback: (code: string) => void
) {
	console.log(`Setting up code subscription for room ${roomId}`);

	// First get the room to determine the actual ID to use in filters
	return getRoom(roomId)
		.then((room) => {
			if (!room) {
				console.error(
					`Cannot subscribe to code - room not found with ID: ${roomId}`
				);
				return {
					unsubscribe: () => console.log("No code subscription to unsubscribe from"),
				};
			}

			const actualId = room.id;
			console.log(`Starting real-time code subscription for room ID: ${actualId}`);

			return supabase
				.channel(`room-code-changes:${actualId}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE", // Only interested in updates for code
						schema: "public",
						table: "rooms",
						filter: `id=eq.${actualId}`,
					},
					(payload: any) => {
						console.log("Code update received, payload:", payload);
						if (!payload.new) {
							console.error("Invalid payload received for code update");
							return;
						}
						const room = payload.new as Room;
						callback(room.code || "");
					}
				)
				.subscribe((status: { event: string; status: string }) => {
					console.log(`Code subscription status for room ${actualId}:`, status);
				});
		})
		.catch((err) => {
			console.error("Error setting up code subscription:", err);
			return {
				unsubscribe: () =>
					console.log("Error code subscription - nothing to unsubscribe"),
			};
		});
}

/**
 * Subscribe to prompt changes
 */
export function subscribeToPromptChanges(
	roomId: string | number,
	callback: (prompt: string) => void
) {
	console.log(`Setting up prompt subscription for room ${roomId}`);

	// First get the room to determine the actual ID to use in filters
	return getRoom(roomId)
		.then((room) => {
			if (!room) {
				console.error(
					`Cannot subscribe to prompt - room not found with ID: ${roomId}`
				);
				return {
					unsubscribe: () =>
						console.log("No prompt subscription to unsubscribe from"),
				};
			}

			const actualId = room.id;
			console.log(
				`Starting real-time prompt subscription for room ID: ${actualId}`
			);

			return supabase
				.channel(`room-prompt-changes:${actualId}`)
				.on(
					"postgres_changes",
					{
						event: "*", // Listen for all event types for prompt
						schema: "public",
						table: "rooms",
						filter: `id=eq.${actualId}`,
					},
					(payload: any) => {
						console.log("Prompt update received, payload:", payload);
						if (!payload.new) {
							console.error("Invalid payload received for prompt update");
							return;
						}
						const room = payload.new as Room;
						callback(room.prompt || "");
					}
				)
				.subscribe((status: { event: string; status: string }) => {
					console.log(`Prompt subscription status for room ${actualId}:`, status);
				});
		})
		.catch((err) => {
			console.error("Error setting up prompt subscription:", err);
			return {
				unsubscribe: () =>
					console.log("Error prompt subscription - nothing to unsubscribe"),
			};
		});
}

/**
 * Subscribe to language changes
 */
export function subscribeToLanguageChanges(
	roomId: string | number,
	callback: (language: string) => void
) {
	console.log(`Setting up language subscription for room ${roomId}`);

	return getRoom(roomId)
		.then((room) => {
			if (!room) {
				console.error(
					`Cannot subscribe to language - room not found with ID: ${roomId}`
				);
				return {
					unsubscribe: () =>
						console.log("No language subscription to unsubscribe from"),
				};
			}

			const actualId = room.id;
			console.log(
				`Starting real-time language subscription for room ID: ${actualId}`
			);

			return supabase
				.channel(`room-language-changes:${actualId}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE", // Only interested in updates for language
						schema: "public",
						table: "rooms",
						filter: `id=eq.${actualId}`,
					},
					(payload: any) => {
						console.log("Language update received, payload:", payload);
						if (!payload.new) {
							console.error("Invalid payload received for language update");
							return;
						}
						const room = payload.new as Room;
						callback(room.language || ""); // Assuming 'language' is a field in your Room model
					}
				)
				.subscribe((status: { event: string; status: string }) => {
					console.log(`Language subscription status for room ${actualId}:`, status);
				});
		})
		.catch((err) => {
			console.error("Error setting up language subscription:", err);
			return {
				unsubscribe: () =>
					console.log("Error language subscription - nothing to unsubscribe"),
			};
		});
}
