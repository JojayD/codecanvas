"use client";
import { useSearchParams } from "next/navigation";
import {
	ControlBar,
	GridLayout,
	ParticipantTile,
	RoomAudioRenderer,
	useTracks,
	RoomContext,
	MediaDeviceMenu,
	VideoConference,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
export default function Page() {
	// The room name and username are hardcoded for this example.
	const searchParams = useSearchParams();
	const router = useRouter();
	const [mediaSettings, setMediaSettings] = useState({
		username: "quickstart-user",
		audio: true,
		video: true,
	});

	// Get the state parameter from URL and parse it
	useEffect(() => {
		const stateParam = searchParams.get("state");
		if (stateParam) {
			try {
				const decodedState = JSON.parse(decodeURIComponent(stateParam));
				console.log("Received media state:", decodedState);
				setMediaSettings({
					username: decodedState.username || "quickstart-user",
					audio: decodedState.audio !== undefined ? decodedState.audio : true,
					video: decodedState.video !== undefined ? decodedState.video : true,
				});
			} catch (error) {
				console.error("Failed to parse state parameter:", error);
			}
		}
	}, [searchParams]);

	const room = "quickstart-room";
	const name = mediaSettings.username;
	const [roomInstance] = useState(
		() =>
			new Room({
				// Optimize video quality for each participant's screen
				adaptiveStream: true,
				// Enable automatic audio/video quality optimization
				dynacast: true,
			})
	);

	// Handle room exit properly
	const handleLeaveRoom = () => {
		// First disconnect from the room
		roomInstance.disconnect();
		console.log("Disconnected from room");
		// Then navigate away
		router.push("/dashboard");
	};

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const resp = await fetch(`api/token?room=${room}&username=${name}`);
				const data = await resp.json();
				if (!mounted) return;
				if (data.token) {
					await roomInstance.connect(
						process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
						data.token
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
	}, [roomInstance, name, mediaSettings]);

	// if (token === "") {
	// 	return <div>Getting token...</div>;
	// }

	return (
		<RoomContext.Provider value={roomInstance}>
			<div
				data-lk-theme='default'
				style={{ height: "100dvh" }}
			>
				<Button
					onClick={handleLeaveRoom}
					className='absolute top-4 left-4 z-10 bg-red-600 hover:bg-red-700 text-white'
				>
					Leave Room
				</Button>
				{/* Your custom component with basic video conferencing functionality. */}
				<MyVideoConference />
				{/* <VideoConference /> */}

				{/* The RoomAudioRenderer takes care of room-wide audio for you. */}
				<RoomAudioRenderer />
				{/* Controls for the user to start/stop audio, video, and screen share tracks */}
				<ControlBar />
				{/* Menu for selecting audio and video devices */}
				{/* <MediaDeviceMenu /> */}
			</div>
		</RoomContext.Provider>
	);
}

function MyVideoConference() {
	// `useTracks` returns all camera and screen share tracks. If a user
	// joins without a published camera track, a placeholder track is returned.
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false }
	);
	return (
		<GridLayout
			tracks={tracks}
			style={{ height: "calc(100vh - var(--lk-control-bar-height))" }}
		>
			{/* The GridLayout accepts zero or one child. The child is used
      as a template to render all passed in tracks. */}
			<ParticipantTile />
		</GridLayout>
	);
}
