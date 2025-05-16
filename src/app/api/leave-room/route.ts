import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/supabaseRooms";

// Define types for the request body
interface LeaveRoomRequestBody {
	roomId?: string;
	userId?: string;
}

export async function POST(req: NextRequest) {
	try {
		console.log("Leave room API called");

		// Get body data with proper typing
		let bodyData: LeaveRoomRequestBody = {};

		try {
			bodyData = await req.json();
			console.log("POST body received:", bodyData);
		} catch (e) {
			console.error("Failed to parse POST body:", e);
			return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		// Extract parameters
		const roomId = bodyData.roomId || "";
		const userId = bodyData.userId || "";

		// Validate parameters
		if (!roomId || !userId) {
			return NextResponse.json(
				{ error: "Missing required parameters: roomId and userId" },
				{ status: 400 }
			);
		}

		// Call the simplified leaveRoom function
		const result = await leaveRoom(roomId, userId);

		if (result) {
			// Check if the room was closed (no participants left)
			const roomClosed =
				result.roomStatus === false &&
				(!result.participants ||
					!Array.isArray(result.participants) ||
					result.participants.length === 0);

			console.log("Leave room result:", {
				roomClosed,
				roomStatus: result.roomStatus,
				participantsCount: Array.isArray(result.participants)
					? result.participants.length
					: 0,
				participants: result.participants,
			});

			return NextResponse.json(
				{
					success: true,
					message: roomClosed
						? "Room closed - no participants left"
						: "Successfully left room",
					roomClosed,
					participants: result.participants,
				},
				{ status: 200 }
			);
		} else {
			return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
		}
	} catch (error) {
		console.error("Error in leave-room API:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
