import { createClient } from "../app/utils/supabase/client";
import type { Json } from "./database.types";

export interface Room {
	id: number;
	roomId?: number;
	name?: string;
	description?: string;
	code?: string;
	prompt?: string;
	created_at?: string;
	updated_at?: string;
	participants?: string[];
	createdAt?: string;
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
	id: number;
	room_id: number;
	content: Json;
	created_at?: string | null;
	updated_at?: string | null;
	user_id?: string | null;
	created_by?: string | null;
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
	updated_at?: string;
}

export const supabase = createClient();
