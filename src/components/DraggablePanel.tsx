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
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import Draggable from "react-draggable";
import throttle from "lodash/throttle";

interface DraggableVideoChatProps {
	username: string;
	audio: boolean;
	video: boolean;
	roomName?: string;
}

export default function DraggableVideoChat({
	username,
	audio = true,
	video = true,
	roomName = "codecanvas-room",
}: DraggableVideoChatProps) {
	const [minimized, setMinimized] = useState(false);
	const [roomInstance] = useState(
		() =>
			new Room({
				adaptiveStream: true,
				dynacast: true,
			})
	);
	const [dimensions, setDimensions] = useState({ width: 320, height: 256 });
	const [position, setPosition] = useState({ x: 20, y: 20 });

	// Use a more specific type declaration for the ref with explicit cast
	const nodeRef = useRef<HTMLDivElement>(null) as RefObject<HTMLElement>;
	const throttledSetPosition = useRef(
		throttle((pos) => setPosition(pos), 16)
	).current;
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Update dimensions based on minimized state
		const width = minimized ? 240 : 320;
		const height = minimized ? 144 : 256;
		setDimensions({ width, height });

		// Position in top-right corner with margin
		const safeX = Math.max(
			20,
			Math.min(window.innerWidth - width - 20, position.x)
		);
		const safeY = Math.max(
			80,
			Math.min(window.innerHeight - height - 20, position.y)
		);

		setPosition({ x: safeX, y: safeY });

		// Handle window resizing
		const handleResize = () => {
			const newX = Math.min(window.innerWidth - width - 20, position.x);
			const newY = Math.min(window.innerHeight - height - 20, position.y);
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
					await roomInstance.connect(
						process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
						data.token,
						{
							// Apply media settings correctly
							rtcConfig: {
								encodedInsertableStreams: false,
							},
							publishDefaults: {
								audioEnabled: audio,
								videoEnabled: video,
							},
						}
					);
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
	const handleDrag = (e, data) => {
		const { x, y } = data;

		// Calculate viewport bounds
		const headerHeight = 86; // Based on your layout
		const maxX = window.innerWidth - dimensions.width;
		const maxY = window.innerHeight - dimensions.height - headerHeight;

		// Apply bounds
		const boundedX = Math.min(maxX, Math.max(0, x));
		const boundedY = Math.min(maxY, Math.max(0, y));

		throttledSetPosition({ x: boundedX, y: boundedY });
	};

	return (
		<Draggable
			nodeRef={nodeRef}
			handle='.drag-handle'
			defaultPosition={{ x: 20, y: 20 }}
			bounds='body'
			onDrag={handleDrag}
		>
			<div
				ref={nodeRef as React.RefObject<HTMLDivElement>}
				className={`absolute z-50 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
					minimized ? "w-60 h-36" : "w-100 h-64"
				}`}
				style={{
					boxShadow: "0 0 15px rgba(0,0,0,0.2)",
					transform: "translate3d(0,0,0)", // Force GPU acceleration
					willChange: "transform", // Tell browser to optimize
					touchAction: "none", // Improve touch handling
				}}
			>
				<RoomContext.Provider value={roomInstance}>
					<div className='drag-handle flex items-center justify-between bg-blue-600 px-2 py-1 cursor-move text-white text-xs'>
						<span>Video Meeting</span>
						<div className='flex space-x-1'>
							<button
								onClick={toggleMinimize}
								className='text-white hover:bg-blue-700 rounded p-1'
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
							<div className='absolute bottom-0 left-0 right-0'>
								<ControlBar
									variation='minimal'
									controls={{ camera: true, microphone: true }}
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
