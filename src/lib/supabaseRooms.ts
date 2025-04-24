import { log, time } from "console";
import {
	Room,
	CreateRoomPayload,
	UpdateRoomPayload,
	CreateLivekitRoomPayload,
	LivekitRoom,
} from "./supabase";
import { createWhiteboard } from "./supabaseWhiteboard";
import { closeRoomSimple } from "./closeRoom";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {supabase } from "./supabase";
import { createLivekitRoom } from "./supabaseLiveKit";
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
			.insert(roomData as any)
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

			// Create a livekit room for this room
			if (data) {
				try {
					console.log(`Creating livekit room for room ${data.roomId}`);
					const livekitRoom = await createLivekitRoom(data.roomId);
					if (!livekitRoom) {
						console.warn(`Failed to create livekit room for room ${data.roomId}`);
					} else {
						console.log(`Livekit room created successfully for room ${data.roomId}`);
					}
				}catch (livekitError) {
					console.error("Error creating livekit room:", livekitError);
					// We don't throw here as the room was still created successfully
				}
			}
		}

		// Convert null values to undefined to match Room type
		const roomWithProperTypes: Room = {
			...data,
			name: data.name || undefined,
			description: data.description || undefined,
			code: data.code || undefined,
			language: data.language || undefined,
			created_by: data.created_by || undefined,
			participants: data.participants || undefined,
			prompt: data.prompt || undefined,
			updated_at: data.updated_at || undefined,
			created_at: data.created_at || undefined,
			roomStatus: data.roomStatus ?? undefined,
			
		};

		return roomWithProperTypes;
	} catch (error) {
		console.error("Error creating room:", error);
		return null;
	}
}

/**
 * Get a room by ID
 */
export async function getRoom(roomId: string | number, customClient?: any): Promise<Room | null> {
  try {
    console.log(`Fetching room with roomId: ${roomId}`);
    // Try looking up by roomId first (prioritize this)
    let data;
    let error;

    // Convert to number if it's a string
    const roomIdNumber = typeof roomId === "string" ? parseInt(roomId) : roomId;
    console.log(`Converted roomId to number: ${roomIdNumber}`);
    
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

    } else {
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!data) throw new Error(`Room not found with roomId: ${roomId}`);

    console.log(`Room found:`, data);
    // Log the room status specifically for debugging
    console.log(
      `Room status check - roomStatus: ${data.roomStatus}, created_by: ${data.created_by}`
    );
    
    // Convert the database object to match Room type (convert nulls to undefined)
    const roomWithProperTypes: Room = {
      ...data,
      name: data.name || undefined,
      description: data.description || undefined,
      code: data.code || undefined,
      language: data.language || undefined,
      created_by: data.created_by || undefined,
      participants: data.participants || undefined,
      prompt: data.prompt || undefined,
      updated_at: data.updated_at || undefined,
      created_at: data.created_at || undefined,
      roomStatus: data.roomStatus ?? undefined,
    };
    
    return roomWithProperTypes;
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
	updates: UpdateRoomPayload,
	customClient?: any
): Promise<Room | null> {
	try {
		console.log(`Updating room ${roomId} with:`, updates);
		// Get the room first to determine which ID field to use
		const room = await getRoom(roomId);
		if (!room) {
			throw new Error(`Cannot update - room not found with roomId: ${roomId}`);
		}

		// PRODUCTION SAFEGUARD: Prevent unintended participant removals
		// Only allow empty participants array if explicitly closing room or if room was already empty
		if (
			Array.isArray(updates.participants) &&
			updates.participants.length === 0 &&
			updates.roomStatus !== false &&
			room.roomStatus !== false &&
			Array.isArray(room.participants) &&
			room.participants.length > 0
		) {
			console.error(
				"[CRITICAL] Prevented unintended participant removal in active room:",
				{
					roomId,
					currentParticipants: room.participants,
					updatingTo: updates.participants,
					roomStatus: room.roomStatus,
					updatingRoomStatus: updates.roomStatus,
				}
			);

			// Fix the updates to preserve existing participants
			updates.participants = room.participants;
			console.log("[RECOVERY] Keeping existing participants:", room.participants);
		}

		// Use the actual database ID for the update operation (required by Supabase)
		const { data, error } = await (customClient || supabase)
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
		console.log(
			`Attempting to join room ${roomId} as user ${userId}:${username}`
		);

		// First get the current room data
		const room = await getRoom(roomId);
		if (!room) {
			console.error("Room not found:", roomId);
			throw new Error("Room not found");
		}

		// CRITICAL: Verify room is still active before joining
		if (room.roomStatus === false) {
			console.error(`Cannot join room ${roomId} - room is already closed`);
			return null;
		}

		// Ensure participants is an array
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];

		console.log(
			`Current participants before join: ${JSON.stringify(participants)}`
		);

		// Extract user ID without username for comparison
		const baseUserId = userId.split(":")[0];
		const participantString = `${userId}:${username}`;

		// Improved duplicate check: Check if user is already in the room in any format
		// This handles both "userId" and "userId:username" formats
		const isUserAlreadyInRoom = participants.some((p) => {
			// Check exact match
			if (p === participantString) {
				console.log(`Exact match found: ${p} equals ${participantString}`);
				return true;
			}

			// Check if this participant entry starts with userId (handles userId:anyUsername)
			if (p.startsWith(`${baseUserId}:`)) {
				console.log(`Prefix match found: ${p} starts with ${baseUserId}:`);
				return true;
			}

			// Check if this participant entry is just the userId (no username)
			if (p === baseUserId) {
				console.log(`Base match found: ${p} equals base ${baseUserId}`);
				return true;
			}

			// Check if userId is part of a compound ID (handling edge cases)
			const participantParts = p.split(":");
			if (participantParts.length > 0 && participantParts[0] === baseUserId) {
				console.log(
					`Component match found: ${p} contains ${baseUserId} as first part`
				);
				return true;
			}

			return false;
		});

		if (isUserAlreadyInRoom) {
			console.log(`User ${userId} (${username}) already in room, skipping join:`, {
				userId,
				participantString,
				existingParticipants: participants,
			});
			return room; // User already in room
		}

		// Participant count check, after duplicates are filtered out
		const MAX_PARTICIPANTS = 3; // Define a constant for clarity
		if (participants.length >= MAX_PARTICIPANTS) {
			console.log(
				`Room ${roomId} already has ${participants.length} participants (max: ${MAX_PARTICIPANTS}), cannot join`
			);
			return null; // Room already full
		}

		// Add participant and update
		const updatedParticipants = [...participants, participantString];
		console.log(
			`Updating participants to: ${JSON.stringify(updatedParticipants)}`
		);

		// CRITICAL: Add protection against empty participant array in production
		// This prevents accidentally wiping out participants if there's a glitch
		if (updatedParticipants.length === 0 && participants.length > 0) {
			console.error(
				"Error: Attempted to update with empty participants array, aborting join"
			);
			return null;
		}

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
	userId: string,
	isHost: boolean = false, // Parameter kept for backward compatibility
	checkForHostExit: boolean = false, // Parameter kept for backward compatibility
	created_by?: string, // Parameter kept for backward compatibility
	roomData?: Room,
	customClient?: any // Add optional parameter for custom authenticated client
): Promise<Room | null> {
	try {
		console.log(
			`[LEAVE ROOM] Attempting to leave room ${roomId} as user ${userId}`
		);

		// Use provided client or fall back to default
		const client = customClient || supabase;

		// First get the current room data using the provided client
		let room = roomData;
		if (!room) {
			// If room data not provided, fetch it using the provided client
			const { data, error } = await client
				.from("rooms")
				.select("*")
				.eq("roomId", typeof roomId === "string" ? parseInt(roomId) : roomId)
				.single();
			
			if (error) {
				console.error("[LEAVE ROOM] Error fetching room:", error);
				throw new Error("Room not found");
			}
			
			room = data;
		}
		
		if (!room) {
			console.error("[LEAVE ROOM] Room not found:", roomId);
			throw new Error("Room not found");
		}

		// Room is already closed, just return it
		if (room.roomStatus === false) {
			console.log(
				`[LEAVE ROOM] Room ${roomId} is already closed, skipping update`
			);
			return room;
		}

		// Extract the base userId without the username part (if it's in format "userId:username")
		let baseUserId = userId;
		const colonIndex = userId.indexOf(":");
		if (colonIndex > 0) {
			baseUserId = userId.substring(0, colonIndex);
			console.log(`[LEAVE ROOM] Extracted base userId for check: ${baseUserId}`);
		}

		// Ensure participants is an array
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];
		console.log(
			`[LEAVE ROOM] Current participants before filtering:`,
			participants
		);

		// Filter out the leaving participant - check for both full userId and baseUserId
		const updatedParticipants = participants.filter(
			(p) => !p.startsWith(`${baseUserId}:`) && p !== baseUserId
		);

		console.log("[LEAVE ROOM] Updated participants:", updatedParticipants);

		// If there are no participants left, close the room
		if (updatedParticipants.length === 0) {
			console.log(
				`[LEAVE ROOM] Closing room ${roomId} as it has no participants left`
			);
			return await closeRoom(roomId, customClient);
		}

		// Otherwise, just update the participants list
		console.log(
			`[LEAVE ROOM] Updating room with ${updatedParticipants.length} participants`
		);
		return await updateRoom(room.roomId || room.id, {
			participants: updatedParticipants,
		}, customClient);
	} catch (error) {
		console.error("Error leaving room:", error);
		return null;
	}
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string | number): Promise<boolean> {
	try {
		// Get the room first to determine which ID field to use
		const room = await getRoom(roomId);
		if (!room) {
			throw new Error(`Cannot delete - room not found with roomId: ${roomId}`);
		}

		console.log(`Deleting room with ID: ${room.id}`);

		// Delete using the actual database ID
		const { error } = await supabase.from("rooms").delete().eq("id", room.id);

		if (error) throw error;

		console.log(`Successfully deleted room with ID: ${room.id}`);
		return true;
	} catch (error) {
		console.error("Error deleting room:", error);
		return false;
	}
}

/**
 * Close a room (mark as inactive and remove all participants)
 */
export async function closeRoom(
	roomId: string | number, 
	customClient?: any, 
	roomData?: Room
): Promise<Room | null> {
	try {
		console.log(
			`[supabaseRooms.ts CLOSE ROOM] Closing room ${roomId} and removing all participants`
		);

		// Get the room first to determine which ID field to use
		let room = roomData;
		if (!room) {
			// Only fetch the room if not provided
			const fetchedRoom = await getRoom(roomId);
			room = fetchedRoom || undefined;
		}
		
		if (!room) {
			console.error(
				`[CLOSE ROOM] Cannot close - room not found with roomId: ${roomId}`
			);
			throw new Error(`Cannot close - room not found with roomId: ${roomId}`);
		}

		console.log(`[CLOSE ROOM] Current room state:`, {
			id: room.id,
			roomId: room.roomId,
			roomStatus: room.roomStatus,
			participants: room.participants,
		});

		// If room is already closed, just return it
		if (room.roomStatus === false) {
			console.log(
				`[CLOSE ROOM] Room ${roomId} is already closed, skipping update`
			);
			return room;
		}

		// Create a timestamp for the room closure
		const closedAt = new Date().toISOString();

		// Define the update object
		const updateObject = {
			roomStatus: false, // Using roomStatus boolean instead of status string
			participants: [], // Remove all participants
			updated_at: closedAt,
		};

		console.log(`[CLOSE ROOM] Updating with:`, updateObject);

		// Try multiple update approaches to ensure the room gets closed
		try {
			// First, try updating by roomId
			const { data, error } = await (customClient || supabase)
				.from("rooms")
				.update(updateObject)
				.eq("roomId", room.roomId)
				.select()
				.single();

			if (!error && data) {
				console.log(
					`[CLOSE ROOM] Successfully closed room ${room.id} via roomId match`
				);
				return data;
			}

			// If that fails, try updating by the primary key id
			const { data: data2, error: error2 } = await (customClient || supabase)
				.from("rooms")
				.update(updateObject)
				.eq("id", room.id)
				.select()
				.single();

			if (error2) {
				console.error(`[CLOSE ROOM] Error closing room ${room.id}:`, error2);
				throw error2;
			}

			console.log(`[CLOSE ROOM] Successfully closed room ${room.id} via id match`);
			return data2;
		} catch (updateError) {
			console.error(`[CLOSE ROOM] All update attempts failed:`, updateError);

			// Final fallback - try using closeRoomSimple as a last resort
			try {
				console.log(`[CLOSE ROOM] Attempting final fallback with closeRoomSimple`);
				const simpleClosure = await closeRoomSimple(roomId);
				if (simpleClosure) {
					return simpleClosure;
				}
			} catch (finalError) {
				console.error(`[CLOSE ROOM] Final fallback also failed:`, finalError);
			}

			throw updateError;
		}
	} catch (error) {
		console.error("[CLOSE ROOM] Error closing room:", error);
		return null;
	}
}

/**
 * Handle host leaving a room - closes the room and removes all participants
 */
export async function handleHostExit(
	roomId: string | number,
	userId: string
): Promise<Room | null> {
	try {
		console.log(`[HOST EXIT] Treating as a standard room leave operation`);
		// Simply call leaveRoom since host checks are no longer relevant
		return await leaveRoom(roomId, userId);
	} catch (error) {
		console.error("[HOST EXIT] Error handling exit:", error);
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
				.subscribe((status) => {
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
				.subscribe((status) => {
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
				.subscribe((status) => {
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
				.subscribe((status) => {
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
