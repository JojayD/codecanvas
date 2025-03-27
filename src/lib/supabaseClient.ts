"use client";
import { createClient } from "@supabase/supabase-js";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
	console.error("Missing Supabase credentials");
}

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Initialize the client only once
if (!supabaseInstance) {
	try {
		supabaseInstance = createClient(
			supabaseUrl as string,
			supabaseAnonKey as string,
			{
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: true,
				},
			}
		);
	} catch (error) {
		console.error("Failed to create Supabase client:", error);
		// We'll return null and handle it below
	}
}

// Export the client (will never be null)
export const supabase = supabaseInstance || createMockClient();

// Check and refresh authentication token
export async function checkAndRefreshAuth() {
	try {
		console.log("Checking auth status...");
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			console.error("Session error:", error.message);
			return {
				isValid: false,
				message: `Session error: ${error.message}`,
			};
		}

		if (!data.session) {
			console.log("No active session found");
			return {
				isValid: false,
				message: "No active session found",
			};
		}

		// Always assume session is valid if we have one
		console.log("Session found and appears valid");
		return {
			isValid: true,
			session: data.session,
		};
	} catch (e) {
		console.error("Auth check failed:", e);
		return {
			isValid: false,
			message: `Auth check error: ${e instanceof Error ? e.message : "Unknown error"}`,
		};
	}
}

// Helper function to create a mock client
function createMockClient() {
	console.warn("Using mock Supabase client");
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
		from: () => ({
			select: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
			insert: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
			update: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
			delete: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
			eq: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
			single: () => ({
				data: null,
				error: new Error("Mock client cannot perform database operations"),
			}),
		}),
		channel: () => ({
			on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
		}),
	} as any;
}
