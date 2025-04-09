/**
 * Test utility for host exit functionality
 *
 * This file simulates a host leaving a room to test if the room is properly closed
 * and all participants are removed.
 */
import { createRoom, leaveRoom, getRoom, joinRoom } from "./supabaseRooms";

// Function to create a test room with a host and participant
export async function testHostExit() {
	try {
		console.log("STARTING HOST EXIT TEST");

		// 1. Create a test host user
		const hostId = `test-host-${Date.now()}`;
		const hostUsername = "Test Host";

		// 2. Create a test participant
		const participantId = `test-participant-${Date.now()}`;
		const participantUsername = "Test Participant";

		// 3. Create a test room
		console.log("Creating test room with host:", hostId);
		const roomData = {
			name: "Test Room",
			description: "A test room for host exit functionality",
			code: "// Test code",
			participants: [],
			prompt: "Test prompt",
			created_at: new Date().toISOString(),
			created_by: hostId,
			language: "javascript",
			roomStatus: true,
		};

		const newRoom = await createRoom(roomData);
		if (!newRoom) {
			throw new Error("Failed to create test room");
		}

		console.log("Test room created:", {
			id: newRoom.id,
			roomId: newRoom.roomId,
			roomStatus: newRoom.roomStatus,
			created_by: newRoom.created_by,
		});

		// 4. Add the host as a participant
		console.log("Adding host as participant");
		const roomWithHost = await joinRoom(newRoom.roomId, hostId, hostUsername);
		if (!roomWithHost) {
			throw new Error("Failed to add host as participant");
		}
		console.log("Room with host:", {
			participants: roomWithHost.participants,
		});

		// 5. Add the test participant
		console.log("Adding test participant");
		const roomWithParticipant = await joinRoom(
			newRoom.roomId,
			participantId,
			participantUsername
		);
		if (!roomWithParticipant) {
			throw new Error("Failed to add test participant");
		}
		console.log("Room with participant:", {
			participants: roomWithParticipant.participants,
		});

		// 6. Verify both users are in the room
		const roomBeforeExit = await getRoom(newRoom.roomId);
		if (!roomBeforeExit) {
			throw new Error("Failed to get room before exit");
		}

		console.log("Room before host exit:", {
			id: roomBeforeExit.id,
			roomId: roomBeforeExit.roomId,
			roomStatus: roomBeforeExit.roomStatus,
			participants: roomBeforeExit.participants,
			created_by: roomBeforeExit.created_by,
		});

		if (!roomBeforeExit.participants || roomBeforeExit.participants.length < 2) {
			throw new Error("Room does not have both participants before host exit");
		}

		// 7. Simulate host leaving (with checkForHostExit=true)
		console.log("Simulating host leaving room with ID:", roomBeforeExit.roomId);
		console.log("Host ID:", hostId);

		const resultAfterHostExit = await leaveRoom(
			roomBeforeExit.roomId,
			hostId,
			true
		);
		if (!resultAfterHostExit) {
			console.error("leaveRoom returned null after host exit");
			throw new Error("leaveRoom returned null after host exit");
		}

		// 8. Verify room state after host exit
		console.log("Result after host exit:", {
			id: resultAfterHostExit.id,
			roomId: resultAfterHostExit.roomId,
			roomStatus: resultAfterHostExit.roomStatus,
			participants: resultAfterHostExit.participants,
		});

		// Log all properties for debugging
		console.log("Result object keys:", Object.keys(resultAfterHostExit));
		console.log(
			"Full result object:",
			JSON.stringify(resultAfterHostExit, null, 2)
		);

		// Check specifically for the roomStatus property
		const hasRoomStatusProperty = "roomStatus" in resultAfterHostExit;
		console.log("Has roomStatus property:", hasRoomStatusProperty);

		// 9. Double-check by fetching room again
		const roomAfterExit = await getRoom(newRoom.roomId);
		if (!roomAfterExit) {
			console.log("Room no longer exists after host exit");
		} else {
			console.log("Room after host exit:", {
				id: roomAfterExit.id,
				roomId: roomAfterExit.roomId,
				roomStatus: roomAfterExit.roomStatus,
				participants: roomAfterExit.participants,
			});
		}

		// 10. Test result
		// Direct check with a separate getRoom call to ensure we have latest data
		const finalRoomCheck = await getRoom(newRoom.roomId);
		console.log(
			"Final room check:",
			finalRoomCheck
				? {
						id: finalRoomCheck.id,
						roomId: finalRoomCheck.roomId,
						roomStatus: finalRoomCheck.roomStatus,
						participants: finalRoomCheck.participants,
					}
				: "Room not found"
		);

		// Consider the test passed if either:
		// 1. resultAfterHostExit shows roomStatus=false and empty participants
		// 2. The final room check shows roomStatus=false and empty participants
		const resultCheck =
			resultAfterHostExit.roomStatus === false &&
			Array.isArray(resultAfterHostExit.participants) &&
			resultAfterHostExit.participants.length === 0;

		const finalCheck =
			finalRoomCheck &&
			finalRoomCheck.roomStatus === false &&
			Array.isArray(finalRoomCheck.participants) &&
			finalRoomCheck.participants.length === 0;

		const testPassed = resultCheck || finalCheck;

		console.log(`TEST ${testPassed ? "PASSED" : "FAILED"}`);

		if (!testPassed) {
			console.log("Failure analysis:", {
				resultCheck,
				finalCheck,
				resultRoomStatus: resultAfterHostExit.roomStatus,
				finalRoomStatus: finalRoomCheck?.roomStatus,
			});
		}

		return testPassed;
	} catch (error) {
		console.error("TEST ERROR:", error);
		return false;
	}
}
