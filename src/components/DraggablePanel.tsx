"use client";
import React, { useState, useEffect, useRef, RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
import FileNamingModal from "./FileNamingModal";

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
	//Going to start the add recording on the draggable panel
	const [isRecording, setIsRecording] = useState(false);
	const [minimized, setMinimized] = useState(false);
	const [connectionState, setConnectionState] = useState<ConnectionStateType>(
		ConnectionStateType.Disconnected
	);

	const [showNamingModal, setShowNamingModal] = useState(false);
	const [customFileName, setCustomFileName] = useState("");
	const [pendingRecording, setPendingRecording] = useState<Blob | null>(null);
	const [chunks, setChunks] = useState<Blob[]>([]);
	const [mediaRecorderRef, setMediaRecorderRef] = useState<MediaRecorder | null>(
		null
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
	const startRecording = async () => {
		try {
			// If already recording, stop it
			if (isRecording) {
				console.log("Stopping recording...");
				if (mediaRecorderRef) {
					mediaRecorderRef.stop();
				}
				setIsRecording(false);
				return;
			}

			// Start new recording
			console.log("Starting recording...");

			// Create a new MediaStream
			const combinedStream = new MediaStream();

			// FIRST: Get screen capture stream with system audio if possible
			try {
				const displayMediaOptions = {
					video: {
						cursor: "always",
						displaySurface: "monitor",
						logicalSurface: true,
						frameRate: 30,
					},
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						sampleRate: 44100,
					},
					selfBrowserSurface: "include",
				};

				console.log("Requesting screen capture...");
				const screenStream =
					await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

				// Add all screen tracks to our stream
				screenStream.getTracks().forEach((track) => {
					console.log(`Adding screen track: ${track.kind}`);
					combinedStream.addTrack(track);
				});
			} catch (error) {
				console.error("Error capturing screen:", error);
				alert(
					"Screen capture is required for recording. Please allow screen sharing."
				);
				return;
			}

			// SECOND: Add LiveKit participant audio if available and connected
			if (
				roomInstance.state === ConnectionStateType.Connected &&
				roomInstance.localParticipant
			) {
				try {
					const trackPublications = Array.from(
						roomInstance.localParticipant.trackPublications.values()
					);

					// Add microphone audio tracks to the combined stream
					trackPublications.forEach((publication) => {
						if (
							publication.track &&
							publication.track.mediaStreamTrack &&
							publication.track.kind === "audio"
						) {
							console.log("Adding LiveKit audio track");
							combinedStream.addTrack(publication.track.mediaStreamTrack);
						}
					});
				} catch (error) {
					console.log("No LiveKit audio tracks available:", error);
					// Continue without LiveKit audio
				}
			}

			// Prepare to store recording chunks
			const newChunks: Blob[] = [];
			setChunks(newChunks);

			// Configure media recorder with best codec options
			const mimeType = "video/webm;codecs=vp9,opus";
			const mediaRecorder = new MediaRecorder(combinedStream, {
				mimeType,
				videoBitsPerSecond: 3000000, // 3 Mbps for good quality
			});

			// Handle recording data
			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					newChunks.push(e.data);
					console.log(`Recorded chunk: ${e.data.size} bytes`);
				}
			};

			// Get current user ID for organizing recordings
			const getUserId = async () => {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				return user?.id || "anonymous";
			};

			// Handle recording stop and upload
			mediaRecorder.onstop = async () => {
				// Stop all tracks we're recording from
				combinedStream.getTracks().forEach((track) => track.stop());

				// Create final recording blob from chunks
				const recordingBlob = new Blob(newChunks, { type: "video/webm" });

				// Store the blob and show naming modal
				setPendingRecording(recordingBlob);
				setShowNamingModal(true);
			};

			// Save reference to recorder
			setMediaRecorderRef(mediaRecorder);

			// Start recording with 1-second chunks
			mediaRecorder.start(1000);
			console.log("Recording started!");

			// Update state to show recording is active
			setIsRecording(true);
		} catch (error: any) {
			console.error("Recording error:", error);
			alert(`Recording error: ${error.message}`);
			setIsRecording(false);
		}
	};
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

	// Add the function to handle upload with custom filename
	const handleUploadWithCustomName = async (customName: string) => {
		try {
			if (!pendingRecording) {
				console.log("No pending recording to upload");
				return;
			}

			const userId = await getUserId();
			console.log("Getting our userId", userId);

			// Clean up the custom name to remove special characters
			const safeCustomName = customName.replace(/[^\w\s-]/g, "").trim();

			// Include timestamp for uniqueness but put custom name first
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const fileName = `${safeCustomName}-${timestamp}.webm`;
			console.log("Recording saved as:", fileName);

			// Step 1: Get presigned URL from server using s3-bucket endpoint
			console.log("Requesting upload URL...");
			const response = await fetch("/api/s3-bucket", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fileName, userId }),
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			console.log("Got presigned URL:", data.url);

			// Step 2: Upload directly to S3 using XMLHttpRequest
			console.log("Uploading to S3...");

			// Show upload in progress message
			alert("Starting upload with name: " + safeCustomName);

			// Create a promise to handle the upload asynchronously
			const uploadPromise = new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("PUT", data.url);
				xhr.setRequestHeader("Content-Type", "video/webm");

				// Handle upload progress
				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						const percentComplete = Math.round((event.loaded / event.total) * 100);
						console.log(`Upload progress: ${percentComplete}%`);
					}
				};

				// Handle success
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						console.log("Upload successful:", xhr.status);
						resolve(xhr.response);
					} else {
						console.error("Upload failed:", xhr.status, xhr.statusText);
						reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
					}
				};

				// Handle errors
				xhr.onerror = () => {
					console.error("Network error during upload");
					reject(new Error("Network error during upload"));
				};

				// Send the blob
				xhr.send(pendingRecording);
			});

			await uploadPromise;
			console.log("Recording uploaded successfully!");
			alert("Recording uploaded successfully!");

			// Clear the pending recording
			setPendingRecording(null);
		} catch (error: any) {
			console.error("Error uploading recording:", error);
			alert(`Error uploading recording: ${error.message}`);
			setPendingRecording(null);
		}
	};

	// Get user ID helper function
	const getUserId = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return user?.id || "anonymous";
	};

	return (
		<>
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
						// top left from what i have seen puts your panel wherever you left it before hiding
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
							<div className='flex space-x-1'>
								{/* Add recording button here */}
								<button
									onClick={startRecording}
									className='text-white hover:bg-red-700 rounded p-1'
								>
									{isRecording ? "■" : "●"}
								</button>
							</div>
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
										className='w-full yellow-camera-controls'
										controls={{ camera: true, microphone: true }}
										style={{ width: "100%" } as React.CSSProperties}
									/>
								</div>
							)}
						</div>
					</RoomContext.Provider>
				</div>
			</Draggable>

			{/* Add file naming modal */}
			<FileNamingModal
				isOpen={showNamingModal}
				onClose={() => {
					setShowNamingModal(false);
					setPendingRecording(null); // Discard recording if canceled
				}}
				onConfirm={(filename) => {
					setShowNamingModal(false);
					handleUploadWithCustomName(filename);
				}}
			/>
		</>
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
			{/* Renders particapant panel */}
			{tracks.map((trackReference) => (
				<ParticipantTile
					key={trackReference.participant.identity + trackReference.source}
					trackRef={trackReference}
				/>
			))}
		</div>
	);
}
