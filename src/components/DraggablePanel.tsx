"use client";
import React, { useState, useEffect, useRef, RefObject } from "react";
import { useSearchParams } from "next/navigation";
import {
	ControlBar,
	ParticipantTile,
	RoomAudioRenderer,
	useTracks,
	RoomContext,
} from "@livekit/components-react";
import { Room, Track, RoomConnectOptions } from "livekit-client";
import {
	ConnectionState as ConnectionStateUI,
	useConnectionState,
} from "@livekit/components-react";
import { ConnectionState as ConnectionStateType } from "livekit-client";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import Draggable, {
	DraggableEventHandler,
	DraggableData,
} from "react-draggable";
import throttle from "lodash/throttle";

interface DraggableVideoChatProps {
	username: string;
	audio: boolean;
	video: boolean;
	roomName?: string;
	inCall?: boolean;
	setInCall: (value: boolean) => void;
	className?: string;
	showVideoChat?: boolean;
}

export default function DraggableVideoChat({
	username,
	audio = false,
	video = false,
	roomName = "codecanvas-room",
	inCall = true,
	setInCall = () => {},
	className = "",
	showVideoChat = true,
}: DraggableVideoChatProps) {
	const [minimized, setMinimized] = useState(false);
	const [connectionState, setConnectionState] = useState<ConnectionStateType>(
		ConnectionStateType.Disconnected
	);
	const [roomInstance] = useState(
		() =>
			new Room({
				adaptiveStream: true,
				dynacast: true,
			})
	);
	const [dimensions, setDimensions] = useState({ width: 500, height: 256 });
	const [position, setPosition] = useState({
		x: window.innerWidth - 340, // Position near the top-right by default
		y: 80,
	});

	// Use a more specific type declaration for the ref with explicit cast
	const nodeRef = useRef<HTMLDivElement>(null) as RefObject<HTMLElement>;

	// Make position updates more immediate with a lower throttle time
	useEffect(() => {
		if (!roomInstance) return;

		// Update state when connection changes
		const handleConnectionStateChange = (state: ConnectionStateType) => {
			console.log("Connection state changed to:", state);
			setConnectionState(state);

			// Automatically update inCall based on connection state
			if (state === ConnectionStateType.Connected) {
				setInCall(true);
			} else if (state === ConnectionStateType.Disconnected) {
				setInCall(false);
			}
		};
		// Subscribe to connection changes
		roomInstance.on("connectionStateChanged", handleConnectionStateChange);

		// Set initial state
		setConnectionState(roomInstance.state);
		if (roomInstance.state === ConnectionStateType.Connected) {
			setInCall(true);
			console.log("Changed state to connected");
		} else {
			setInCall(false);
			console.log("Changed state to disconnected");
		}
		return () => {
			// Unsubscribe when component unmounts
			roomInstance.off("connectionStateChanged", handleConnectionStateChange);
		};
	}, [roomInstance]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Update dimensions based on minimized state
		const width = minimized ? 240 : 500;
		const height = minimized ? 144 : 256;
		setDimensions({ width, height });

		// Ensure the panel is always visible in the viewport
		// Use a fixed position in the top-right visible area
		const safeX = Math.max(
			20,
			Math.min(window.innerWidth - width - 20, position.x)
		);

		// Ensure Y position is always visible (not at bottom of viewport)
		const safeY = Math.min(
			window.innerHeight * 0.6, // Keep in top 60% of screen
			Math.max(80, position.y) // But at least 80px from top
		);

		setPosition({ x: safeX, y: safeY });

		// Handle window resizing
		const handleResize = () => {
			const newX = Math.min(window.innerWidth - width - 20, position.x);
			const newY = Math.min(window.innerHeight * 0.6, Math.max(80, position.y));
			setPosition({ x: newX, y: newY });
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [minimized]);

	// Add this effect to watch for inCall changes from parent component
	useEffect(() => {
		// If inCall=true but we're not connected, reconnect to the room
		if (inCall && connectionState !== ConnectionStateType.Connected) {
			// Check connection state
			console.log("Parent set inCall=true - reconnecting to LiveKit");
			reJoinLiveKitCall();
		}
		// If inCall=false but we're connected, disconnect
		else if (!inCall && connectionState === ConnectionStateType.Connected) {
			console.log("Parent set inCall=false - leaving LiveKit call");
			roomInstance.disconnect();
		}
	}, [inCall, connectionState, roomInstance, roomName, username]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const resp = await fetch(
					`/api/token?room=${roomName}&username=${username}`
				);
				const data = await resp.json();
				if (!mounted) return;
				if (data.token) {
					// First establish the connection
					await roomInstance.connect(
						process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
						data.token
					);

					// Then enable audio/video after connection is established
					setInCall(true);
					console.log("Connection and media setup complete");
				}
			} catch (e) {
				console.error(e);
			}
		})();

		return () => {
			mounted = false;
			roomInstance.disconnect();
		};
	}, [roomInstance, username, audio, video, roomName]);

	const toggleMinimize = () => {
		setMinimized(!minimized);
	};

	/**
	 * Detecting for camera and microphone permissions
	 */

	const leaveCall = () => {
		roomInstance.disconnect();
		setInCall(false);
	};

	const reJoinLiveKitCall = async () => {
		try {
			const resp = await fetch(`/api/token?room=${roomName}&username=${username}`);
			const { token } = await resp.json();
			if (!token) return;
			await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || "", token);
			setInCall(true);
		} catch (e) {
			console.error(e);
		}
	};

	const handleDrag: DraggableEventHandler = (e, data: DraggableData) => {
		const { x, y } = data;

		// Calculate viewport bounds with more generous margins
		const headerHeight = 40; // Reduced to allow more dragging space
		const maxX = window.innerWidth - dimensions.width;
		const maxY = window.innerHeight - dimensions.height - headerHeight;

		// Apply bounds
		const boundedX = Math.min(maxX, Math.max(0, x));
		const boundedY = Math.min(maxY, Math.max(0, y));

		// Set position immediately without throttling for most responsive dragging
		setPosition({ x: boundedX, y: boundedY });
	};
	const isConnected = connectionState === ConnectionStateType.Connected;

	return (
		<Draggable
			nodeRef={nodeRef}
			handle='.drag-handle'
			position={position}
			bounds='body'
			onDrag={handleDrag}
			positionOffset={{ x: 0, y: 0 }}
			scale={1}
		>
			<div
				ref={nodeRef as React.RefObject<HTMLDivElement>}
				className={`fixed z-50 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
					minimized ? "w-60 h-36" : "w-100 h-64"
				}`}
				style={{
					boxShadow: "0 0 15px rgba(0,0,0,0.2)",
					transition: "width 200ms ease, height 200ms ease, opacity 200ms ease",
					transform: "translate3d(0,0,0)",
					willChange: "transform, width, height",
					touchAction: "none",
					maxHeight: "calc(100vh - 100px)",
					width: `${dimensions.width}px`,
					height: `${dimensions.height}px`,

					// when visible, use your x/y; when hidden, move it way off screen
					top: showVideoChat ? 0 : -10000,
					left: showVideoChat ? 0 : -10000,

					// hide it visually & disable events when “hidden”
					opacity: showVideoChat ? 1 : 0,
					pointerEvents: showVideoChat ? "auto" : "none",
					// remove visibility:hidden entirely
				}}
			>
				<RoomContext.Provider value={roomInstance}>
					<div className='drag-handle flex items-center justify-between bg-purple-600 px-2 py-1 cursor-move text-white text-xs'>
						<ConnectionStateUI />
						{/* {isConnected && (
							<button
								onClick={leaveCall}
								className='text-white hover:bg-red-700 rounded p-1 mr-2'
							>
								Leave Call
							</button>
						)} */}
						<div className='flex space-x-1'>
							<button
								onClick={toggleMinimize}
								className='text-white hover:bg-purple-700 rounded p-1'
							>
								{minimized ? "□" : "−"}
							</button>
						</div>
					</div>
					<div
						className='relative'
						style={{ height: minimized ? "calc(100% - 28px)" : "calc(100% - 28px)" }}
					>
						<VideoGrid minimized={minimized} />
						<RoomAudioRenderer />
						{!minimized && (
							<div className='absolute bottom-0 left-0 right-0 bg-opacity-7'>
								<ControlBar
									variation='minimal'
									className='w-full'
									controls={{ camera: true, microphone: true }}
									style={
										{
											"--lk-control-bar-button-color": "white",
											"--lk-button-background-color": "transparent",
											width: "100%",
										} as React.CSSProperties
									}
								/>
							</div>
						)}
					</div>
				</RoomContext.Provider>
			</div>
		</Draggable>
	);
}

// Video grid component
function VideoGrid({ minimized }: { minimized: boolean }) {
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false }
	);

	return (
		<div
			className={`grid gap-1 p-1 ${
				minimized
					? "grid-cols-1"
					: tracks.length > 1
						? "grid-cols-2"
						: "grid-cols-1"
			}`}
			style={{ height: "100%" }}
		>
			{tracks.map((trackReference) => (
				<ParticipantTile
					key={trackReference.participant.identity + trackReference.source}
					trackRef={trackReference}
				/>
			))}
		</div>
	);
}
