import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import { getUserId } from "@/app/utils/supabase/lib/supabaseGetUserId";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const roomId = searchParams.get("roomId");
		const userId = searchParams.get("userId");
		const created_by = searchParams.get("created_by");

		console.log("[DEBUG-HOST] Request parameters:", {
			roomId,
			userId,
			created_by,
		});

		if (!roomId || !userId) {
			return NextResponse.json(
				{ error: "Missing roomId or userId" },
				{ status: 400 }
			);
		}

		console.log(
			`[DEBUG-HOST] Checking host status for roomId: ${roomId}, userId: ${userId}`
		);

		// Get room information
		const { data: room, error: roomError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		console.log(
			"[DEBUG-HOST] Room retrieved:",
			room
				? {
						id: room.id,
						roomId: room.roomId,
						created_by: room.created_by,
					}
				: "Not found"
		);

		console.log("room.created_by", room.created_by);
		console.log("\n\n[DEBGUG-HOST] UserId", userId);
		console.log("\n\n[DEBGUG-HOST] room.created_by", room.created_by);
		if (roomError || !room) {
			console.log(
				`[DEBUG-HOST] Room not found: ${roomError?.message} debug host detection`
			);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		// Try to get the actual authenticated user ID for a more secure check
		let authenticatedUserId = null;
		try {
			authenticatedUserId = await getUserId();
			console.log("[DEBUG-HOST] Authenticated user ID:", authenticatedUserId);
		} catch (authError) {
			console.error(
				"[DEBUG-HOST] Error getting authenticated user ID:",
				authError
			);
		}

		// Improved host detection logic:
		// 1. First priority: Check if authenticated user ID matches room.created_by
		// 2. Second priority: Check if userId matches room.created_by
		// 3. Fallback: Check if create_by matches room.created_by (less secure)

		let isHost = false;
		let matchType = "none";

		if (authenticatedUserId && room.created_by === authenticatedUserId) {
			isHost = true;
			matchType = "auth_id_match";
		} else if (room.created_by === userId) {
			isHost = true;
			matchType = "user_id_match";
		} else if (created_by && room.created_by === created_by) {
			isHost = true;
			matchType = "param_match";
		}
		const matchUUID = room.created_by === created_by;
		console.log("[DEBUG-HOST] Match UUID:", matchUUID, "room.created_by:", room.created_by, "created_by:", created_by);
		// Check if this is the last participant
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];
		const isLastParticipant = participants.length <= 1;
		const participantIds = participants.map((p: string) => {
			const parts = p.split(":");
			return parts[0];
		});

		console.log(
			`[DEBUG-HOST] Host detection result for ${userId}: ${isHost ? "IS HOST" : "NOT HOST"}`,
			{
				created_by: room.created_by,
				userId: userId,
				authId: authenticatedUserId,
				matchType,
				isLastParticipant: isLastParticipant,
				participantCount: participants.length,
			}
		);

		return NextResponse.json({
			isHost: isHost,
			isLastParticipant: isLastParticipant,
			matchType,
			debugInfo: {
				room: {
					id: room.id,
					roomId: room.roomId,
					created_by: room.created_by,
					created_at: room.created_at,
				},
				userInfo: {
					userId,
					authenticatedUserId,
				},
				isMatch: isHost,
				matchType,
				participantIds: participantIds,
				participantCount: participants.length,
			},
		});
	} catch (error) {
		console.error("[DEBUG-HOST] Unexpected error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
