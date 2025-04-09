import { NextRequest, NextResponse } from "next/server";
import { leaveRoom, handleHostExit } from "@/lib/supabaseRooms";

export async function GET(request: NextRequest) {
	// Extract roomId and userId from query parameters
	const searchParams = request.nextUrl.searchParams;
	const roomId = searchParams.get("roomId");
	const userId = searchParams.get("userId");

	// Get the checkForHostExit parameter, defaulting to false
	const checkForHostExit = searchParams.get("checkForHostExit") === "true";

	// Validate parameters
	if (!roomId || !userId) {
		return NextResponse.json(
			{ error: "Missing required parameters: roomId and userId" },
			{ status: 400 }
		);
	}

	try {
		// If checkForHostExit is true, explicitly call handleHostExit first
		if (checkForHostExit) {
			console.log(
				`API: Directly checking if user ${userId} is host of room ${roomId}`
			);

			// Try to process host exit first
			const hostExitResult = await handleHostExit(roomId, userId);

			if (hostExitResult) {
				console.log(
					`API: User ${userId} WAS the host and room ${roomId} was closed`
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
				`API: User ${userId} was NOT the host of room ${roomId}, proceeding with normal leave`
			);
		}

		// Call the leaveRoom function to update the database
		console.log(
			`API: User ${userId} is leaving room ${roomId} via API call, checkForHostExit: ${checkForHostExit}`
		);
		const result = await leaveRoom(roomId, userId, false); // Pass false because we already checked for host exit above

		if (result) {
			// Double-check if the room was closed (which typically means the host left)
			// We use roomStatus === false and empty participants list as indicators
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
		console.error("Error in leave-room API:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
