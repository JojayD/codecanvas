/**
 * A simplified version of closeRoom function for testing roomStatus updates
 */
import { supabase } from "@/lib/supabase";
import { getRoom } from "./supabaseRooms";

export async function closeRoomSimple(roomId) {
	try {
		console.log(`🚪 Attempting to close room: ${roomId}`);

		// Check if room exists
		const room = await getRoom(roomId);
		if (!room) {
			console.error(`🚪 Failed to close room: Room ${roomId} not found`);
			return null;
		}

		console.log(`🚪 Room before closure:`, {
			id: room.id,
			roomId: room.roomId,
			roomStatus: room.roomStatus,
			participants: room.participants,
		});

		// Update the room - explicitly set roomStatus to false
		const { data: updatedRoom, error } = await supabase
			.from("rooms")
			.update({
				roomStatus: false,
				participants: [],
				updated_at: new Date().toISOString(),
			})
			.match({ roomId })
			.select()
			.single();

		if (error) {
			console.error(`🚪 Error closing room: ${error.message}`);
			return null;
		}

		console.log(`🚪 Room successfully closed. Updated room:`, {
			id: updatedRoom.id,
			roomId: updatedRoom.roomId,
			roomStatus: updatedRoom.roomStatus,
			participants: updatedRoom.participants,
		});

		return updatedRoom;
	} catch (error) {
		console.error(`🚪 Exception in closeRoomSimple: ${error.message}`);
		return null;
	}
}
