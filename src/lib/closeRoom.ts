import { supabase } from "@/lib/supabase";

/**
 * Simplified function to close a room immediately
 * Used as a fallback in host exit scenarios
 */
export async function closeRoomSimple(roomId: string | number): Promise<any> {
	try {
		console.log(`[CLOSE_ROOM_SIMPLE] Closing room ${roomId} immediately`);

		// Try to find the room first by roomId field
		let { data: room, error: findError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		// If not found by roomId, try by id field
		if (findError || !room) {
			console.log(
				`[CLOSE_ROOM_SIMPLE] Room not found by roomId ${roomId}, trying with id field`
			);
			const result = await supabase
				.from("rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			room = result.data;
			if (result.error || !room) {
				console.error(
					`[CLOSE_ROOM_SIMPLE] Room not found with either roomId or id: ${roomId}`,
					findError || result.error
				);
				return null;
			}
		}

		console.log(`[CLOSE_ROOM_SIMPLE] Found room:`, {
			id: room.id,
			roomId: room.roomId,
			participants: room.participants?.length || 0,
			roomStatus: room.roomStatus,
		});

		// Skip if room is already closed
		if (room.roomStatus === false) {
			console.log(
				`[CLOSE_ROOM_SIMPLE] Room ${roomId} is already closed, skipping update`
			);
			return room;
		}

		// Create update object - only include fields that exist in the schema
		const updateObj = {
			roomStatus: false,
			participants: [],
			updated_at: new Date().toISOString(),
		};

		console.log(`[CLOSE_ROOM_SIMPLE] Updating room with:`, updateObj);

		// Update the room
		const { data, error } = await supabase
			.from("rooms")
			.update(updateObj)
			.eq("id", room.id)
			.select()
			.single();

		if (error) {
			console.error(`[CLOSE_ROOM_SIMPLE] Error closing room:`, error);
			return null;
		}

		console.log(`[CLOSE_ROOM_SIMPLE] Room ${roomId} successfully closed:`, {
			id: data.id,
			roomId: data.roomId,
			roomStatus: data.roomStatus,
			participants: data.participants?.length || 0,
		});
		return data;
	} catch (error) {
		console.error(`[CLOSE_ROOM_SIMPLE] Unexpected error:`, error);
		return null;
	}
}
