import { supabase } from "./supabaseClient";

// Type definitions for Room table
export interface Room {
	id: string;
	name: string;
	description: string;
	code: string;
	created_at: string;
	updated_at: string;
	participants: string[];
	prompt: string;
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
}

// Type for updating a room
export interface UpdateRoomPayload {
	name?: string;
	roomId?: string;
	description?: string;
	code?: string;
	participants?: string[];
	prompt?: string;
}

export { supabase };
