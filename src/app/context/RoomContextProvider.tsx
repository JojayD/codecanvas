import React, { createContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const RoomContext = createContext<any>(null);

export const RoomContextProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [room, setRoom] = useState<any>(null);
	const [currentUser, setCurrentUser] = useState<any>(null);
	const [authUserId, setAuthUserId] = useState<string | null>(null);

	// Fetch the authenticated user ID on mount
	useEffect(() => {
		const getAuthUserId = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				const id = data?.session?.user?.id || null;
				setAuthUserId(id);
			} catch (error) {
				console.error("[Room] Error getting auth user ID:", error);
			}
		};

		getAuthUserId();
	}, []);

	// Function to leave a room, which will close the room if no participants remain
	const leaveRoom = useCallback(async () => {
		if (!room) {
			return;
		}

		const roomId = room.roomId || room.id;
		const userId = currentUser?.userId;

		console.log(`[ROOM-CONTEXT] Leaving room ${roomId}`);

		try {
			// Use the standard leave-room API which will close the room if no participants remain
			const leaveResponse = await fetch(`/api/leave-room/${roomId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser.userId,
					authUserId: authUserId,
				}),
			});

			if (!leaveResponse.ok) {
				console.error(
					`[ROOM-CONTEXT] Failed to leave room: ${leaveResponse.status}`
				);
			} else {
				const leaveData = await leaveResponse.json();
				console.log(`[ROOM-CONTEXT] Successfully left room:`, leaveData);

				// Don't set room to null immediately to allow real-time subscription to update first
				setTimeout(() => {
					setRoom(null);
				}, 500);
			}
		} catch (error) {
			console.error(`[ROOM-CONTEXT] Error in leave operation:`, error);
		}
	}, [room, currentUser, authUserId]);

	return (
		<RoomContext.Provider
			value={{ room, setRoom, currentUser, setCurrentUser, leaveRoom, authUserId }}
		>
			{children}
		</RoomContext.Provider>
	);
};
