import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Missing Supabase credentials");
	}

	// Create a direct client without cookie handling for API routes
	return createSupabaseClient(supabaseUrl, supabaseKey);
}
