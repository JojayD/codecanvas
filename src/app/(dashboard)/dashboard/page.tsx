"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom } from "@/lib/supabaseRooms";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import { getUserName } from "@/app/utils/supabase/lib/supabaseGetUserName";
import { getUserId } from "@/app/utils/supabase/lib/supabaseGetUserId";
import Image from "next/image";
export default function Dashboard() {
	const router = useRouter();
	const [roomIdInput, setRoomIdInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [userName, setUserName] = useState("");

	const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setUserName(e.target.value);
	};

	const createNewRoom = async () => {
		try {
			setLoading(true);
			setError("");

			if (!userName.trim()) {
				setError("Please enter a username");
				return;
			}

			// Save username to localStorage
			localStorage.setItem("username", userName);

			const userId = await getUserId();
			// Generate a larger random ID for better security (6-8 digits)
			const randomRoomId = Math.floor(100000 + Math.random() * 90000000);

			// Add the creator to the participants list with proper format
			const participantString = `${userId}:${userName}`;

			const roomData = {
				roomId: randomRoomId, // Explicitly set the random roomId
				name: userName || "New Room",
				description: "A new collaborative coding room",
				code: "// Start coding here...",
				participants: [], // Add creator as first participant
				prompt: "",
				language: "javascript", // Default language
				created_at: new Date().toISOString(),
				created_by: userId || undefined,
				roomStatus: true,
			};

			console.log("Creating room with data:", roomData);
			// Store the creator ID in localStorage for future host checks
			localStorage.setItem("created_by", userId || "");
			const newRoom = await createRoom(roomData);

			if (newRoom) {
				console.log("Room created successfully:", newRoom);
				// Use the roomId field (random number) for the URL instead of the database ID
				router.push(`/canvas?roomId=${newRoom.roomId}`);
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
		if (!userName.trim()) {
			setError("Please enter a username");
			return;
		}
		// Save username to localStorage
		localStorage.setItem("username", userName);

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

	// Add useEffect to load username from localStorage on component mount
	useEffect(() => {
		const savedUsername = localStorage.getItem("username");
		if (savedUsername) {
			setUserName(savedUsername);
		}
	}, []);

	return (
		<div className='min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col'>
			<header className='bg-blue-600 shadow-sm'>
				<div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 flex justify-between items-center'>
					{" "}
					{/* Reduced padding */}
					<div>
						<Image
							src='/codecanvastransparent.png'
							alt='Code Canvas'
							width={60}
							height={60} // Keep this for aspect ratio, but adjust CSS for dynamic height
							className='w-auto h-16' // Dynamic height
						/>
					</div>
					<Button
						onClick={handleLogout}
						variant='outline'
						className='bg-red-600 text-white'
					>
						Logout
					</Button>
				</div>
			</header>

			<main className='flex-grow flex items-center justify-center p-8'>
				<div className='bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full grid md:grid-cols-2 gap-0'>
					{/* Left panel with illustration/graphics */}
					<div className='bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex flex-col justify-center items-center text-white'>
						<div className='mb-6'>
							<Image
								src='/WhiteboardIcon.png'
								alt='Code Canvas'
								width={300}
								height={300}
								className='w-auto h-46' // Dynamic height
							/>
						</div>
						<h2 className='text-3xl font-bold mb-4 text-center'>
							Collaborative Coding
						</h2>
						<p className='text-center text-blue-100 mb-6'>
							Create or join a room to start coding with your team in real-time.
						</p>
						<div className='space-y-3 text-sm'>
							<div className='flex items-center'>
								<svg
									className='w-5 h-5 mr-2'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M5 13l4 4L19 7'
									/>
								</svg>
								<span>Real-time code collaboration</span>
							</div>
							<div className='flex items-center'>
								<svg
									className='w-5 h-5 mr-2'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M5 13l4 4L19 7'
									/>
								</svg>
								<span>Interactive whiteboard</span>
							</div>
							<div className='flex items-center'>
								<svg
									className='w-5 h-5 mr-2'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M5 13l4 4L19 7'
									/>
								</svg>
								<span>Multiple programming languages</span>
							</div>
						</div>
					</div>

					{/* Right panel with forms */}
					<div className='p-8'>
						<h2 className='text-2xl font-bold mb-6 text-gray-800 md:text-left text-center'>
							Welcome Back
						</h2>

						{error && (
							<div className='bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded'>
								<div className='flex'>
									<div className='flex-shrink-0'>
										<svg
											className='h-5 w-5 text-red-500'
											viewBox='0 0 20 20'
											fill='currentColor'
										>
											<path
												fillRule='evenodd'
												d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
												clipRule='evenodd'
											/>
										</svg>
									</div>
									<div className='ml-3'>
										<p className='text-sm'>{error}</p>
									</div>
								</div>
							</div>
						)}

						<div className='space-y-6'>
							<div>
								<Label
									htmlFor='username'
									className='text-gray-700 font-medium block mb-2'
								>
									Your Username
								</Label>
								<Input
									id='username'
									placeholder='Enter your username'
									value={userName}
									onChange={handleUserNameChange}
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
								/>
							</div>

							<div>
								<Button
									onClick={createNewRoom}
									className='w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium'
									disabled={loading}
								>
									{loading ? (
										<>
											<svg
												className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
												xmlns='http://www.w3.org/2000/svg'
												fill='none'
												viewBox='0 0 24 24'
											>
												<circle
													className='opacity-25'
													cx='12'
													cy='12'
													r='10'
													stroke='currentColor'
													strokeWidth='4'
												></circle>
												<path
													className='opacity-75'
													fill='currentColor'
													d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
												></path>
											</svg>
											Creating...
										</>
									) : (
										"Create New Room"
									)}
								</Button>
							</div>

							<div className='relative'>
								<div className='absolute inset-0 flex items-center'>
									<span className='w-full border-t border-gray-300'></span>
								</div>
								<div className='relative flex justify-center text-xs uppercase'>
									<span className='bg-white px-2 text-gray-500'>Or</span>
								</div>
							</div>

							<div>
								<Label
									htmlFor='roomId'
									className='text-gray-700 font-medium block mb-2'
								>
									Join Existing Room
								</Label>
								<div className='flex space-x-2'>
									<Input
										id='roomId'
										placeholder='Enter room ID'
										value={roomIdInput}
										onChange={(e) => setRoomIdInput(e.target.value)}
										className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
									<Button
										onClick={joinExistingRoom}
										className='px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium'
									>
										Join
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			<footer className='bg-blue-600 py-4 shadow-inner'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<p className='text-center text-white text-sm'>
						© {new Date().getFullYear()} Code Canvas. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
