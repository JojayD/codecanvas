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

	// Use a more specific type declaration for the ref with explicit cast
	const nodeRef = useRef<HTMLDivElement>(null) as RefObject<HTMLElement>;

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

	return (
		<Draggable
			nodeRef={nodeRef}
			handle='.drag-handle'
			defaultPosition={{ x: 20, y: 20 }}
			bounds='parent'
		>
			<div
				ref={nodeRef as React.RefObject<HTMLDivElement>}
				className={`absolute z-50 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
					minimized ? "w-60 h-36" : "w-100 h-64"
				}`}
				style={{ boxShadow: "0 0 15px rgba(0,0,0,0.2)" }}
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
