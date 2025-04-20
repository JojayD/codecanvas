import { supabase } from "@/lib/supabase";

/**
 * Get the current user's UUID from Supabase auth
 * @returns The user's UUID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
	try {
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			console.error("Error retrieving session:", error);
			return null;
		}
		console.log(
			"\n\nHERE IS THE DATA from trying function getUserId\n\n",
			data.session?.user.id
		);
		if (data?.session) {
			return data.session.user.id; // This is the UUID
		}

		return null;
	} catch (error) {
		console.error("Failed to get user ID:", error);
		return null;
	}
}
