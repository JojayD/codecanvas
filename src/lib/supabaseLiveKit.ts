import { LivekitRoom } from "./supabase";
import { CreateLivekitRoomPayload } from "./supabase";
import { supabase } from "./supabase";

export async function createLivekitRoom(
	roomId: number
): Promise<LivekitRoom | null> {
	try {

		const { data, error } = await supabase
			.from("livekit")
			.insert([{
				room_id: roomId,
				created_at: new Date().toISOString(),
			}])
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error creating livekit room:", error);
		return null;
	}
}

export async function getLivekitRoom(roomId: number): Promise<LivekitRoom | null> {
	const { data, error } = await supabase
		.from("livekit")
		.select("*")
		.eq("room_id", roomId)
		.single();
      
	if (error) throw error;
	return data;
}



