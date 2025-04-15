import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

export async function GET(request: NextRequest) {
	try {
		// Get roomId from query parameters
		const searchParams = request.nextUrl.searchParams;
		const roomId = searchParams.get("roomId");

		if (!roomId) {
			return NextResponse.json(
				{ error: "Missing roomId parameter" },
				{ status: 400 }
			);
		}

		console.log(`[ROOM-STATUS] Checking status for room: ${roomId}`);

		// Get room from database
		const { data: room, error } = await supabase
			.from("rooms")
			.select("roomId, roomStatus, created_at")
			.eq("roomId", roomId)
			.single();

		if (error) {
			console.log(`[ROOM-STATUS] Error fetching room ${roomId}: ${error.message}`);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		return NextResponse.json({
			room: {
				id: room.roomId,
				status: room.roomStatus,
				created_at: room.created_at,
			},
			roomStatus: room.roomStatus,
		});
	} catch (error) {
		console.error("[ROOM-STATUS] Unexpected error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
