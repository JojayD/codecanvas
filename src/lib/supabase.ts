import { supabase } from "./supabaseClient";

// Type definitions for Room table
export interface Room {
	id: string;
	roomId?: string;
	name?: string;
	description?: string;
	code?: string;
	prompt?: string;
	created_at?: string;
	updated_at?: string;
	participants?: string[];
	createdAt?: string;
	createdBy?: string;
}

// Konva shape types
export interface KonvaShape {
	id: string;
	type: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
	points?: number[];
	radius?: number;
	text?: string;
	fontSize?: number;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	draggable?: boolean;
	scaleX?: number;
	scaleY?: number;
}

// Whiteboard content structure
export interface WhiteboardContent {
	shapes: KonvaShape[];
	version: number;
	lastUpdated: string;
}

// Type definitions for Whiteboard table
export interface Whiteboard {
	id: string; // UUID primary key
	roomId: string; // Foreign key to rooms table
	content: string; // JSON stringified whiteboard content (WhiteboardContent)
	created_at?: string;
	updated_at?: string;
	createdBy?: string; // Store the creator's UUID
}

// Type for creating a new room
export interface CreateRoomPayload {
	id?: string;
	roomId?: string;
	name: string;
	description: string;
	code: string;
	participants: string[];
	prompt: string;
	created_at: string;
	created_by?: string;
}

// Type for updating a room
export interface UpdateRoomPayload {
	name?: string;
	roomId?: string;
	description?: string;
	code?: string;
	prompt?: string;
	participants?: string[];
}

export { supabase };
