"use client";
import React, { useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import {
	createRoomMutation,
	getRoomQuery,
} from "../../api/graphql/GraphQlFunctions";
import { GraphQLResult } from "@aws-amplify/api";

// Create API client
const client = generateClient();
console.log("DEBUG: API client created, client object type:", typeof client);
console.log("DEBUG: API client methods:", Object.keys(client));

const RoomEditor = () => {
	const [roomId, setRoomId] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();

	const createRoom = async () => {
		try {
			setLoading(true);
			setError("");

			const newRoomId = Math.random().toString(36).substring(2, 8);
			console.log("DEBUG: Creating room with ID:", newRoomId);
			console.log("DEBUG: Mutation query being used:", createRoomMutation);

			// Log variables being sent
			const variables = {
				input: {
					id: newRoomId,
					name: "New Room",
					description: "A new collaborative coding room",
					code: "// Start coding here...",
					participants: [],
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
				},
			};
			console.log(
				"DEBUG: Variables being passed to GraphQL:",
				JSON.stringify(variables, null, 2)
			);

			console.log("DEBUG: About to make GraphQL call...");
			const result = (await client.graphql({
				query: createRoomMutation,
				variables,
			})) as GraphQLResult<any>;
			console.log(
				"DEBUG: GraphQL call completed, result:",
				JSON.stringify(result, null, 2)
			);

			if (result.data?.createRoom) {
				console.log(
					"DEBUG: Room created successfully:",
					JSON.stringify(result.data.createRoom, null, 2)
				);

				// Store initial code in localStorage
				localStorage.setItem(`code-${newRoomId}`, "// Start coding here...");

				router.push(`/canvas?roomId=${newRoomId}`);
			} else {
				console.error(
					"DEBUG: Failed to create room, result.errors:",
					JSON.stringify(result.errors, null, 2)
				);
				setError("Failed to create room. Please try again.");
			}
		} catch (error: any) {
			console.error("DEBUG: Error creating room:", error);
			console.error("DEBUG: Error object type:", typeof error);
			console.error("DEBUG: Error object keys:", Object.keys(error));

			if (error.errors) {
				console.error(
					"DEBUG: GraphQL errors array:",
					JSON.stringify(error.errors, null, 2)
				);
				console.error("DEBUG: First error message:", error.errors[0]?.message);
				console.error("DEBUG: First error path:", error.errors[0]?.path);
				console.error("DEBUG: First error locations:", error.errors[0]?.locations);
				setError(
					error.errors[0]?.message || "Failed to create room. Please try again."
				);
			} else {
				console.error("DEBUG: No errors array in error object");
				setError("Failed to create room. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	const joinRoom = async (id: string) => {
		if (!id.trim()) {
			setError("Please enter a room ID");
			return;
		}

		try {
			setLoading(true);
			setError("");

			// Verify the room exists
			const result = await client.graphql({
				query: getRoomQuery,
				variables: { id },
			});

			// Type assert the result to have a data property
			const resultData = result as { data: { getRoom?: any } };

			if (resultData.data?.getRoom) {
				console.log("Room found, joining:", resultData.data.getRoom);
				router.push(`/canvas?roomId=${id}`);
			} else {
				setError("Room not found. Please check the ID and try again.");
			}
		} catch (error) {
			console.error("Error joining room:", error);
			setError("Failed to join room. Please check the ID and try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("Error signing out:", error.message);
		} else {
			router.push("/");
		}
	};

	const createRoomWithInput = async () => {
		try {
			setLoading(true);
			setError("");

			const newRoomId = Math.random().toString(36).substring(2, 8);
			console.log("DEBUG: Creating room with ID:", newRoomId);
			console.log("DEBUG: Mutation query being used:", createRoomMutation);

			// Create the room with all required fields according to the schema
			const variables = {
				input: {
					id: newRoomId,
					name: "New Room",
					description: "A new collaborative coding room",
					code: "// Start coding here...",
					participants: [],
					updatedAt: new Date().toISOString(),
					createdAt: new Date().toISOString(),
				},
			};

			console.log(
				"DEBUG: Variables being passed to GraphQL:",
				JSON.stringify(variables, null, 2)
			);

			console.log("DEBUG: About to make GraphQL call...");
			const result = (await client.graphql({
				query: createRoomMutation,
				variables,
			})) as GraphQLResult<any>;

			console.log(
				"DEBUG: GraphQL call completed, result:",
				JSON.stringify(result, null, 2)
			);

			if (result.data?.createRoom) {
				console.log(
					"DEBUG: Room created successfully:",
					JSON.stringify(result.data.createRoom, null, 2)
				);

				// Store initial code in localStorage
				localStorage.setItem(`code-${newRoomId}`, "// Start coding here...");

				router.push(`/canvas?roomId=${newRoomId}`);
			} else {
				console.error(
					"DEBUG: Failed to create room, result.errors:",
					JSON.stringify(result.errors, null, 2)
				);
				setError("Failed to create room. Please try again.");
			}
		} catch (error: any) {
			console.error("DEBUG: Error creating room:", error);
			console.error("DEBUG: Error object type:", typeof error);
			console.error("DEBUG: Error object keys:", Object.keys(error));

			if (error.errors) {
				console.error(
					"DEBUG: GraphQL errors array:",
					JSON.stringify(error.errors, null, 2)
				);
				console.error("DEBUG: First error message:", error.errors[0]?.message);
				console.error("DEBUG: First error path:", error.errors[0]?.path);
				console.error("DEBUG: First error locations:", error.errors[0]?.locations);
				setError(
					error.errors[0]?.message || "Failed to create room. Please try again."
				);
			} else {
				console.error("DEBUG: No errors array in error object");
				setError("Failed to create room. Please try again.");
			}
		} finally {
			setLoading(false);
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
								onClick={createRoomWithInput}
								className='w-full py-2'
								disabled={loading}
							>
								{loading ? "Creating..." : "Create New Room"}
							</Button>
						</div>

						<div className='text-center'>OR</div>

						<div className='space-y-2'>
							<input
								type='text'
								placeholder='Enter room ID'
								value={roomId}
								onChange={(e) => setRoomId(e.target.value)}
								className='w-full p-2 border rounded'
							/>
							<Button
								onClick={() => joinRoom(roomId)}
								className='w-full py-2'
								disabled={loading}
							>
								{loading ? "Joining..." : "Join Room"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomEditor;
