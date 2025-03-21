import { createClient } from "@supabase/supabase-js";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Get the Supabase URL and key with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Make a client if we have credentials, otherwise use a mock
let supabaseClient;

// In browser context, always try to create a real client
if (isBrowser) {
	try {
		supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
	} catch (error) {
		console.error("Failed to create Supabase client:", error);
		// Fallback to mock if creation fails
		supabaseClient = createMockClient();
	}
} else {
	// During build time, use a mock
	supabaseClient = createMockClient();
}

// Helper function to create a mock client
function createMockClient() {
	return {
		auth: {
			getSession: async () => ({ data: { session: null } }),
			onAuthStateChange: () => ({
				data: { subscription: { unsubscribe: () => {} } },
			}),
			signInWithOAuth: async () => ({
				error: new Error("Supabase client not initialized"),
			}),
			signOut: async () => ({ error: null }),
		},
	};
}

// Export the client (will never be null)
export const supabase = supabaseClient;
