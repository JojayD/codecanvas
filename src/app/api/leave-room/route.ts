import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/supabaseRooms";

export async function GET(request: NextRequest) {
	// Extract roomId and userId from query parameters
	const searchParams = request.nextUrl.searchParams;
	const roomId = searchParams.get("roomId");
	const userId = searchParams.get("userId");

	// Validate parameters
	if (!roomId || !userId) {
		return NextResponse.json(
			{ error: "Missing required parameters: roomId and userId" },
			{ status: 400 }
		);
	}

	try {
		// Call the leaveRoom function to update the database
		console.log(`API: User ${userId} is leaving room ${roomId} via API call`);
		const result = await leaveRoom(roomId, userId);

		if (result) {
			return NextResponse.json(
				{ success: true, message: "Successfully left room" },
				{ status: 200 }
			);
		} else {
			return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
		}
	} catch (error) {
		console.error("Error in leave-room API:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
