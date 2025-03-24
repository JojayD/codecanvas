"use client";
import { createClient } from "@supabase/supabase-js";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseClient;

if (isBrowser) {
	try {
		if (supabaseUrl && supabaseAnonKey) {
			supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
		} else {
			console.error("Missing Supabase credentials");
			supabaseClient = createMockClient();
		}
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
