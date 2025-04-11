import { NextRequest, NextResponse } from "next/server";
import { leaveRoom, handleHostExit } from "@/lib/supabaseRooms";

// Support both GET and POST methods for flexibility
export async function GET(request: NextRequest) {
	return handleLeaveRoom(request);
}

export async function POST(request: NextRequest) {
	return handleLeaveRoom(request);
}

async function handleLeaveRoom(request: NextRequest) {
	try {
		// Extract roomId and userId from query parameters or body
		let roomId, userId, checkForHostExit;

		if (request.method === "POST") {
			// For POST requests, extract from body
			const body = await request.json();
			roomId = body.roomId;
			userId = body.userId;
			checkForHostExit = body.checkForHostExit === true;
		} else {
			// For GET requests, extract from query params
			const searchParams = request.nextUrl.searchParams;
			roomId = searchParams.get("roomId");
			userId = searchParams.get("userId");
			checkForHostExit = searchParams.get("checkForHostExit") === "true";
		}

		// Extract roomId from URL path if not provided in query/body
		if (!roomId) {
			const urlParts = request.nextUrl.pathname.split("/");
			const lastPart = urlParts[urlParts.length - 1];
			if (lastPart && lastPart !== "leave-room") {
				roomId = lastPart;
			}
		}

		console.log(
			`[LEAVE-ROOM API] Received request to leave roomId: ${roomId}, userId: ${userId}, checkForHostExit: ${checkForHostExit}`
		);

		// Validate parameters
		if (!roomId || !userId) {
			return NextResponse.json(
				{ error: "Missing required parameters: roomId and userId" },
				{ status: 400 }
			);
		}

		// If checkForHostExit is true, explicitly call handleHostExit first
		if (checkForHostExit) {
			console.log(
				`[LEAVE-ROOM API] Directly checking if user ${userId} is host of room ${roomId}`
			);

			// Try to process host exit first - this now uses our fixed logic
			const hostExitResult = await handleHostExit(roomId, userId);

			if (hostExitResult) {
				console.log(
					`[LEAVE-ROOM API] User ${userId} WAS identified as the host and room ${roomId} was closed`
				);
				return NextResponse.json(
					{
						success: true,
						message: "Room closed - host has left",
						wasHostExit: true,
					},
					{ status: 200 }
				);
			}

			console.log(
				`[LEAVE-ROOM API] User ${userId} was NOT identified as the host of room ${roomId}, proceeding with normal leave`
			);
		}

		// Call the leaveRoom function to update the database
		// Pass false for checkForHostExit since we've already done that check above
		console.log(
			`[LEAVE-ROOM API] User ${userId} is leaving room ${roomId}, checkForHostExit: ${checkForHostExit}`
		);
		const result = await leaveRoom(roomId, userId, false);

		if (result) {
			// Double-check if the room was closed (which would happen only if the host left)
			const wasHostExit =
				result.roomStatus === false &&
				Array.isArray(result.participants) &&
				result.participants.length === 0;

			return NextResponse.json(
				{
					success: true,
					message: wasHostExit
						? "Room closed - host has left"
						: "Successfully left room",
					wasHostExit,
				},
				{ status: 200 }
			);
		} else {
			return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
		}
	} catch (error) {
		console.error("[LEAVE-ROOM API] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
