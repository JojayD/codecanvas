import { NextRequest, NextResponse } from "next/server";
import { leaveRoom, handleHostExit } from "@/lib/supabaseRooms";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

// Fix: Use the correct context type for Next.js App Router
type RouteContext = {
	params: {
		roomId: string;
	};
};

export async function POST(request: NextRequest, context: RouteContext) {
	try {
		// Get the roomId from the URL params (dynamic route)
		const roomId = context.params.roomId;
		console.log(`Dynamic route handler activated for roomId: ${roomId}`);

		// Get body data
		let bodyData: {
			userId?: string;
			checkForHostExit?: boolean;
		} = {};

		try {
			bodyData = await request.json();
			console.log("POST body received:", bodyData);
		} catch (e) {
			console.error("Failed to parse POST body:", e);
			return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		// Extract user ID and host check flag
		const { userId, checkForHostExit = false } = bodyData;

		// Validate parameters
		if (!roomId || !userId) {
			return NextResponse.json(
				{ error: "Missing required parameters: roomId and userId" },
				{ status: 400 }
			);
		}

		// Get room information for validation
		const { data: room, error: roomError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		if (roomError) {
			console.error(`Room not found error: ${roomError.message}`);
			return NextResponse.json(
				{
					error: "Room not found",
					details: roomError.message,
				},
				{ status: 404 }
			);
		}

		console.log(
			`Found room: ${room.id} (${room.roomId}), checking if user ${userId} is host`
		);

		// If checkForHostExit is true, explicitly call handleHostExit first
		if (checkForHostExit) {
			console.log("Checking if user is the host before leaving");

			// Try to process host exit first
			const hostExitResult = await handleHostExit(roomId, userId);

			if (hostExitResult) {
				console.log("Host exit detected - room has been closed");
				return NextResponse.json(
					{
						success: true,
						message: "Room closed - host has left",
						wasHostExit: true,
					},
					{ status: 200 }
				);
			}
		}

		// Remove user from the room's participants list
		console.log(`Removing user ${userId} from room ${roomId} participants list`);
		const result = await leaveRoom(roomId, userId, false);

		if (result) {
			// Check if the room was closed
			const wasHostExit =
				result.roomStatus === false &&
				Array.isArray(result.participants) &&
				result.participants.length === 0;

			console.log("Leave room result:", {
				wasHostExit,
				roomStatus: result.roomStatus,
				participantsCount: Array.isArray(result.participants)
					? result.participants.length
					: 0,
				participants: result.participants,
			});

			return NextResponse.json(
				{
					success: true,
					message: wasHostExit
						? "Room closed - host has left"
						: "Successfully left room",
					wasHostExit,
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
