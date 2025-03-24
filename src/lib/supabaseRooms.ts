import {
	supabase,
	Room,
	CreateRoomPayload,
	UpdateRoomPayload,
} from "./supabase";

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
			roomData.roomId = Math.floor(Math.random() * 1000000).toString();
		}

		const { data, error } = await supabase
			.from("rooms") // Make sure this matches your table name exactly
			.insert([roomData])
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error creating room:", error);
		return null;
	}
}

/**
 * Get a room by ID
 */
export async function getRoom(roomId: string): Promise<Room | null> {
	try {
		console.log(`Fetching room with ID: ${roomId}`);
		// Try looking up by id first
		let data;
		let error;

		const result = await supabase
			.from("rooms")
			.select("*")
			.eq("id", roomId)
			.single();

		if (result.error || !result.data) {
			console.log(`No room found with id=${roomId}, trying roomId field`);
			// Try with roomId field if id lookup fails
			const altResult = await supabase
				.from("rooms")
				.select("*")
				.eq("roomId", roomId)
				.single();

			data = altResult.data;
			error = altResult.error;
		} else {
			data = result.data;
			error = result.error;
		}

		if (error) throw error;
		if (!data) throw new Error(`Room not found with ID: ${roomId}`);

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
	roomId: string,
	updates: UpdateRoomPayload
): Promise<Room | null> {
	try {
		console.log(`Updating room ${roomId} with:`, updates);
		// Get the room first to determine which ID field to use
		const room = await getRoom(roomId);
		if (!room) {
			throw new Error(`Cannot update - room not found with ID: ${roomId}`);
		}

		// Use the actual ID from the room object
		const { data, error } = await supabase
			.from("rooms")
			.update(updates)
			.eq("id", room.id) // Always use the primary key ID
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
	roomId: string,
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

		// Use the room.id directly to ensure we update the correct record
		return await updateRoom(room.id, { participants: updatedParticipants });
	} catch (error) {
		console.error("Error joining room:", error);
		return null;
	}
}

/**
 * Leave a room (remove participant)
 */
export async function leaveRoom(
	roomId: string,
	userId: string
): Promise<Room | null> {
	try {
		console.log(`Attempting to leave room ${roomId} as user ${userId}`);

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

		// Filter out the leaving participant
		const updatedParticipants = participants.filter(
			(p) => !p.startsWith(`${userId}:`)
		);

		console.log("Updating participants:", updatedParticipants);
		// Use the room.id directly to ensure we update the correct record
		return await updateRoom(room.id, { participants: updatedParticipants });
	} catch (error) {
		console.error("Error leaving room:", error);
		return null;
	}
}

/**
 * Subscribe to room changes
 */
export function subscribeToRoom(
	roomId: string,
	callback: (room: Room) => void
) {
	console.log(`Setting up subscription for room ${roomId}`);
	return supabase
		.channel(`room:${roomId}`)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "rooms", // Make sure this matches your table name exactly
				filter: `id=eq.${roomId}`,
			},
			(payload: any) => {
				console.log("Room update received:", payload);
				callback(payload.new as Room);
			}
		)
		.subscribe();
}

/**
 * Subscribe to code changes
 */
export function subscribeToCodeChanges(
	roomId: string,
	callback: (code: string) => void
) {
	console.log(`Setting up code subscription for room ${roomId}`);
	return supabase
		.channel(`room-code:${roomId}`)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "rooms", // Make sure this matches your table name exactly
				filter: `id=eq.${roomId}`,
			},
			(payload: any) => {
				console.log("Code update received:", payload);
				const room = payload.new as Room;
				callback(room.code);
			}
		)
		.subscribe();
}
