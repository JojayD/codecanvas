"use client";
import { supabase } from "../app/utils/supabase/lib/supabaseClient";
import { Whiteboard, WhiteboardContent, KonvaShape } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// Initialize an empty whiteboard content
export const createEmptyContent = (): WhiteboardContent => ({
	shapes: [],
	version: 1,
	lastUpdated: new Date().toISOString(),
});

export async function createWhiteboard(
	roomId: string | number,
	creatorId?: string
): Promise<Whiteboard | null> {
	try {
		const parsedRoomId = typeof roomId === "string" ? parseInt(roomId) : roomId;

		console.log(
			`Creating new whiteboard for room ${parsedRoomId}${creatorId ? ` by user ${creatorId}` : ""}`
		);

		const emptyContent = createEmptyContent();

		const { data, error } = await supabase
			.from("whiteboards")
			.insert([
				{
					// Don't specify id as it's auto-generated
					room_id: parsedRoomId, // Use snake_case to match DB schema
					content: JSON.stringify(emptyContent),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					user_id: creatorId || null, // Use snake_case to match DB schema
				},
			])
			.select()
			.single();

		if (error) throw error;
		console.log("Whiteboard created successfully:", data);
		return data;
	} catch (error) {
		console.error("Error creating whiteboard:", error);
		return null;
	}
}

/**
 * Get whiteboard for a room
 */
export async function getWhiteboard(
	roomId: string | number
): Promise<Whiteboard | null> {
	try {
		// Convert roomId to number if it's a string to match the database type
		const parsedRoomId = typeof roomId === "string" ? parseInt(roomId) : roomId;

		console.log(`Fetching whiteboard for room ${parsedRoomId}`);

		const { data, error } = await supabase
			.from("whiteboards")
			.select("*")
			.eq("room_id", parsedRoomId)
			.single();

		if (error) {
			// If no whiteboard exists, create one
			if (error.code === "PGRST116") {
				console.log("No whiteboard found, creating a new one");
				return createWhiteboard(parsedRoomId);
			}
			throw error;
		}

		console.log("Whiteboard found:", data);
		return data;
	} catch (error) {
		console.error("Error getting whiteboard:", error);
		return null;
	}
}

/**
 * Update whiteboard content
 */
export async function updateWhiteboard(
	id: string,
	content: WhiteboardContent
): Promise<Whiteboard | null> {
	try {
		console.log(`Updating whiteboard ${id} with new content`);

		const { data, error } = await supabase
			.from("whiteboards")
			.update({
				content: JSON.stringify(content),
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		console.log("Whiteboard updated successfully");
		return data;
	} catch (error) {
		console.error("Error updating whiteboard:", error);
		return null;
	}
}

/**
 * Parse whiteboard content from string to WhiteboardContent
 */
export function parseWhiteboardContent(contentStr: string): WhiteboardContent {
	try {
		// Add validation to ensure we're working with a valid JSON string
		if (typeof contentStr !== "string") {
			console.warn("Content is not a string:", contentStr);
			return createEmptyContent();
		}

		// Try to parse the JSON string
		const parsed = JSON.parse(contentStr);

		// Validate the parsed content has the expected structure
		if (!parsed || !Array.isArray(parsed.shapes)) {
			console.warn("Invalid whiteboard content structure:", parsed);
			return createEmptyContent();
		}

		return parsed as WhiteboardContent;
	} catch (error) {
		console.error("Error parsing whiteboard content:", error);
		return createEmptyContent();
	}
}

/**
 * Add a new shape to the whiteboard
 */
export async function addShape(
	whiteboardId: string,
	shape: Omit<KonvaShape, "id">
): Promise<Whiteboard | null> {
	try {
		// Get current whiteboard
		const { data, error } = await supabase
			.from("whiteboards")
			.select("*")
			.eq("id", whiteboardId)
			.single();

		if (error) throw error;

		// Parse content
		const content = parseWhiteboardContent(data.content);

		// Add new shape with unique ID
		const newShape = {
			...shape,
			id: uuidv4(),
		};

		content.shapes.push(newShape);
		content.version += 1;
		content.lastUpdated = new Date().toISOString();

		// Update whiteboard
		return await updateWhiteboard(whiteboardId, content);
	} catch (error) {
		console.error("Error adding shape:", error);
		return null;
	}
}

/**
 * Update an existing shape
 */
export async function updateShape(
	whiteboardId: string,
	shapeId: string,
	updates: Partial<KonvaShape>
): Promise<Whiteboard | null> {
	try {
		// Get current whiteboard
		const { data, error } = await supabase
			.from("whiteboards")
			.select("*")
			.eq("id", whiteboardId)
			.single();

		if (error) throw error;

		// Parse content
		const content = parseWhiteboardContent(data.content);

		// Find and update shape
		const shapeIndex = content.shapes.findIndex((s) => s.id === shapeId);
		if (shapeIndex > -1) {
			content.shapes[shapeIndex] = {
				...content.shapes[shapeIndex],
				...updates,
			};

			content.version += 1;
			content.lastUpdated = new Date().toISOString();

			// Update whiteboard
			return await updateWhiteboard(whiteboardId, content);
		}

		throw new Error(`Shape with ID ${shapeId} not found`);
	} catch (error) {
		console.error("Error updating shape:", error);
		return null;
	}
}

/**
 * Delete a shape
 */
export async function deleteShape(
	whiteboardId: string,
	shapeId: string
): Promise<Whiteboard | null> {
	try {
		// Get current whiteboard
		const { data, error } = await supabase
			.from("whiteboards")
			.select("*")
			.eq("id", whiteboardId)
			.single();

		if (error) throw error;

		// Parse content
		const content = parseWhiteboardContent(data.content);

		// Filter out the shape
		content.shapes = content.shapes.filter((s) => s.id !== shapeId);
		content.version += 1;
		content.lastUpdated = new Date().toISOString();

		// Update whiteboard
		return await updateWhiteboard(whiteboardId, content);
	} catch (error) {
		console.error("Error deleting shape:", error);
		return null;
	}
}

/**
 * Delete whiteboard by room ID
 */
export async function deleteWhiteboardByRoomId(
	roomId: string | number
): Promise<boolean> {
	try {
		// Convert roomId to number if it's a string
		const parsedRoomId = typeof roomId === "string" ? parseInt(roomId) : roomId;

		console.log(
			`ENTERING DELETION STAGE FOR WHITEBOARD of room: ${parsedRoomId}`
		);

		// First, check if a whiteboard exists for this room
		const { data: existingWhiteboard, error: fetchError } = await supabase
			.from("whiteboards")
			.select("id")
			.eq("room_id", parsedRoomId)
			.single();

		if (fetchError) {
			if (fetchError.code === "PGRST116") {
				// No rows returned
				console.log(
					`No whiteboard found for room ${parsedRoomId}, nothing to delete`
				);
				return true; // Consider this a success since there's nothing to delete
			}
			console.error(`Error checking for whiteboard: ${fetchError.message}`);
			throw fetchError;
		}

		console.log(
			`DELETING whiteboard for room ${parsedRoomId}, ID: ${existingWhiteboard?.id}`
		);

		const { error } = await supabase
			.from("whiteboards")
			.delete()
			.eq("room_id", parsedRoomId);

		if (error) {
			console.error(`ERROR deleting whiteboard: ${error.message}`);
			throw error;
		}

		console.log(`SUCCESSFULLY deleted whiteboard for room ${parsedRoomId}`);
		return true;
	} catch (error) {
		console.error("Error deleting whiteboard:", error);
		return false;
	}
}

/**
 * Subscribe to whiteboard changes
 */
export function subscribeToWhiteboardChanges(
	whiteboardId: string,
	callback: (whiteboard: Whiteboard) => void
) {
	console.log(`Setting up whiteboard subscription for ID ${whiteboardId}`);

	return supabase
		.channel(`whiteboard-changes:${whiteboardId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "whiteboards",
				filter: `id=eq.${whiteboardId}`,
			},
			(payload: any) => {
				console.log(`Whiteboard event received:`, payload);
				if (payload.eventType === "DELETE") {
					console.log("Whiteboard was deleted");
					return;
				}

				// Make sure we have a properly formatted whiteboard with string content
				const whiteboard = payload.new as Whiteboard;

				// Check if content is already an object and stringify it if needed
				if (whiteboard.content && typeof whiteboard.content === "object") {
					whiteboard.content = JSON.stringify(whiteboard.content);
				}

				callback(whiteboard);
			}
		)
		.subscribe((status) => {
			console.log(`Whiteboard subscription status:`, status);
		});
}
