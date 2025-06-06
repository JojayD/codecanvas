"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { RoomProvider, useRoom } from "@/app/context/RoomContextProivider";
import { SplitPane } from "@rexxars/react-split-pane";
import dynamic from "next/dynamic";
import Prompt from "../components/Prompt";
import { supabase } from "@/lib/supabase";
import React from "react";
import { withAuthProtection } from "@/app/context/AuthProvider";

// Dynamically import the CodeEditor component to avoid SSR issues
const DynamicCodeEditor = dynamic(
	() => import("@/app/(canvas)/components/CodeEditor"),
	{
		ssr: false,
	}
);
const DynamicVideoChat = dynamic(() => import("@/components/DraggablePanel"), {
	ssr: false,
});

// Import TLDraw whiteboard
const DynamicWhiteBoard = dynamic(
	() => import("@/app/(canvas)/components/WhiteBoardTLDraw"),
	{
		ssr: false,
		loading: () => (
			<div className='h-full w-full flex items-center justify-center'>
				Loading whiteboard...
			</div>
		),
	}
);

function Canvas() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const roomIdParam = searchParams.get("roomId");
	const roomIdString = roomIdParam || "";
	const roomId = roomIdString;
	const [showUpdateNotification, setShowUpdateNotification] = useState(false);
	const [lastUpdate, setLastUpdate] = useState<string | null>(null);
	const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
	const [showVideoChat, setShowVideoChat] = useState(true);
	const [videoSettings, setVideoSettings] = useState({
		username: "",
		audio: true,
		video: true,
	});
	const [inCall, setInCall] = useState(true);
	const [connectionError, setConnectionError] = useState<boolean>(false);
	const [visibility, setVisibility] = useState<boolean>(true);
	// Add a state to track if the component is safely mounted
	const [isSafeToJoin, setIsSafeToJoin] = useState(false);
	const {
		code,
		updateCode,
		participants,
		currentUser,
		joinRoom,
		leaveRoom,
		loading,
		error,
		prompt,
		language,
		updateLanguage,
		room,
	} = useRoom();
	// Track if user has joined the room to avoid duplicate joins
	const [hasJoinedLocally, setHasJoinedLocally] = useState(false);
	// Track previous participants to detect changes
	const prevParticipantsRef = React.useRef<string[]>([]);

	useEffect(() => {
		// Check if roomId is present
		console.log("In call stat changed from Canvas component:", inCall);
		console.log(
			"Show video chat stat changed from Canvas component:",
			showVideoChat
		);
	}, [inCall, showVideoChat]);

	useEffect(() => {
		if (inCall) {
			console.log("In call stat changed from Canvas component:", inCall);

			const checkPermissions = async () => {
				const permissionStatus = await detectMediaPermissions();

				if (!permissionStatus.granted) {
					setConnectionError(true);
				}
			};
			checkPermissions();
		}
	}, [inCall]);

	// Add a delayed "safe to join" effect to ensure component is stably mounted before joining
	useEffect(() => {
		// Wait a short delay before setting it's safe to join
		// This ensures auth and other initialization processes have completed
		const safetyTimer = setTimeout(() => {
			console.log("Component is now considered stable and safe to join room");
			setIsSafeToJoin(true);
		}, 1000);

		return () => clearTimeout(safetyTimer);
	}, []);

	useEffect(() => {
		// Get saved preferences from localStorage
		const username =
			localStorage.getItem("username") || currentUser?.username || "Anonymous";
		const audioEnabled = localStorage.getItem("enableAudio") === "true";
		const videoEnabled = localStorage.getItem("enableCamera") === "true";
		console.log("Loaded video settings from localStorage");
		setVideoSettings({
			username,
			audio: audioEnabled,
			video: videoEnabled,
		});
	}, [currentUser]);

	// Handle real-time updates
	useEffect(() => {
		// Convert participants to strings for comparison
		const currentParticipantIds = participants.map((p) => p.userId);
		const prevParticipantIds = prevParticipantsRef.current;

		// Skip on first render
		if (prevParticipantIds.length > 0) {
			// Check if the participants have changed
			const newParticipants = currentParticipantIds.filter(
				(id) => !prevParticipantIds.includes(id)
			);
			const departedParticipants = prevParticipantIds.filter(
				(id) => !currentParticipantIds.includes(id)
			);

			if (newParticipants.length > 0 || departedParticipants.length > 0) {
				// Generate appropriate message based on what changed
				let message = `Participants updated at ${new Date().toLocaleTimeString()}`;

				if (newParticipants.length > 0) {
					// Find usernames of new participants
					const newUsernames = newParticipants.map((id) => {
						const participant = participants.find((p) => p.userId === id);
						return participant ? participant.username : "Unknown user";
					});
					message = `${newUsernames.join(", ")} joined at ${new Date().toLocaleTimeString()}`;
				}

				if (departedParticipants.length > 0) {
					// We don't have usernames for departed users, just indicate someone left
					message = `User${departedParticipants.length > 1 ? "s" : ""} left at ${new Date().toLocaleTimeString()}`;
				}

				console.log("Participant change detected:", {
					newParticipants,
					departedParticipants,
					message,
				});

				setLastUpdate(message);
				setShowUpdateNotification(true);

				// Hide notification after 3 seconds
				setTimeout(() => {
					setShowUpdateNotification(false);
				}, 5000);
			}
		}

		// Update the ref with current participants
		prevParticipantsRef.current = currentParticipantIds;
	}, [participants]);

	// Handle code updates
	useEffect(() => {
		if (lastUpdate !== null) {
			setLastUpdate(`Code updated at ${new Date().toLocaleTimeString()}`);
			setLastUpdate(`Session started at ${new Date().toLocaleTimeString()}`);
		}
	}, [code]);

	/**
	 * useEffect for initialize video call
	 */

	// Force join the room when component mounts
	useEffect(() => {
		// Don't attempt to join until component is stable
		if (!isSafeToJoin) {
			console.log("Waiting for component to stabilize before joining room...");
			return;
		}

		// Track if a join is in progress or has been completed
		let joinAttempted = false;

		const joinRoomNow = async () => {
			if (joinAttempted || hasJoinedLocally) return;

			try {
				console.log("Initial joinRoom call from Canvas component");
				joinAttempted = true;
				await joinRoom();
				setHasJoinedLocally(true);
			} catch (error) {
				console.error("Error joining room on mount:", error);
				joinAttempted = false; // Reset on error to allow retry
			}
		};

		// Only call joinRoom if we haven't already joined locally
		if (!hasJoinedLocally) {
			joinRoomNow();
		} else {
			console.log("Already joined room, skipping joinRoom call from Canvas");
		}

		// Set up periodic room status check as a backup for real-time updates
		const checkRoomStatus = async () => {
			try {
				if (roomId) {
					const response = await fetch(`/api/room-status?roomId=${roomId}`);
					if (response.ok) {
						const data = await response.json();
						console.log("Room status check result:", data);

						if (data.roomStatus === false && room?.roomStatus !== false) {
							console.log(
								"Room closed detected via polling - redirecting to dashboard"
							);
							alert("This room has been closed. Redirecting to dashboard.");
							router.push("/dashboard");
						}
					}
				}
			} catch (error) {
				console.error("Error checking room status:", error);
			}
		};

		// Check every 10 seconds as a fallback

		// Add beforeunload event listener to handle unexpected exits

		// Leave the room when component unmounts
		return () => {
			// Only execute cleanup if we've actually joined the room
			if (!hasJoinedLocally) {
				console.log(
					"Component unmounting but never joined room - skipping cleanup"
				);
				return;
			}

			console.log("Canvas component unmounting - cleaning up");
			
			// Clear the status check interval
		};
	}, [
		leaveRoom,
		joinRoom,
		roomId,
		currentUser,
		router,
		isSafeToJoin,
		hasJoinedLocally,
	]);

	// Effect to handle room status changes and redirect if room is closed
	useEffect(() => {
		// Only consider the room closed if roomStatus is explicitly set to false
		// Don't use empty participants as a criteria for room closure
		const isRoomClosed = room?.roomStatus === false;

		console.log("Room closed check:", {
			roomStatus: room?.roomStatus,
			participantsCount: Array.isArray(participants) ? participants.length : 0,
			isRoomClosed,
		});

		if (isRoomClosed && !loading) {
			console.log("Room is closed, redirecting to dashboard");
			// Show a message about the room being closed
			alert("This room has been closed. You'll be redirected to the dashboard.");
			// Navigate to dashboard after a short delay
			router.push("/dashboard");
		}
	}, [room, loading]);

	const detectMediaPermissions = async () => {
		try {
			// Try to access media devices
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: videoSettings.audio,
				video: videoSettings.video,
			});

			// If successful, clean up the test stream
			stream.getTracks().forEach((track) => track.stop());
			return { granted: true };
		} catch (error: unknown) {
			console.error("Media permission error:", error);

			if (error instanceof Error) {
				return { granted: false, message: error.message };
			}
			// Add default return for non-Error types
			return { granted: false, message: "Unknown media permission error" };
		}
	};

	const handleLogout = async () => {
		try {
			// Call a dedicated signout API endpoint to clear cookies properly
			const response = await fetch("/api/auth/signout", {
				method: "POST",
				credentials: "include", // Important for cookies
			});

			if (!response.ok) {
				throw new Error("Signout failed");
			}

			// Optional: Clear any local storage items that might contain user data
			localStorage.removeItem("currentUser");
			localStorage.removeItem("roomData");

			// Navigate to the login page
			router.push("/login");
		} catch (error) {
			console.error("Error signing out:", error);

			// Fallback to direct Supabase signout if API fails
			const { error: supabaseError } = await supabase.auth.signOut();
			if (supabaseError) {
				console.error("Supabase signout error:", supabaseError.message);
			} else {
				router.push("/login");
			}
		}
	};

	const handleLeaveRoom = async () => {
		try {
			console.log(`User clicked Leave Room button`);

			// Call the leaveRoom function from context
			await leaveRoom();

			// Wait a brief moment to allow Supabase to process the update
			// before navigating away from the page
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Finally, navigate to the dashboard
			console.log("Navigating to dashboard after leaving room");
			router.push("/dashboard");
		} catch (error) {
			console.error("Error leaving room:", error);
		}
	};

	const handleRejoinCall = async () => {
		try {
			// Only try to rejoin if they're not already in a call
			if (!inCall) {
				console.log("Attempting to rejoin video call...");
				// We're just setting the state - the DraggablePanel will handle reconnection
				// in its useEffect when inCall changes from false to true
				setInCall(true);

				// Show the video panel if it was hidden
				if (!showVideoChat) {
					setShowVideoChat(true);
				}
			}
		} catch (error) {
			console.error("Failed to rejoin call:", error);
		}
	};

	const handleJoinRoom = async () => {
		try {
			// Don't try to join if already joined
			if (hasJoinedLocally) {
				console.log("Already joined locally, skipping manual join attempt");
				return;
			}

			// Check if current user is already in participants list
			const isUserInParticipants = participants.some(
				(p) => p.userId === currentUser.userId
			);
			if (isUserInParticipants) {
				console.log("User already in participants list, updating local state only");
				setHasJoinedLocally(true);
				return;
			}

			console.log("Manual join attempt initiated");
			await joinRoom();
			setHasJoinedLocally(true);
		} catch (error) {
			console.error("Error manually joining room:", error);
		}
	};

	if (loading)
		return (
			<div className='flex justify-center items-center h-screen'>Loading...</div>
		);
	if (error)
		return (
			<div className='flex justify-center items-center h-screen text-red-500'>
				Error: {error.message}
			</div>
		);

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				padding: 0,
				margin: 0,
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<header
				className='bg-blue-600 text-white py-2 px-4'
				style={{ flexShrink: 0 }}
			>
				<div className='flex justify-between items-center'>
					<div className='flex items-center'>
						<h1 className='text-xl font-bold mr-2'>Code Canvas</h1>
						<div className='bg-blue-800 px-3 py-1 rounded-md'>
							Room ID: <span className='font-bold'>{roomId}</span>
							<button
								className='ml-2 text-xs bg-blue-700 hover:bg-blue-900 px-2 py-1 rounded'
								onClick={() => {
									navigator.clipboard.writeText(roomIdString);
									alert("Room ID copied to clipboard!");
								}}
							>
								Copy
							</button>
						</div>
					</div>
					<nav>
						<ul className='flex space-x-4'>
							<li>
								<button
									onClick={handleLeaveRoom}
									className='bg-red-500 hover:bg-red-700 text-white font-medium py-1 px-3 rounded'
								>
									Leave Room
								</button>
							</li>
						</ul>
					</nav>
				</div>
			</header>
			<div className='bg-gray-800 text-white p-2 flex justify-between items-center'>
				<div className='flex items-center'>
					<span className='mr-2 font-semibold'>
						Room Participants ({participants.length}):
					</span>
					<div className='flex space-x-2'>
						{participants.length === 0 ? (
							<div className='text-gray-400 italic'>
								No participants in the room yet
							</div>
						) : (
							participants.map((participant) => (
								<div
									key={participant.userId}
									className={`px-3 py-1 rounded-full text-sm ${
										participant.userId === currentUser.userId
											? "bg-green-600 border-2 border-white"
											: "bg-blue-600"
									} flex items-center`}
									title={
										participant.userId === currentUser.userId
											? "You"
											: participant.username
									}
								>
									{participant.userId === currentUser.userId && (
										<span className='mr-1 text-xs'>👤</span>
									)}
									{participant.username}
								</div>
							))
						)}
					</div>
				</div>
				<div className='flex items-center'>
					{!participants.some((p) => p.userId === currentUser.userId) && (
						<button
							className='bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
							onClick={handleJoinRoom}
						>
							Join Room
						</button>
					)}
					<button
						className='bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
						onClick={() => {
							setShowVideoChat(!showVideoChat);
						}}
					>
						{showVideoChat ? "Hide Video Chat" : "Show Video Chat"}
					</button>
					<button
						className='bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
						onClick={() => {
							const url = `${window.location.origin}/canvas?roomId=${roomId}`;
							navigator.clipboard.writeText(url);
							alert("Invitation link copied to clipboard!");
						}}
					>
						Copy Invite Link
					</button>
					{/* Only show Join Call button if not already in a call */}
					{!inCall && (
						<button
							className='bg-orange-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
							onClick={handleRejoinCall}
						>
							Rejoin Call
						</button>
					)}
				</div>
			</div>
			{/* Real-time update notification */}
			{showUpdateNotification && (
				<div className='bg-blue-500 text-white px-4 py-2 text-sm transition-opacity duration-300 flex justify-between items-center'>
					<span>{lastUpdate}</span>
					<button
						className='text-white hover:text-gray-200'
						onClick={() => setShowUpdateNotification(false)}
					>
						✕
					</button>
				</div>
			)}
			{/* Last update timestamp (always visible) */}
			<div className='bg-gray-700 text-gray-300 px-4 py-1 text-xs'>
				{lastUpdate || ""}
			</div>
			<div
				style={{
					flexGrow: 1,
					width: "100vw",
					height: "calc(100vh - 86px)" /* Adjusted for both headers */,
					padding: 0,
					margin: 0,
					overflow: "hidden",
				}}
			>
				<SplitPane
					split='vertical'
					minSize={200}
					defaultSize={300}
					style={{ position: "relative", height: "100%", width: "100%" }}
				>
					<div className='h-full overflow-hidden p-2 bg-white'>
						<Prompt />
					</div>
					<SplitPane
						split='vertical'
						minSize={200}
						defaultSize={400}
						style={{ position: "relative", height: "100%", width: "100%" }}
					>
						<div className='h-full overflow-hidden'>
							<DynamicCodeEditor
								defaultValue={code}
								language={language}
								key={`editor-${roomId}`}
								onChange={(value) => updateCode(value || "")}
								onLanguageChange={(newLang) => updateLanguage(newLang)}
							/>
						</div>
						<div className='h-full overflow-hidden'>
							<DynamicWhiteBoard />
						</div>
					</SplitPane>
				</SplitPane>
			</div>
			<div>
				{" "}
				<DynamicVideoChat
					username={videoSettings.username}
					audio={videoSettings.audio}
					video={videoSettings.video}
					roomName={roomId} // Use the current room ID to keep video in the same context'
					setInCall={setInCall}
					inCall={inCall}
					showVideoChat={showVideoChat}
					className={showVideoChat ? "visible" : "hidden"}
				/>
			</div>
			<div>
				{connectionError && (
					<div>
						<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
							<div className='bg-white rounded-lg shadow-xl p-6 max-w-md w-full'>
								<div className='text-red-500 mb-2 text-xl font-bold flex items-center'>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										className='h-6 w-6 mr-2'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
										/>
									</svg>
									Camera/Microphone Access Blocked
								</div>

								<p className='text-gray-700 mb-4'>
									CodeCanvas needs access to your camera and microphone for video chat.
									Please allow access in your browser settings. If you don't want to use
									the camera you can click on the dismiss button
								</p>

								<div className='bg-gray-100 p-3 rounded-md mb-4'>
									<h3 className='font-semibold mb-2'>How to fix this:</h3>
									<ol className='list-decimal pl-5 text-sm'>
										<li>Click the camera/lock icon in your browser's address bar</li>
										<li>Select "Always allow" for camera and microphone on this site</li>
										<li>Refresh the page</li>
									</ol>
								</div>

								<div className='flex justify-end space-x-3'>
									<button
										onClick={() => setConnectionError(false)}
										className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md border'
									>
										Dismiss
									</button>
									<button
										onClick={() => {
											window.location.reload();
										}}
										className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
									>
										Refresh Page
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Apply the withAuthProtection HOC to the Canvas component directly without the wrapper function
const ProtectedCanvas = withAuthProtection(Canvas);

// Main page component with simplified error handling
const CanvasPage = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const roomIdParam = searchParams.get("roomId");
	const [isLoaded, setIsLoaded] = useState(false);

	// Check for roomId and redirect if needed
	useEffect(() => {
		if (!roomIdParam) {
			console.log("No room ID provided, redirecting to dashboard");
			router.push("/dashboard");
		} else {
			// Mark as loaded after a short delay to ensure we have the param
			setTimeout(() => setIsLoaded(true), 500);
		}
	}, [roomIdParam, router]);

	// Loading state
	if (!isLoaded || !roomIdParam) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4'></div>
					<p>{roomIdParam ? "Loading room..." : "Redirecting to dashboard..."}</p>
				</div>
			</div>
		);
	}

	// Render the room with the wrapped component
	console.log("Rendering room with ID:", roomIdParam);
	return (
		<RoomProvider roomId={roomIdParam}>
			<ProtectedCanvas />
		</RoomProvider>
	);
};

export default function Page() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<CanvasPage />
		</Suspense>
	);
}
