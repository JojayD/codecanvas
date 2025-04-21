import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/supabaseRooms";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/lib/database.types";
import { Room, supabase } from "@/lib/supabase";
import { supabaseAdmin } from '@/lib/supabaseAdmin.server';

// Define types for the request body
interface LeaveRoomRequestBody {
  userId?: string;
}

// Simplified handler pattern for leaving a room
export async function POST(req: NextRequest) {
  try {
    // First get the room ID from the URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/");
    const roomId = pathSegments[pathSegments.length - 1];
    const roomIdNumber = parseInt(roomId, 10);

    console.log(`[[route.ts]]Leave room API activated for roomId: ${roomId}`);
    console.log({ rawUrl: req.url, extractedRoomId: roomId, parsed: parseInt(roomId) });

    // Get body data
    const bodyData = await req.json();
    const userId = bodyData.userId || "";
    console.log("POST body received:", bodyData);

    // Get room data with the authenticated client
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("roomId", roomIdNumber)
      .single();

    if (roomError) {
      console.error(`[[route.ts]]Room not found error: ${roomError.message}`);
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    
    console.log("Room data:", room);

    // Call the simplified leaveRoom function with a type assertion to handle database type differences
    const result = await leaveRoom(roomId, userId, false, false, undefined, room as Room, supabase);

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