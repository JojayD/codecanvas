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
}

export default function DraggableVideoChat({
	username,
	audio = false,
	video = false,
	roomName = "codecanvas-room",
}: DraggableVideoChatProps) {
	const [minimized, setMinimized] = useState(false);
	const [inCall, setInCall] = useState(true);
	const [roomInstance] = useState(
		() =>
			new Room({
				adaptiveStream: true,
				dynacast: true,
			})
	);
	const [dimensions, setDimensions] = useState({ width: 600, height: 256 });
	const [position, setPosition] = useState({
		x: window.innerWidth - 340, // Position near the top-right by default
		y: 80,
	});

	// Use a more specific type declaration for the ref with explicit cast
	const nodeRef = useRef<HTMLDivElement>(null) as RefObject<HTMLElement>;

	// Make position updates more immediate with a lower throttle time

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

	const reJoinCall = async () => {
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

	const leaveCall = () => {
		roomInstance.disconnect();
		setInCall(false);
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
					// only transition width/height when minimizing
					transition: "width 200ms ease, height 200ms ease",
					transform: "translate3d(0,0,0)", // keep GPU acceleration
					willChange: "transform, width, height",
					touchAction: "none",
					maxHeight: "calc(100vh - 100px)",
					width: `${dimensions.width}px`,
					height: `${dimensions.height}px`,
					top: 0,
					left: 0,
				}}
			>
				<RoomContext.Provider value={roomInstance}>
					<div className='drag-handle flex items-center justify-between bg-purple-600 px-2 py-1 cursor-move text-white text-xs'>
						<span>Video Meeting</span>
						<div className='flex space-x-1'>
							<button
								onClick={toggleMinimize}
								className='text-white hover:bg-purple-700 rounded p-1'
							>
								{minimized ? "□" : "−"}
							</button>
						</div>
					</div>

					{/* <div className='flex flex-col items-center justify-center h-full'>
						{!inCall ? (
							<Button
								onClick={reJoinCall}
								className='bg-purple-600 hover:bg-purple-700 text-white'
							>
								Rejoin Call
							</Button>
						) : (
							<Button
								onClick={leaveCall}
								className='bg-red-600 hover:bg-red-700 text-white mt-2'
							>
								Leave Call
							</Button>
						)}
					</div> */}

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
