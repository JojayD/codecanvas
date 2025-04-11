import React, { createContext, useState, useCallback } from "react";

export const RoomContext = createContext<any>(null);

export const RoomContextProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [room, setRoom] = useState<any>(null);
	const [currentUser, setCurrentUser] = useState<any>(null);

	const leaveRoom = useCallback(async () => {
		if (!room) {
			console.log("[Room] No room to leave");
			return;
		}

		const roomId = room.roomId;
		console.log(`[Room] Attempting to leave room: ${roomId}`);

		// Check if user is host before leaving
		try {
			// Build URL with all necessary parameters for host detection
			let debugUrl = `/api/debug-host-detection?roomId=${roomId}&userId=${encodeURIComponent(currentUser.userId)}`;

			// Always include room.created_by if available
			if (room.created_by) {
				debugUrl += `&created_by=${encodeURIComponent(room.created_by)}`;
			}

			// Log the URL for debugging
			console.log(`[Room] Checking host status with: ${debugUrl}`);

			// Call the debug endpoint
			const debugResponse = await fetch(debugUrl);
			const debugData = await debugResponse.json();

			console.log("[Room] Host detection result:", debugData);

			// Check if user is host or last participant
			if (debugData.isHost || debugData.isLastParticipant) {
				console.log(
					`[Room] User ${currentUser.userId} is ${debugData.isHost ? "host" : "last participant"}, match type: ${debugData.matchType || "not specified"}, force closing room: ${roomId}`
				);

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
							matchType: debugData.matchType,
						}),
					});

					if (!closeResponse.ok) {
						console.error(
							`[Room] Failed to force close room: ${closeResponse.status}`
						);
						const errorData = await closeResponse.json();
						console.error("[Room] Force close error:", errorData);
					} else {
						console.log("[Room] Room successfully force closed");
						setRoom(null);
						return;
					}
				} catch (closeError) {
					console.error("[Room] Error during force close:", closeError);
				}
			} else {
				console.log(
					`[Room] User ${currentUser.userId} is not detected as host or last participant`
				);
			}
		} catch (error) {
			console.error("[Room] Error during host check:", error);
		}

		// Standard leave procedure if not host or if force close failed
		console.log(
			`[Room] Executing standard leave for roomId: ${roomId}, userId: ${currentUser.userId}`
		);
		try {
			const leaveResponse = await fetch(
				`/api/leave-room?roomId=${roomId}&userId=${encodeURIComponent(currentUser.userId)}`
			);

			if (!leaveResponse.ok) {
				console.error(`[Room] Failed to leave room: ${leaveResponse.status}`);
				const errorData = await leaveResponse.json();
				console.error("[Room] Leave error:", errorData);
			} else {
				console.log("[Room] Left room successfully");
				setRoom(null);
			}
		} catch (leaveError) {
			console.error("[Room] Error during leave room:", leaveError);
		}
	}, [currentUser, room, setRoom]);

	return (
		<RoomContext.Provider
			value={{ room, setRoom, currentUser, setCurrentUser, leaveRoom }}
		>
			{children}
		</RoomContext.Provider>
	);
};
