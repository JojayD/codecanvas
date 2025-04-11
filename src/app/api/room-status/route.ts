import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
			.select("roomId, status, created_by, created_at")
			.eq("roomId", roomId)
			.single();

		if (error) {
			console.log(`[ROOM-STATUS] Error fetching room ${roomId}: ${error.message}`);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		// Get participants

		return NextResponse.json({
			room: {
				id: room.roomId,
				status: room.status,
				created_by: room.created_by,
				created_at: room.created_at,
			},
			isActive: room.status === "active",
		});
	} catch (error) {
		console.error("[ROOM-STATUS] Unexpected error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
