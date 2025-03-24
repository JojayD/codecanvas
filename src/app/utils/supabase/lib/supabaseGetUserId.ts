import { supabase } from "@/lib/supabaseClient";

/**
 * Get the current user's UUID from Supabase auth
 * @returns The user's UUID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
	const { data, error } = await supabase.auth.getSession();
	if (error) {
		console.error("Error retrieving session:", error);
		return null;
	}
	if (data.session) {
		return data.session.user.id; // This is the UUID
	}
	return null;
}
