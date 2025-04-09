import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/supabaseRooms";

export async function GET(request: NextRequest) {
	// Extract roomId from query parameters
	const searchParams = request.nextUrl.searchParams;
	const roomId = searchParams.get("roomId");

	// Validate parameters
	if (!roomId) {
		return NextResponse.json(
			{ error: "Missing required parameter: roomId" },
			{ status: 400 }
		);
	}

	try {
		// Call the getRoom function to get the room status
		console.log(`API: Checking status of room ${roomId} via API call`);
		const room = await getRoom(roomId);

		if (room) {
			return NextResponse.json(
				{
					success: true,
					roomStatus: room.roomStatus,
					participantsCount: (room.participants || []).length,
					participants: room.participants,
				},
				{ status: 200 }
			);
		} else {
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}
	} catch (error) {
		console.error("Error in room-status API:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
