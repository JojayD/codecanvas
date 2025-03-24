import { supabase } from "@/lib/supabaseClient";
import { log } from "console";


export async function getUserName(): Promise<string | null> {
	const { data, error } = await supabase.auth.getSession();
	if (error) {
		console.error("Error retrieving session:", error);
		return null;
	}
	if (data.session) {
		const user = data.session.user;
		const userName =
			user.user_metadata.full_name || user.user_metadata.name || user.email;
		console.log("User's name:", userName);
		return userName;
	}
	return null;
}