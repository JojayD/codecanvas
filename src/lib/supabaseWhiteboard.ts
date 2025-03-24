"use client";
import { supabase } from "./supabaseClient";
import { Whiteboard, WhiteboardContent, KonvaShape } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// Initialize an empty whiteboard content
const createEmptyContent = (): WhiteboardContent => ({
	shapes: [],
	version: 1,
	lastUpdated: new Date().toISOString(),
});

/**
 * Create a new whiteboard for a room
 * @param roomId - The ID of the room to create a whiteboard for
 * @param creatorId - The UUID of the user creating the whiteboard (optional)
 * @returns The created whiteboard or null if there was an error
 */
export async function createWhiteboard(
	roomId: string,
	creatorId?: string
): Promise<Whiteboard | null> {
	try {
		const whiteboardId = uuidv4();
		console.log(
			`Creating new whiteboard with ID ${whiteboardId} for room ${roomId}${creatorId ? ` by user ${creatorId}` : ""}`
		);

		const emptyContent = createEmptyContent();

		const { data, error } = await supabase
			.from("whiteboards")
			.insert([
				{
					id: whiteboardId,
					roomId: roomId,
					content: JSON.stringify(emptyContent),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					created_by: creatorId || null,
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
	roomId: string
): Promise<Whiteboard | null> {
	try {
		console.log(`Fetching whiteboard for room ${roomId}`);

		const { data, error } = await supabase
			.from("whiteboards")
			.select("*")
			.eq("roomId", roomId)
			.single();

		if (error) {
			// If no whiteboard exists, create one
			if (error.code === "PGRST116") {
				console.log("No whiteboard found, creating a new one");
				return createWhiteboard(roomId);
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
	content: string
): Promise<Whiteboard | null> {
	try {
		console.log(`Updating whiteboard ${id} with new content`);

		const { data, error } = await supabase
			.from("whiteboards")
			.update({
				content,
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
		return JSON.parse(contentStr) as WhiteboardContent;
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
		return await updateWhiteboard(whiteboardId, JSON.stringify(content));
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
			return await updateWhiteboard(whiteboardId, JSON.stringify(content));
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
		return await updateWhiteboard(whiteboardId, JSON.stringify(content));
	} catch (error) {
		console.error("Error deleting shape:", error);
		return null;
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
				callback(payload.new as Whiteboard);
			}
		)
		.subscribe((status: { event: string; status: string }) => {
			console.log(`Whiteboard subscription status:`, status);
		});
}
