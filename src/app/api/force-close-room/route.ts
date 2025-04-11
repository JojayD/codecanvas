import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { closeRoom } from "@/lib/supabaseRooms";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
	try {
		// Parse body for roomId and userId
		const body = await request.json();
		const { roomId, userId, matchType } = body;

		console.log("[FORCE-CLOSE] Request received:", {
			roomId,
			userId,
			matchType,
			timestamp: new Date().toISOString(),
		});

		if (!roomId) {
			console.error("[FORCE-CLOSE] Missing roomId parameter");
			return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
		}

		// Check if room exists
		console.log(`[FORCE-CLOSE] Fetching room data for roomId: ${roomId}`);
		const { data: room, error: roomError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		if (roomError) {
			console.error(`[FORCE-CLOSE] Room not found: ${roomError.message}`);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		console.log(`[FORCE-CLOSE] Room found:`, {
			id: room.id,
			roomId: room.roomId,
			created_by: room.created_by,
			participants: Array.isArray(room.participants)
				? room.participants.length
				: 0,
		});

		// Authorization check - only allow the host to close the room
		if (userId) {
			const isAuthorized = room.created_by === userId;
			console.log(
				`[FORCE-CLOSE] Authorization check: created_by=${room.created_by}, userId=${userId}, isAuthorized=${isAuthorized}`
			);

			// If not authorized, reject the request
			if (!isAuthorized) {
				console.error(
					`[FORCE-CLOSE] User ${userId} is not authorized to close room ${roomId}`
				);
				return NextResponse.json(
					{
						error: "Not authorized to close this room",
						isHost: false,
					},
					{ status: 403 }
				);
			}
		} else {
			// No userId provided - require additional verification for security
			console.log(
				`[FORCE-CLOSE] No userId provided, checking matchType: ${matchType}`
			);

			// Only allow force close without userId if matchType indicates host verification happened elsewhere
			if (
				matchType !== "auth_id_match" &&
				matchType !== "user_id_match" &&
				matchType !== "param_match"
			) {
				console.error(`[FORCE-CLOSE] Invalid matchType: ${matchType}`);
				return NextResponse.json(
					{
						error: "Cannot verify host status",
						isHost: false,
					},
					{ status: 403 }
				);
			}
		}

		console.log(
			`[FORCE-CLOSE] Authorization successful, proceeding to close room ${roomId}`
		);

		// First ensure roomStatus is set to false
		console.log(
			`[FORCE-CLOSE] Updating room status to closed and clearing participants`
		);
		const { error: updateError } = await supabase
			.from("rooms")
			.update({
				roomStatus: false,
				status: "closed",
				participants: [], // Clear participants array
				updated_at: new Date().toISOString(),
				closed_at: new Date().toISOString(),
			})
			.eq("roomId", roomId);

		if (updateError) {
			console.error(`[FORCE-CLOSE] Error updating room: ${updateError.message}`);
			return NextResponse.json(
				{
					error: "Failed to close room",
					details: updateError.message,
				},
				{ status: 500 }
			);
		}

		// Also attempt to call the closeRoom function from supabaseRooms.ts for thoroughness
		try {
			console.log(
				`[FORCE-CLOSE] Calling closeRoom function for additional cleanup`
			);
			await closeRoom(roomId);
		} catch (closeError) {
			console.warn(
				`[FORCE-CLOSE] Non-critical error in closeRoom: ${closeError instanceof Error ? closeError.message : "Unknown error"}`
			);
			// Continue despite this error since we already updated the room above
		}

		// Verify the room was closed properly
		console.log(`[FORCE-CLOSE] Verifying room closure`);
		const { data: verifyRoom } = await supabase
			.from("rooms")
			.select("roomStatus, participants")
			.eq("roomId", roomId)
			.single();

		const verificationResult = {
			roomStatus: verifyRoom?.roomStatus === false ? "closed" : "unknown",
			participantsCleared:
				Array.isArray(verifyRoom?.participants) &&
				verifyRoom.participants.length === 0,
		};

		console.log(
			`[FORCE-CLOSE] Room ${roomId} successfully closed:`,
			verificationResult
		);

		return NextResponse.json({
			success: true,
			message: "Room forcefully closed",
			roomId,
			verificationStatus: verificationResult,
		});
	} catch (error) {
		console.error(`[FORCE-CLOSE] Unexpected error:`, error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
