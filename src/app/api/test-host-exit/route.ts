import { NextRequest, NextResponse } from "next/server";
import { handleHostExit, getRoom } from "@/lib/supabaseRooms";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

export async function GET(request: NextRequest) {
	// Extract roomId and userId from query parameters
	console.log("Testing host exit request", request);
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
		console.log(
			`[TEST API] Testing host exit for user ${userId} in room ${roomId}`
		);

		// Get room data first
		const room = await getRoom(roomId);
		if (!room) {
			return NextResponse.json(
				{
					error: "Room not found",
				},
				{ status: 404 }
			);
		}

		// Get current auth user if available
		let authUser = null;
		try {
			const { data } = await supabase.auth.getUser();
			authUser = data?.user;
		} catch (e) {
			console.log("[TEST API] No auth user available");
		}

		// Extract base userId without username part
		let baseUserId = userId;
		const colonIndex = userId.indexOf(":");
		if (colonIndex > 0) {
			baseUserId = userId.substring(0, colonIndex);
		}

		// Perform host detection checks manually
		const isAuthUserCreator =
			authUser &&
			(room.created_by === authUser.id || room.createdBy === authUser.id);

		const isDirectMatch =
			room.created_by === userId ||
			room.createdBy === userId ||
			room.created_by === baseUserId ||
			room.createdBy === baseUserId;

		const localStorageUserId =
			typeof window !== "undefined" ? localStorage.getItem("userId") : null;

		const isLocalStorageMatch =
			localStorageUserId &&
			(room.created_by === localStorageUserId ||
				room.createdBy === localStorageUserId);

		const isLocalStorageCreator =
			baseUserId === localStorageUserId &&
			((room.created_by && !room.created_by.includes("@")) ||
				(room.createdBy && !room.createdBy.includes("@")));

		const isTestHost = userId.startsWith("test-host-");

		const participants = Array.isArray(room.participants)
			? room.participants
			: [];
		const isLastParticipant = participants.length <= 1;

		const isHost =
			isAuthUserCreator ||
			isDirectMatch ||
			isLocalStorageMatch ||
			isLocalStorageCreator;

		// Get the actual result from handleHostExit
		const hostExitResult = await handleHostExit(roomId, userId);

		const detectionDetails = {
			roomId,
			created_by: room.created_by,
			createdBy: room.createdBy,
			userId,
			baseUserId,
			authUserId: authUser?.id,
			isAuthUserCreator,
			isDirectMatch,
			isLocalStorageMatch,
			isLocalStorageCreator,
			isTestHost,
			isLastParticipant,
			participantCount: participants.length,
		};

		console.log(`[TEST API] Host detection details:`, detectionDetails);

		if (hostExitResult) {
			console.log(
				`[TEST API] User ${userId} WAS identified as host, room ${roomId} was closed`
			);
			return NextResponse.json(
				{
					success: true,
					message: "Host exit detected and room closed",
					wasHostExit: true,
					details: detectionDetails,
				},
				{ status: 200 }
			);
		} else {
			console.log(
				`[TEST API] User ${userId} was NOT identified as host for room ${roomId}`
			);
			return NextResponse.json(
				{
					success: true,
					message: "User is not host, room not closed",
					wasHostExit: false,
					details: detectionDetails,
				},
				{ status: 200 }
			);
		}
	} catch (error) {
		console.error("[TEST API] Error testing host exit:", error);
		return NextResponse.json(
			{
				error: "Error testing host exit",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
