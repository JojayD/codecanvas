"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom } from "@/lib/supabaseRooms";
import { supabase } from "@/lib/supabase";
import { getUserName } from "@/app/utils/supabase/lib/supabaseGetUserName";
import { getUserId } from "@/app/utils/supabase/lib/supabaseGetUserId";
import Image from "next/image";
import { CiCamera } from "react-icons/ci";
import { AiFillAudio } from "react-icons/ai";
import { useDashboard } from "@/app/context/DashboardContextProvider";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
export default function Dashboard() {
	const {
		id,
		last_login_date,
		current_streak,
		longest_streak,
		setLastLoginDate,
		setCurrentStreak,
		setLongestStreak,
	} = useDashboard();
	const router = useRouter();
	const [roomIdInput, setRoomIdInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [userName, setUserName] = useState("");
	const [enableAudio, setEnableAudio] = useState(true);
	const [enableCamera, setEnableCamera] = useState(true);
	const [showUpdates, setShowUpdates] = useState(false);
	const updatesDropdownRef = useRef<HTMLDivElement>(null);
	const hasUpdatedStreak = useRef<boolean>(false);
	const hasUpdatedStreakToday = useRef<boolean>(false);
	const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setUserName(e.target.value);
	};

	const calculateStreak = () => {
		console.log("CALCULATE STREAK STARTED");
		console.log("Initial values:", {
			last_login_date,
			current_streak,
			longest_streak,
			hasUpdated: hasUpdatedStreak.current,
		});

		if (!last_login_date) {
			console.log("Setting streak to 1");
			setCurrentStreak(1);
			setLongestStreak(Math.max(1, longest_streak));
			return {
				newCurrentStreak: 1,
				newLongestStreak: Math.max(1, longest_streak),
			};
		}

		const lastLoginDay = new Date(last_login_date);
		lastLoginDay.setHours(0, 0, 0, 0);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Get date strings for easier debugging
		const lastLoginStr = lastLoginDay.toLocaleDateString();
		const todayStr = today.toLocaleDateString();

		const diffInDays = Math.floor(
			(today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24)
		);
		console.log(
			`Diff in days: ${diffInDays}, Last login: ${lastLoginStr}, Today: ${todayStr}`
		);

		let newCurrentStreak = current_streak;

		if (diffInDays > 1) {
			newCurrentStreak = 1;
		} else if (diffInDays === 1) {
			newCurrentStreak = current_streak + 1;
		} else if (diffInDays === 0) {
			console.log(
				"ℹ️ Same day login, maintaining current streak:",
				current_streak
			);
		} else {
			console.log(diffInDays);
		}

		console.log("Updating streak from", current_streak, "to", newCurrentStreak);
		setCurrentStreak(newCurrentStreak);

		let newLongestStreak = longest_streak;
		if (newCurrentStreak > longest_streak) {
			console.log("New longest streak achieved:", newCurrentStreak);
			newLongestStreak = newCurrentStreak;
			setLongestStreak(newCurrentStreak);
		}

		return { newCurrentStreak, newLongestStreak };
	};

	const updateStreak = () => {
		if (id) {
			return calculateStreak();
		} else {
			console.log("No ID found");
			return null;
		}
	};
	/**
	 * UseEfect to check permission status
	 */

	useEffect(() => {
		const lastStreakUpdate = localStorage.getItem("lastStreakUpdate");
		const today = new Date().toDateString();

		if (lastStreakUpdate === today) {
			hasUpdatedStreak.current = true; // Set the ref to true if already updated today
			console.log("Already updated streak today, skipping update");
		} else {
			hasUpdatedStreak.current = false; // Reset the ref if it's a new day
		}
	}, []);

	useEffect(() => {
		if (id !== null && last_login_date !== null) {
			console.log("All data loaded, ready to calculate streak");
			setIsLoading(false);
		}
	}, [id, last_login_date]);

	useEffect(() => {
		// use localstorage to determine if we update it or not !!
		const lastStreakUpdate = localStorage.getItem("lastStreakUpdate");
		const today = new Date().toDateString();

		if (lastStreakUpdate === today) {
			hasUpdatedStreakToday.current = true;
			console.log("Already updated streak today, skipping update");
		} else {
			hasUpdatedStreakToday.current = false;
		}
	}, []);

	useEffect(() => {
		async function updateStreakUser() {
			if (
				id &&
				!isLoading &&
				!hasUpdatedStreak.current &&
				!hasUpdatedStreakToday.current
			) {
				console.log("Conditions met for streak update");
				hasUpdatedStreak.current = true;

				// Update streak calculation and get new values
				const streakResult = updateStreak();
				if (!streakResult) return;

				const { newCurrentStreak, newLongestStreak } = streakResult;

				// Determine if we need to update the last_login_date
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				let shouldUpdateLoginDate = false;

				if (last_login_date) {
					const lastLoginDay = new Date(last_login_date);
					lastLoginDay.setHours(0, 0, 0, 0);
					const diffInDays = Math.floor(
						(today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24)
					);

					// Only update last_login_date if it's a different day
					shouldUpdateLoginDate = diffInDays > 0;
					console.log(
						"Should update login date?",
						shouldUpdateLoginDate,
						"diffInDays:",
						diffInDays
					);
				} else {
					// If no last_login_date, we should update it
					shouldUpdateLoginDate = true;
				}

				const { error } = await supabase
					.from("profiles")
					.update({
						// Only update last_login_date if needed
						...(shouldUpdateLoginDate
							? { last_login_date: new Date().toISOString() }
							: {}),
						current_streak: newCurrentStreak, // Use the new calculated value
						longest_streak: newLongestStreak, // Use the new calculated value
					})
					.eq("id", id);

				if (error) {
					console.error("Error updating streak:", error);
				} else {
					// Mark that we've updated the streak today
					localStorage.setItem("lastStreakUpdate", new Date().toDateString());
					hasUpdatedStreakToday.current = true;
					console.log(
						"Streak updated successfully in database, won't update again today"
					);
				}
			} else {
				console.log("No streak update needed:", {
					id,
					hasUpdated: hasUpdatedStreak.current,
					isLoading,
					hasUpdatedToday: hasUpdatedStreakToday.current,
				});
			}
		}

		updateStreakUser();

		// Keep your cleanup function
		return () => {
			console.log("Resetting hasUpdatedStreak on cleanup");
			hasUpdatedStreak.current = false;
		};
	}, [id, isLoading, last_login_date, hasUpdatedStreakToday]);

	const resetStreakUpdateFlag = () => {
		hasUpdatedStreak.current = false;
		calculateStreak();
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
			localStorage.setItem("enableAudio", enableAudio.toString());
			localStorage.setItem("enableCamera", enableCamera.toString());
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
					<div className='flex items-center'>
						<Image
							src='/codecanvastransparent.png'
							alt='Code Canvas'
							width={60}
							height={60} // Keep this for aspect ratio, but adjust CSS for dynamic height
							className='w-auto h-16' // Dynamic height
						/>

						{/* Streak indicator */}
						<div className='ml-4 bg-blue-700 px-3 py-1 rounded-lg flex flex-row preserve-blue'>
							{isLoading ? (
								<div className='text-xl font-bold text-white flex items-center'>
									<svg
										className='animate-spin h-5 w-5 mr-2'
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
									Loading...
								</div>
							) : (
								<div className='text-xl font-bold text-white flex items-center'>
									{current_streak} day{current_streak !== 1 ? "s" : ""}
									<span className='text-yellow-300 ml-1'>🔥</span>
								</div>
							)}
						</div>
					</div>
					<div className='flex items-center gap-1.5'>
						<ThemeToggle />
						<Button
							variant='outline'
							className='bg-orange-500 text-white hover:bg-orange-700 mr-2 preserve-orange'
						>
							<Link href='/recordings'>Recordings</Link>
						</Button>
						<Button
							onClick={() => setShowUpdates(!showUpdates)}
							variant='outline'
							className='bg-green-500 text-white hover:bg-green-700 mr-2 preserve-green'
						>
							Updates ✨
						</Button>

						{showUpdates && (
							<div
								ref={updatesDropdownRef}
								className='absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden'
								style={{ maxHeight: "400px" }}
							>
								<div className='py-2 px-3 bg-blue-600 text-white font-medium'>
									Patch Updates
								</div>
								<div className='max-h-80 overflow-y-auto'>
									<div className='p-3'>
										<div className='font-medium'>v1.2 - May 8, 2025</div>
										<ul className='mt-1 text-sm text-gray-700 ml-4 list-disc space-y-1'>
											<li>Enhanced Video Chat with screen sharing</li>
											<li>Improved UI with better navigation and accessibility</li>
											<li>Interview Recording and Playback features</li>
										</ul>
									</div>
									<div className='p-3'>
										<div className='font-medium'>v1.1 - April 27, 2025</div>
										<ul className='mt-1 text-sm text-gray-700 ml-4 list-disc space-y-1'>
											<li>Real-time video chat</li>
											<li>Improved UI/UX design</li>
											<li>Removed shapes for simplicity</li>
										</ul>
									</div>
									<div className='p-3'>
										<div className='font-medium'>v1.0 - April 21, 2025</div>
										<ul className='mt-1 text-sm text-gray-700 ml-4 list-disc space-y-1'>
											<li>Initial release of CodeCanvas</li>
											<li>Basic code collaboration features</li>
											<li>Prompt, Whiteboard, Coding IDE</li>
										</ul>
									</div>
								</div>
							</div>
						)}

						<Button
							onClick={handleLogout}
							variant='outline'
							className='bg-red-600 text-white preserve-red'
						>
							Logout
						</Button>
					</div>
				</div>
			</header>

			<main className='flex-grow flex items-center justify-center p-8 dark:bg-gray-700'>
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
						<h2 className='text-3xl font-bold mb-4 text-center dark:text-gray-100'>
							Collaborative Coding
						</h2>
						<p className='text-center text-blue-100 mb-6 dark:text-gray-100'>
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
								<span className='dark:text-gray-100'>Real-time code collaboration</span>
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
					<div className='p-8 dark:bg-gray-800'>
						<h2 className='text-2xl font-bold mb-6 text-gray-800 md:text-left text-center dark:text-gray-100'>
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
										<p className='text-sm dark:text-gray-100'>{error}</p>
									</div>
								</div>
							</div>
						)}

						<div className='space-y-6'>
							<div>
								<Label
									htmlFor='username'
									className='text-gray-700 dark:text-gray-100 font-medium block mb-2'
								>
									Your Username
								</Label>
								<Input
									id='username'
									placeholder='Enter your username'
									value={userName}
									onChange={handleUserNameChange}
									className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100'
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
									<span className='bg-white dark:bg-gray-800 px-2 text-gray-500'>
										Or
									</span>
								</div>
							</div>

							<div>
								<Label
									htmlFor='roomId'
									className='text-gray-700 font-medium block mb-2 dark:text-gray-100'
								>
									Join Existing Room
								</Label>
								<div className='flex space-x-2'>
									<Input
										id='roomId'
										placeholder='Enter room ID'
										value={roomIdInput}
										onChange={(e) => setRoomIdInput(e.target.value)}
										className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100'
									/>
									<Button
										onClick={joinExistingRoom}
										className='px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium dark:bg-indigo-700 dark:hover:bg-indigo-800'
									>
										Join
									</Button>
								</div>
							</div>
							{/* Media options section */}
							<div className='flex flex-col gap-3'>
								<h1 className='text-gray-700 dark:text-gray-100 font-medium mb-2'>
									Audio and video are muted when you first join the room, but you can
									enable or adjust them at any time during the call.
								</h1>
							</div>
							{/**End of media options */}
						</div>
					</div>
				</div>
			</main>

			<footer className='bg-blue-600 py-4 shadow-inner'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<p className='text-center text-white dark:text-gray-100 text-sm'>
						© {new Date().getFullYear()} Code Canvas. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
