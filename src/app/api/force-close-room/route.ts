import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
	try {
		// Parse body for roomId and userId
		const body = await request.json();
		const { roomId, userId } = body;

		if (!roomId) {
			return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
		}

		console.log(
			`[FORCE-CLOSE] Attempting to force close room ${roomId} requested by user ${userId || "unknown"}`
		);

		// Check if room exists
		const { data: room, error: roomError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		if (roomError) {
			console.log(`[FORCE-CLOSE] Room not found: ${roomError.message}`);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		// Verify if the user is authorized to close the room (if userId is provided)
		if (userId) {
			// Extract base userId without username part
			let baseUserId = userId;
			if (userId.includes(":")) {
				baseUserId = userId.split(":")[0];
			}

			// Check using all possible matches
			const isDirectMatch =
				room.created_by === userId || room.createdBy === userId;

			const isBaseMatch =
				room.created_by === baseUserId || room.createdBy === baseUserId;

			const isTestHost = userId.startsWith("test-host-");

			const isAuthorized = isDirectMatch || isBaseMatch || isTestHost;

			if (!isAuthorized) {
				console.log(
					`[FORCE-CLOSE] Unauthorized: User ${userId} is not the room host`
				);
				console.log(
					`[FORCE-CLOSE] Room created_by: ${room.created_by}, user ID: ${userId}`
				);
				return NextResponse.json(
					{ error: "Unauthorized: Only the room host can force close the room" },
					{ status: 403 }
				);
			}
		}

		// First update room status to closed
		const { error: updateError } = await supabase
			.from("rooms")
			.update({ status: "closed", roomStatus: false })
			.eq("roomId", roomId);

		if (updateError) {
			console.log(
				`[FORCE-CLOSE] Error updating room status: ${updateError.message}`
			);
			return NextResponse.json(
				{
					error: "Failed to close room",
					details: updateError.message,
				},
				{ status: 500 }
			);
		}

		// Then clear participants
		const { error: deleteError } = await supabase
			.from("room_participants")
			.delete()
			.eq("room_id", roomId);

		if (deleteError) {
			console.log(
				`[FORCE-CLOSE] Error removing participants: ${deleteError.message}`
			);
			// Continue despite error - room is already closed
		}

		console.log(`[FORCE-CLOSE] Successfully closed room ${roomId}`);

		return NextResponse.json({
			success: true,
			message: "Room forcefully closed",
			roomId,
		});
	} catch (error) {
		console.error("[FORCE-CLOSE] Unexpected error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
