import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

/**
 * Set the user's active room - ensure a user can only be in one room at a time
 * @param userId The user's UUID
 * @param roomId The room ID to set as active, or null to clear
 * @returns Whether the operation was successful
 */
export async function setUserActiveRoom(
	userId: string,
	roomId: string | number | null,
	createdAt?: string,
): Promise<boolean> {

	console.log("Setting user active room:", userId, roomId, createdAt);
	try {
		if (!userId) {
			console.error("Cannot set active room: No user ID provided");
			return false;
		}

		// Check if user profile exists
	const { data: existingProfile } = await supabase
			.from("user_profiles")
			.select("*")
			.eq("user_id", userId)
			.single();

		if (existingProfile) {
			// Update existing profile
			const { error } = await supabase
				.from("user_profiles")
				.update({ active_room_id: roomId })
				.eq("user_id", userId);

			if (error) {
				console.error("Error updating user active room:", error);
				return false;
			}
		} else {
			// Create new profile
			const { error } = await supabase.from("user_profiles").insert([
				{
					user_id: userId,
					active_room_id: roomId,
					created_at: createdAt,
				},
			]);

			if (error) {
				console.error("Error creating user profile with active room:", error);
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error("Error setting user active room:", error);
		return false;
	}
}

/**
 * Get the user's active room
 * @param userId The user's UUID
 * @returns The active room ID or null if none
 */
export async function getUserActiveRoom(
	userId: string
): Promise<string | number | null> {
	try {
		if (!userId) {
			console.error("Cannot get active room: No user ID provided");
			return null;
		}

		const { data, error } = await supabase
			.from("user_profiles")
			.select("active_room_id")
			.eq("user_id", userId)
			.single();

		if (error) {
			console.error("Error getting user active room:", error);
			return null;
		}

		return data?.active_room_id || null;
	} catch (error) {
		console.error("Error getting user active room:", error);
		return null;
	}
}

/**
 * Check if user is already in a different room
 * @param userId The user's UUID
 * @param targetRoomId The room ID the user is trying to join
 * @returns Object with information about active room status
 */
export async function checkUserActiveRoom(
	uuid: string,
	targetRoomId: string | number
): Promise<{
	canJoin: boolean;
	activeRoomId: string | number | null;
	message: string;
}> {
	try {
		const activeRoomId = await getUserActiveRoom(uuid);

		if (!activeRoomId) {
			return {
				canJoin: true,
				activeRoomId: null,
				message: "User has no active room",
			};
		}

		// Check if the active room is the one we're trying to join
		if (activeRoomId.toString() === targetRoomId.toString()) {
			return {
				canJoin: true,
				activeRoomId,
				message: "User is already in this room",
			};
		}

		// User is in a different room
		return {
			canJoin: false,
			activeRoomId,
			message: `User is already in room ${activeRoomId}`,
		};
	} catch (error) {
		console.error("Error checking user active room:", error);
		// In case of error, allow joining as a failsafe
		return {
			canJoin: true,
			activeRoomId: null,
			message: "Error checking active room, allowing join",
		};
	}
}
