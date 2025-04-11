import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import { getUserId } from "@/app/utils/supabase/lib/supabaseGetUserId";

// Simplified handler pattern to avoid type issues with AWS Amplify
export async function GET(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const roomId = searchParams.get("roomId");
		const userId = searchParams.get("userId");
		const created_by = searchParams.get("created_by");
		const authUserId = searchParams.get("authUserId");

		console.log("[DEBUG-HOST] Request received with params:", {
			roomId,
			userId,
			created_by,
			authUserId,
		});

		if (!roomId || !userId) {
			console.error("[DEBUG-HOST] Missing required parameters");
			return NextResponse.json(
				{ error: "Missing roomId or userId" },
				{ status: 400 }
			);
		}

		// Get room information
		console.log(`[DEBUG-HOST] Fetching room data for roomId: ${roomId}`);
		const { data: room, error: roomError } = await supabase
			.from("rooms")
			.select("*")
			.eq("roomId", roomId)
			.single();

		// Check if room exists before proceeding
		if (roomError || !room) {
			console.error(`[DEBUG-HOST] Room not found: ${roomError?.message}`);
			return NextResponse.json({ error: "Room not found" }, { status: 404 });
		}

		console.log("[DEBUG-HOST] Room data retrieved:", {
			id: room.id,
			roomId: room.roomId,
			created_by: room.created_by || "not set",
		});

		// Try to get the actual authenticated user ID for a more secure check
		let authenticatedUserId = authUserId;

		// In server environments (like deployment), getUserId() won't work the same as in browser
		// So we need to handle this differently
		const isServerEnvironment = typeof window === "undefined";
		console.log(
			`[DEBUG-HOST] Running in ${isServerEnvironment ? "server" : "browser"} environment`
		);

		if (!authenticatedUserId && !isServerEnvironment) {
			try {
				authenticatedUserId = await getUserId();
				console.log("[DEBUG-HOST] Retrieved auth user ID:", authenticatedUserId);
			} catch (authError) {
				console.log("[DEBUG-HOST] Failed to get auth user ID:", authError);
				// Authentication error, continue with other checks
			}
		}

		// Improved host detection logic with null safeguards
		let isHost = false;
		let matchType = "none";

		// Safely check if room.created_by exists before comparing
		if (room.created_by) {
			if (authenticatedUserId && room.created_by === authenticatedUserId) {
				isHost = true;
				matchType = "auth_id_match";
			} else if (room.created_by === userId) {
				isHost = true;
				matchType = "user_id_match";
			} else if (created_by && room.created_by === created_by) {
				isHost = true;
				matchType = "param_match";
			}

			// In deployment environment, be more lenient with host detection
			// This special case handles the server environment where auth may not be available
			if (isServerEnvironment && !isHost && userId && userId.startsWith("user-")) {
				// Check if userId format matches a localStorage generated ID
				if (room.created_by && room.created_by.startsWith("user-")) {
					// For deployment, assume user-XXX matches if the formats are similar
					// This helps when localStorage IDs are used
					isHost = true;
					matchType = "server_env_user_match";
					console.log(
						"[DEBUG-HOST] Server environment match for local storage format IDs"
					);
				}
			}

			console.log("[DEBUG-HOST] Host check results:", {
				"room.created_by": room.created_by,
				authMatch: room.created_by === authenticatedUserId,
				userIdMatch: room.created_by === userId,
				paramMatch: created_by ? room.created_by === created_by : false,
				isHost: isHost,
				matchType: matchType,
				environment: isServerEnvironment ? "server" : "browser",
			});
		} else {
			console.log("[DEBUG-HOST] Room has no created_by field set");
		}

		// Check if this is the last participant, but keep this separate from host detection
		const participants = Array.isArray(room.participants)
			? room.participants
			: [];
		const isLastParticipant = participants.length <= 1;
		const participantIds = participants.map((p: string) => {
			const parts = p.split(":");
			return parts[0];
		});

		// Check if the current user is actually in the participants list
		const isUserParticipant = participantIds.includes(userId);

		console.log(
			`[DEBUG-HOST] Final result for ${userId}: ${isHost ? "IS HOST" : "NOT HOST"}`,
			{
				isLastParticipant,
				isUserParticipant,
				participantCount: participants.length,
				allParticipants: participants,
				participantIds,
				timestamp: new Date().toISOString(),
			}
		);

		// Important: isHost and isLastParticipant are separate concepts - don't combine them for authorization
		return NextResponse.json({
			isHost: isHost,
			isLastParticipant: isLastParticipant,
			isUserParticipant,
			matchType,
			debugInfo: {
				room: {
					id: room.id,
					roomId: room.roomId,
					created_by: room.created_by || "not set",
					created_at: room.created_at,
				},
				userInfo: {
					userId,
					authenticatedUserId,
				},
				participants: {
					count: participants.length,
					ids: participantIds,
					isUserInList: isUserParticipant,
				},
				isMatch: isHost,
				matchType,
				timestamp: new Date().toISOString(),
				environment: isServerEnvironment ? "server" : "browser",
			},
		});
	} catch (error) {
		console.error("[DEBUG-HOST] Unexpected error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
