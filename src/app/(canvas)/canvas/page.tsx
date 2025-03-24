"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useRoom } from "@/app/context/RoomContextProivider";
import CodeEditor from "@/app/(canvas)/components/CodeEditor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import WhiteBoard from "@/app/(canvas)/components/WhiteBoard";
import Prompt from "@/app/(canvas)/components/Prompt";

// Define participant interface
interface Participant {
	userId: string;
	username: string;
}

// Participants display component
const ParticipantsList = ({
	participants,
}: {
	participants: Participant[];
}) => (
	<div className='p-2 bg-blue-100 rounded mb-2 flex gap-2 flex-wrap'>
		{participants.map((p) => (
			<div
				key={p.userId}
				className='px-2 py-1 bg-blue-200 text-sm rounded-full'
			>
				{p.username}
			</div>
		))}
	</div>
);

// Canvas content wrapped with Room context
const CanvasContent = () => {
	const {
		roomId,
		participants,
		code,
		updateCode,
		loading,
		error,
		joinRoom,
		currentUser,
	} = useRoom();
	const [language, setLanguage] = useState("typescript");
	const [joined, setJoined] = useState(false);

	// Use React useEffect to join the room when the component mounts
	useEffect(() => {
		const autoJoin = async () => {
			if (joined) return; // Avoid multiple join attempts

			try {
				console.log("Attempting to join room:", roomId);
				await joinRoom();
				console.log("Successfully joined room:", roomId);
				setJoined(true);
			} catch (err) {
				console.error("Failed to join room:", err);
				// We'll show the error in the UI via the error state from context
			}
		};

		if (currentUser.userId && !joined) {
			autoJoin();
		}
	}, [roomId, joinRoom, currentUser.userId, joined]);

	const handleLanguageChange = (language: string) => {
		setLanguage(language);
	};

	const handleCodeChange = (value: string | undefined) => {
		if (value !== undefined) {
			updateCode(value);
		}
	};

	// Show loading state
	if (loading) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
					<p>Loading room data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='h-[calc(100vh-120px)] w-full'>
			{error && (
				<div className='bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4'>
					<p>Error: {error.message}</p>
					<p className='text-sm'>
						You can still use the editor but changes may not be saved.
					</p>
				</div>
			)}

			<div className='flex justify-between items-center mb-2'>
				<div className='bg-blue-50 px-3 py-1 rounded'>Room: {roomId}</div>

				<div className='flex items-center'>
					<span className='mr-2 text-gray-600'>
						Your name: {currentUser.username}
					</span>
					<ParticipantsList participants={participants} />
				</div>
			</div>

			<PanelGroup direction='horizontal'>
				<Panel
					defaultSize={20}
					minSize={10}
				>
					<Prompt />
				</Panel>

				<Panel
					defaultSize={60}
					minSize={30}
				>
					<CodeEditor
						language={language}
						onChange={handleCodeChange}
						onLanguageChange={handleLanguageChange}
						defaultValue={code}
					/>
				</Panel>

				<PanelResizeHandle className='w-1.5 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize' />

				<Panel
					defaultSize={20}
					minSize={10}
				>
					<WhiteBoard />
				</Panel>
			</PanelGroup>
		</div>
	);
};

// Main Canvas component
const Canvas = () => {
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
		<RoomProvider roomId={roomId}>
			<CanvasContent />
		</RoomProvider>
	);
};

export default Canvas;
