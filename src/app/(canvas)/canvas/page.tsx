"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { RoomProvider, useRoom } from "@/app/context/RoomContextProivider";
import { SplitPane } from "@rexxars/react-split-pane";
import dynamic from "next/dynamic";
import Prompt from "../components/Prompt";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import React from "react";

// Dynamically import the CodeEditor component to avoid SSR issues
const DynamicCodeEditor = dynamic(
	() => import("@/app/(canvas)/components/CodeEditor"),
	{
		ssr: false,
	}
);

// Import WhiteBoard with the correct Next.js dynamic import pattern
// This fixes the 'canvas' module not found error (GitHub issue #102)
const DynamicWhiteBoard = dynamic(
	() => import("@/app/(canvas)/components/WhiteBoard"),
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
	const {
		roomId,
		code,
		updateCode,
		participants,
		currentUser,
		joinRoom,
		leaveRoom,
		loading,
		error,
	} = useRoom();

	// Add debug state
	const [showDebug, setShowDebug] = useState(false);

	// Add state for update notifications
	const [lastUpdate, setLastUpdate] = useState<string | null>(null);
	const [showUpdateNotification, setShowUpdateNotification] = useState(false);

	// Track previous participants to detect changes
	const prevParticipantsRef = React.useRef<string[]>([]);

	// Handle real-time updates
	useEffect(() => {
		// Convert participants to strings for comparison
		const currentParticipantIds = participants.map((p) => p.userId);
		const prevParticipantIds = prevParticipantsRef.current;

		// Skip on first render
		if (prevParticipantIds.length > 0) {
			// Check if the participants have changed
			const hasNewParticipants = currentParticipantIds.some(
				(id) => !prevParticipantIds.includes(id)
			);
			const hasLostParticipants = prevParticipantIds.some(
				(id) => !currentParticipantIds.includes(id)
			);

			if (hasNewParticipants || hasLostParticipants) {
				// Someone joined or left
				setLastUpdate(`Participants updated at ${new Date().toLocaleTimeString()}`);
				setShowUpdateNotification(true);

				// Hide notification after 3 seconds
				setTimeout(() => {
					setShowUpdateNotification(false);
				}, 3000);
			}
		}

		// Update the ref with current participants
		prevParticipantsRef.current = currentParticipantIds;
	}, [participants]);

	// Handle code updates
	useEffect(() => {
		// Skip on first render (useRef would be cleaner but this works too)
		if (lastUpdate !== null) {
			setLastUpdate(`Code updated at ${new Date().toLocaleTimeString()}`);
			// setShowUpdateNotification(true);

			// Hide notification after 3 seconds
			// setTimeout(() => {
			// setShowUpdateNotification(false);
			// }, 3000);
			// } else {
			// Initialize on first render
			setLastUpdate(`Session started at ${new Date().toLocaleTimeString()}`);
		}
	}, [code]);

	// Force join the room when component mounts
	useEffect(() => {
		const joinRoomNow = async () => {
			console.log("Attempting to join room on mount");
			try {
				await joinRoom();
				console.log("Joined room on mount");
			} catch (error) {
				console.error("Error joining room on mount:", error);
			}
		};

		joinRoomNow();

		// Leave the room when component unmounts
		return () => {
			leaveRoom();
		};
	}, [leaveRoom, joinRoom]);

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("Error signing out:", error.message);
		} else {
			router.push("/");
		}
	};

	const handleLeaveRoom = async () => {
		try {
			await leaveRoom();
			console.log("Successfully left the room");
			router.push("/dashboard");
		} catch (error) {
			console.error("Error leaving room:", error);
		}
	};

	const handleJoinRoom = async () => {
		try {
			await joinRoom();
			console.log("Manually joined room");
		} catch (error) {
			console.error("Error manually joining room:", error);
		}
	};

	const handleDebug = () => {
		console.log("Room ID:", roomId);
		console.log("Current User:", currentUser);
		console.log("Participants:", participants);
		setShowDebug(!showDebug);
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
									navigator.clipboard.writeText(roomId);
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
							<li>
								<a
									href='/canvas'
									className='hover:underline'
								>
									Editor
								</a>
							</li>
							<li>
								<a
									href='/examples'
									className='hover:underline'
								>
									Examples
								</a>
							</li>
							<li>
								<button
									onClick={handleLogout}
									className='hover:underline cursor-pointer'
								>
									Logout
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
						className='bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
						onClick={() => {
							const url = `${window.location.origin}/canvas?roomId=${roomId}`;
							navigator.clipboard.writeText(url);
							alert("Invitation link copied to clipboard!");
						}}
					>
						Copy Invite Link
					</button>
					<button
						className='bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-1 px-3 rounded mr-3'
						onClick={handleDebug}
					>
						Debug
					</button>
					<span className='text-sm text-gray-300'>
						Your ID: {currentUser.userId}
					</span>
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
				{lastUpdate || "Connecting..."}
			</div>

			{showDebug && (
				<div className='bg-gray-900 text-white p-2 max-h-40 overflow-auto'>
					<h3 className='font-bold'>Debug Information:</h3>
					<p>Room ID: {roomId}</p>
					<p>
						Current User: {currentUser.userId} ({currentUser.username})
					</p>
					<p>Participants ({participants.length}):</p>
					<ul className='pl-4'>
						{participants.length === 0 ? (
							<li className='text-gray-400'>No participants</li>
						) : (
							participants.map((p) => (
								<li
									key={p.userId}
									className={p.userId === currentUser.userId ? "text-green-400" : ""}
								>
									{p.username} ({p.userId})
								</li>
							))
						)}
					</ul>
				</div>
			)}

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
								key={`editor-${roomId}`}
								onChange={(value) => updateCode(value || "")}
							/>
						</div>
						<div className='h-full overflow-hidden'>
							<DynamicWhiteBoard />
						</div>
					</SplitPane>
				</SplitPane>
			</div>
		</div>
	);
}

// Component to handle room ID extraction and provide it to RoomProvider
function CanvasWithParams() {
	const searchParams = useSearchParams();
	const roomId = searchParams.get("roomId");

	if (!roomId) {
		return (
			<div className='p-4 text-center'>
				No room ID provided. Please join or create a room first.
			</div>
		);
	}

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				padding: 0,
				margin: 0,
				overflow: "hidden",
			}}
		>
			<RoomProvider roomId={roomId}>
				<Canvas />
			</RoomProvider>
		</div>
	);
}

// Main page component with Suspense boundary for useSearchParams
export default function CanvasPage() {
	return (
		<Suspense fallback={<div className='p-4 text-center'>Loading...</div>}>
			<CanvasWithParams />
		</Suspense>
	);
}
