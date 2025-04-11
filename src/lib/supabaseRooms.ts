import { log, time } from "console";
import {
	supabase,
	Room,
	CreateRoomPayload,
	UpdateRoomPayload,
} from "./supabase";
import { createWhiteboard } from "./supabaseWhiteboard";
import { closeRoomSimple } from "./closeRoom";

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
		// Log the room status specifically for debugging
		console.log(
			`Room status check - roomStatus: ${data.roomStatus}, created_by: ${data.created_by || data.createdBy}`
		);
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
		console.log(
			`Attempting to join room ${roomId} as user ${userId}:${username}`
		);

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
		if (participants.length > 2) {
			console.log(
				`Room ${roomId} already has ${participants.length} participants, cannot join`
			);
			return null; // Room already full
		}

		// Add participant and update
		const updatedParticipants = [...participants, participantString];
		console.log(
			`Updating participants to: ${JSON.stringify(updatedParticipants)}`
		);
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
	checkForHostExit: boolean = false
): Promise<Room | null> {
	try {
		console.log(
			`Attempting to leave room ${roomId} as user ${userId}, checkForHostExit: ${checkForHostExit}`
		);

		// First get the current room data
		const room = await getRoom(roomId);
		console.log("Leave room function in supabaseRoom.ts", room);
		if (!room) {
			console.error("Room not found:", roomId);
			throw new Error("Room not found");
		}

		// Extract the base userId without the username part (if it's in format "userId:username")
		let baseUserId = userId;
		const colonIndex = userId.indexOf(":");
		if (colonIndex > 0) {
			baseUserId = userId.substring(0, colonIndex);
			console.log(`[LEAVE ROOM] Extracted base userId for check: ${baseUserId}`);
		}

		// Only check for host exit if explicitly requested (like when clicking "Leave Room" button)
		if (checkForHostExit) {
			console.log(
				`Checking if user ${baseUserId} is host because checkForHostExit=true`
			);
			// Check if this user is the host/creator, and if so, close the room
			const hostExitResult = await handleHostExit(roomId, userId);
			if (hostExitResult) {
				console.log(`Host ${baseUserId} left, room ${roomId} has been closed`);
				return hostExitResult; // Room has been closed, all participants removed
			}
		}

		// If we get here, user is not the host, so just remove them from participants
		console.log(room.participants);
		// Ensure participants is an array
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];

		// Filter out the leaving participant - check for both full userId and baseUserId
		const updatedParticipants = participants.filter(
			(p) => !p.startsWith(`${baseUserId}:`) && p !== baseUserId
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
export async function closeRoom(roomId: string | number): Promise<Room | null> {
	try {
		console.log(
			`[CLOSE ROOM] Closing room ${roomId} and removing all participants`
		);

		// Get the room first to determine which ID field to use
		const room = await getRoom(roomId);
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

		// Create a timestamp for the room closure
		const closedAt = new Date().toISOString();

		// Define the update object
		const updateObject = {
			roomStatus: false, // Using roomStatus boolean instead of status string
			participants: [], // Remove all participants
			updated_at: closedAt,
			closed_by_host: true, // Add a flag indicating host closure if the column exists
		};

		console.log(`[CLOSE ROOM] Updating with:`, updateObject);

		// Update the room status to closed and clear all participants
		const { data, error } = await supabase
			.from("rooms")
			.update(updateObject)
			.eq("id", room.id)
			.select()
			.single();

		if (error) {
			console.error(`[CLOSE ROOM] Error closing room ${room.id}:`, error);
			throw error;
		}

		console.log(
			`[CLOSE ROOM] Successfully closed room ${room.id} and removed all participants at ${closedAt}`
		);
		console.log(`[CLOSE ROOM] Result:`, {
			id: data.id,
			roomId: data.roomId,
			roomStatus: data.roomStatus,
			participants: data.participants,
		});

		return data;
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
		console.log(
			`[HOST EXIT] *** START *** Checking if user ${userId} is the host of room ${roomId}`
		);

		// Extract the base userId without the username part if needed
		let baseUserId = userId;
		const colonIndex = userId.indexOf(":");
		if (colonIndex > 0) {
			baseUserId = userId.substring(0, colonIndex);
		}
		console.log(
			`[HOST EXIT] BaseUserId (after stripping username): ${baseUserId}`
		);

		// Get the room to check if this user is the creator
		const room = await getRoom(roomId);
		if (!room) {
			console.error(`[HOST EXIT] Room not found with roomId: ${roomId}`);
			return null;
		}

		// DEBUG: Log room data with creator information
		console.log("[HOST EXIT] Room creator info:", {
			id: room.id,
			roomId: room.roomId,
			created_by: room.created_by,
			createdBy: room.createdBy,
		});

		// Get Supabase auth user information when available
		let supabaseAuthUser = null;
		try {
			if (typeof window !== "undefined") {
				const { data } = await supabase.auth.getUser();
				supabaseAuthUser = data?.user;
				console.log("[HOST EXIT] Supabase auth user:", supabaseAuthUser);
			}
		} catch (err) {
			console.log("[HOST EXIT] No authenticated Supabase user");
		}

		// Get localStorage userId to compare with room creator
		const localStorageUserId =
			typeof window !== "undefined" ? localStorage.getItem("userId") : null;
		console.log("[HOST EXIT] Current user IDs:", {
			userIdFromParam: userId,
			baseUserId,
			localStorageUserId,
			supabaseAuthId: supabaseAuthUser?.id,
		});

		// ========== HOST DETECTION LOGIC ==========
		// FIXED: Added a matched ID tracking to understand which check matched

		const matchTracker = { method: "none", details: "no match found" };

		// 1. First check: If Supabase authenticated user matches room creator
		const isAuthUserCreator =
			supabaseAuthUser &&
			(room.created_by === supabaseAuthUser.id ||
				room.createdBy === supabaseAuthUser.id);

		if (isAuthUserCreator) {
			matchTracker.method = "auth_match";
			matchTracker.details = `Supabase auth ID ${supabaseAuthUser?.id} matched room creator ${room.created_by || room.createdBy}`;
		}

		// 2. Second check: Direct match between userId and creator
		const isDirectMatch =
			room.created_by === userId ||
			room.createdBy === userId ||
			room.created_by === baseUserId ||
			room.createdBy === baseUserId;

		if (isDirectMatch && !matchTracker.method.includes("match")) {
			matchTracker.method = "direct_match";
			matchTracker.details = `User ID ${userId} directly matches room creator ${room.created_by || room.createdBy}`;
		}

		// 3. Third check: LocalStorage userId match
		const isLocalStorageMatch =
			localStorageUserId &&
			(room.created_by === localStorageUserId ||
				room.createdBy === localStorageUserId);

		if (isLocalStorageMatch && !matchTracker.method.includes("match")) {
			matchTracker.method = "localStorage_match";
			matchTracker.details = `LocalStorage ID ${localStorageUserId} matched room creator ${room.created_by || room.createdBy}`;
		}

		// 4. Fourth check: Check if this is a localStorage user who created the room
		// FIXED: This was too permissive and caused false positives - make it more strict
		const isLocalStorageCreator =
			localStorageUserId &&
			baseUserId === localStorageUserId &&
			((room.created_by && room.created_by.startsWith("user-")) || // must be a user-XXX format
				(room.createdBy && room.createdBy.startsWith("user-"))); // not just any non-email

		if (isLocalStorageCreator && !matchTracker.method.includes("match")) {
			matchTracker.method = "localStorage_creator";
			matchTracker.details = `LocalStorage user pattern match: baseUserId=${baseUserId} matches localStorage=${localStorageUserId} and room creator has user- prefix`;
		}

		// 5. Check for test host users (special case)
		const isTestHost = userId.startsWith("test-host-");

		if (isTestHost) {
			matchTracker.method = "test_host";
			matchTracker.details = `Test host user detected: ${userId}`;
		}

		// 6. Check if this is the last participant (relevant for test hosts)
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];
		const isLastParticipant = participants.length <= 1;

		if (isLastParticipant && isTestHost) {
			matchTracker.method += "_last_participant";
			matchTracker.details += " and is last participant";
		}

		// Determine if this user is the host based on all checks
		// FIXED: Made the check more explicit and precise
		const isHost =
			isAuthUserCreator ||
			isDirectMatch ||
			isLocalStorageMatch ||
			(isLocalStorageCreator && room.created_by === localStorageUserId);

		console.log("[HOST EXIT] Host detection results:", {
			isAuthUserCreator,
			isDirectMatch,
			isLocalStorageMatch,
			isLocalStorageCreator,
			isTestHost,
			isLastParticipant,
			matchType: matchTracker.method,
			matchDetails: matchTracker.details,
			finalDecision: isHost || (isTestHost && isLastParticipant),
		});

		// If this user is the host OR a test host who is the last participant, close the room
		if (isHost || (isTestHost && isLastParticipant)) {
			console.log(
				`[HOST EXIT] CLOSING ROOM: User ${userId} IS identified as the host via ${matchTracker.method}`
			);

			// Log detailed info about why we're closing the room
			console.log("[HOST EXIT] Closing room because:", {
				isHost,
				isTestHost,
				isLastParticipant,
				participants: participants.length,
				userId,
				room_created_by: room.created_by,
				matchInfo: matchTracker,
			});

			const closedRoom = await closeRoomSimple(room.roomId || room.id);

			if (!closedRoom) {
				console.error(`[HOST EXIT] Failed to close room ${roomId}`);
				return null;
			}

			console.log(`[HOST EXIT] Successfully closed room ${roomId}`);
			return closedRoom as Room;
		}

		console.log(
			`[HOST EXIT] NOT CLOSING ROOM: User ${userId} is NOT the host (matchInfo: ${matchTracker.method})`
		);
		return null;
	} catch (error) {
		console.error("[HOST EXIT] Error handling host exit:", error);
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
