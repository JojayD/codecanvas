import React, { createContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

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

	// Function to leave a room, which will check host status and close the room if needed
	const leaveRoom = useCallback(async () => {
		if (!room) {
			return;
		}

		const roomId = room.roomId || room.id;
		const userId = currentUser?.userId;

		// Check if user is host before leaving
		try {
			// Build URL with all necessary parameters for host detection
			let debugUrl = `/api/debug-host-detection?roomId=${roomId}&userId=${encodeURIComponent(currentUser.userId)}`;

			// Always include room.created_by if available
			if (room.created_by) {
				debugUrl += `&created_by=${encodeURIComponent(room.created_by)}`;
			}

			// Include auth user ID if available
			if (authUserId) {
				debugUrl += `&authUserId=${encodeURIComponent(authUserId)}`;
			}

			// Call the debug endpoint
			const debugResponse = await fetch(debugUrl);
			const debugData = await debugResponse.json();

			// Check if user is host or last participant
			if (debugData.isHost) {
				// Only trigger closure if user is the actual host
				try {
					// Use the force-close-room API to close the room
					const closeResponse = await fetch("/api/force-close-room", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							roomId: roomId,
							userId: currentUser.userId,
							authUserId: authUserId,
							matchType: debugData.matchType,
						}),
					});

					if (!closeResponse.ok) {
						const errorData = await closeResponse.json();
					} else {
						const closeData = await closeResponse.json();
						setRoom(null);
						return;
					}
				} catch (closeError) {
					// Error handling
				}
			} else {
				// User is not host, proceed with normal participant removal
			}
		} catch (error) {
			// Error handling
		}

		// Standard leave procedure if not host or if force close failed
		try {
			// For non-host users, use the leave-room API which properly updates participants list
			const leaveResponse = await fetch(`/api/leave-room/${roomId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					roomId,
					userId: currentUser.userId,
					checkForHostExit: false, // Explicitly set to false for non-host users
				}),
			});

			if (!leaveResponse.ok) {
				// Handle error
			} else {
				const leaveData = await leaveResponse.json();
				// Don't set room to null immediately to allow real-time subscription to update first
				setTimeout(() => {
					setRoom(null);
				}, 500);
			}
		} catch (error) {
			// Handle error
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
