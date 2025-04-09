import { supabase } from "./supabaseClient";

export interface Room {
	id: string;
	roomId?: number;
	name?: string;
	description?: string;
	code?: string;
	prompt?: string;
	created_at?: string;
	updated_at?: string;
	participants?: string[];
	createdAt?: string;
	createdBy?: string;
	created_by?: string;
	language?: string;
	roomStatus?: boolean;
}

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

export interface WhiteboardContent {
	shapes: KonvaShape[];
	version: number;
	lastUpdated: string;
}

export interface Whiteboard {
	id: string;
	room_id: number;
	content: string;
	created_at?: string;
	updated_at?: string;
	user_id?: string;
}

export interface CreateRoomPayload {
	id?: string;
	roomId?: number;
	name: string;
	description: string;
	code: string;
	participants: string[];
	prompt: string;
	created_at: string;
	created_by?: string;
	language?: string;
	roomStatus?: boolean;
}

export interface UpdateRoomPayload {
	name?: string;
	roomId?: number;
	description?: string;
	code?: string;
	prompt?: string;
	language?: string;
	participants?: string[];
	roomStatus?: boolean;
}

export { supabase };
