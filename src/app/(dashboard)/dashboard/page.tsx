"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom } from "@/lib/supabaseRooms";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import { getUserName } from "@/app/utils/supabase/lib/supabaseGetUserName";
import { getUserId } from "@/app/utils/supabase/lib/supabaseGetUserId";

export default function Dashboard() {
	const router = useRouter();
	const [roomIdInput, setRoomIdInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const createNewRoom = async () => {
		try {
			setLoading(true);
			setError("");

			const userName = await getUserName();
			const userId = await getUserId();

			const roomData = {
				name: userName || "New Room",
				description: "A new collaborative coding room",
				code: "// Start coding here...",
				participants: [],
				prompt: "",
				created_at: new Date().toISOString(),
				created_by: userId || undefined,
			};

			console.log("Creating room with data:", roomData);

			const newRoom = await createRoom(roomData);

			if (newRoom) {
				console.log("Room created successfully:", newRoom);
				router.push(`/canvas?roomId=${newRoom.id}`);
			} else {
				setError("Failed to create room. Please try again.");
			}
		} catch (error: any) {
			console.error("Error creating room:", error);
			setError(error.message || "Failed to create room. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const joinExistingRoom = () => {
		if (!roomIdInput.trim()) {
			setError("Please enter a room ID");
			return;
		}
		router.push(`/canvas?roomId=${roomIdInput.trim()}`);
	};

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("Error signing out:", error.message);
		} else {
			router.push("/");
		}
	};

	return (
		<div className='min-h-screen flex flex-col p-4'>
			<div className='flex justify-end mb-4'>
				<Button onClick={handleLogout}>Logout</Button>
			</div>

			<div className='flex flex-col items-center justify-center flex-grow'>
				<div className='bg-white p-6 rounded-lg shadow-md w-full max-w-md'>
					<h2 className='text-2xl font-bold mb-6 text-center'>
						Collaborative Code Canvas
					</h2>

					{error && (
						<div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
							{error}
						</div>
					)}

					<div className='space-y-6'>
						<div>
							<Button
								onClick={createNewRoom}
								className='w-full py-2'
								disabled={loading}
							>
								{loading ? "Creating..." : "Create New Room"}
							</Button>
						</div>

						<div className='relative'>
							<div className='absolute inset-0 flex items-center'>
								<span className='w-full border-t'></span>
							</div>
							<div className='relative flex justify-center text-xs uppercase'>
								<span className='bg-white px-2 text-gray-500'>Or</span>
							</div>
						</div>

						<div className='space-y-4'>
							<div>
								<Label htmlFor='roomId'>Join Existing Room</Label>
								<Input
									id='roomId'
									placeholder='Enter Room ID'
									value={roomIdInput}
									onChange={(e) => setRoomIdInput(e.target.value)}
								/>
							</div>
							<Button
								onClick={joinExistingRoom}
								variant='outline'
								className='w-full'
							>
								Join Room
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
