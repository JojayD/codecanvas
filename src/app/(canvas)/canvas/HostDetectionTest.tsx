"use client";

import { useState } from "react";
import { useRoom } from "@/app/context/RoomContextProivider";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";

export default function HostDetectionTest() {
	const { roomId, currentUser, room } = useRoom();
	const [testResults, setTestResults] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [authUserId, setAuthUserId] = useState<string | null>(null);

	// Get Supabase auth user ID
	const getAuthUserId = async () => {
		try {
			const { data } = await supabase.auth.getSession();
			const id = data?.session?.user?.id || null;
			setAuthUserId(id);
			console.log("Auth user ID:", id);
			return id;
		} catch (error) {
			console.error("Error getting auth user ID:", error);
			return null;
		}
	};

	const runTest = async () => {
		if (!roomId || !currentUser?.userId) {
			alert("Missing room or user information");
			return;
		}

		setLoading(true);
		try {
			// Get the authenticated user ID
			const authId = await getAuthUserId();

			console.log("Starting host detection test");
			console.log("Room info:", {
				roomId,
				created_by: room?.created_by,
				createdBy: room?.createdBy,
				userId: currentUser.userId,
				authUserId: authId,
			});

			// Build the URL with all possible identifiers
			let url = `/api/debug-host-detection?roomId=${roomId}&userId=${encodeURIComponent(authUserId?.toString() || "")}`;

			// Add created_by if available
			if (room?.created_by) {
				url += `&create_by=${encodeURIComponent(room.created_by)}`;
			}

			console.log("URL:", url);
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();

			console.log("Host detection test results:", data);
			setTestResults(data);
		} catch (error) {
			console.error("Error running host detection test:", error);
			alert(
				"Error running test: " +
					(error instanceof Error ? error.message : "Unknown error")
			);
		} finally {
			setLoading(false);
		}
	};

	const forceCloseRoom = async () => {
		if (!roomId || !confirm("Are you sure you want to force close this room?"))
			return;

		try {
			setLoading(true);
			const response = await fetch(`/api/force-close-room?roomId=${roomId}`);
			const data = await response.json();

			if (data.success) {
				alert("Room successfully closed");
				window.location.href = "/dashboard";
			} else {
				alert("Failed to close room: " + data.error);
			}
		} catch (error) {
			console.error("Error force closing room:", error);
			alert(
				"Error: " + (error instanceof Error ? error.message : "Unknown error")
			);
		} finally {
			setLoading(false);
		}
	};

	// Get auth user ID on component mount
	useState(() => {
		getAuthUserId();
	});

	return (
		<div className='p-4 mt-4 border border-gray-700 rounded-md bg-gray-800 text-white'>
			<h3 className='text-lg font-medium mb-2'>Host Detection Diagnostic</h3>

			<div className='mb-3'>
				<p className='text-sm mb-1'>Room ID: {roomId}</p>
				<p className='text-sm mb-1'>User ID: {currentUser?.userId}</p>
				<p className='text-sm mb-1'>Username: {currentUser?.username}</p>
				<p className='text-sm mb-1'>
					Room created_by: {room?.created_by || "Not available"}
				</p>
				<p className='text-sm mb-3'>
					Auth User ID: {authUserId || "Not authenticated"}
				</p>

				<button
					className='bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
					onClick={runTest}
					disabled={loading}
				>
					{loading ? "Running Test..." : "Run Host Detection Test"}
				</button>

				<button
					className='bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-3 rounded'
					onClick={forceCloseRoom}
					disabled={loading}
				>
					Force Close Room
				</button>
			</div>

			{testResults && (
				<div className='mt-3 p-3 bg-gray-900 rounded-md overflow-x-auto text-white'>
					<h4 className='text-md font-medium mb-2'>
						Result:{" "}
						{testResults.isHost
							? "✅ You ARE the host"
							: "❌ You are NOT detected as the host"}
					</h4>

					{testResults.matchType && (
						<p className='text-sm mb-2'>
							Match type: <span className='font-bold'>{testResults.matchType}</span>
							{testResults.matchType === "auth_id_match" && " (Most secure)"}
							{testResults.matchType === "user_id_match" && " (Reliable)"}
							{testResults.matchType === "param_match" && " (Least secure)"}
						</p>
					)}

					{testResults.isLastParticipant && (
						<p className='text-sm text-yellow-400 mb-2'>
							You are the last participant in the room.
						</p>
					)}

					{testResults.debugInfo && (
						<div className='text-xs mt-3'>
							<p className='font-medium mb-1'>Room info:</p>
							<p>created_by: {testResults.debugInfo.room.created_by || "N/A"}</p>
							<p>room ID: {testResults.debugInfo.room.roomId || "N/A"}</p>

							<p className='font-medium mt-2 mb-1'>User info:</p>
							<p>user ID: {testResults.debugInfo.userInfo?.userId || "N/A"}</p>
							<p>
								auth ID:{" "}
								{testResults.debugInfo.userInfo?.authenticatedUserId ||
									"Not authenticated"}
							</p>

							<p className='font-medium mt-2 mb-1'>Participants:</p>
							<p>Count: {testResults.debugInfo.participantCount}</p>
							{testResults.debugInfo.participantIds && (
								<ul className='list-disc list-inside'>
									{testResults.debugInfo.participantIds.map(
										(id: string, index: number) => (
											<li key={index}>{id}</li>
										)
									)}
								</ul>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
