// "use client";
// import { createClient } from "@supabase/supabase-js";

// // Check if we're in a browser environment
// const isBrowser = typeof window !== "undefined";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// // DEBUG: Log environment variable status
// console.log("[SUPABASE DEBUG] Environment variables status:", {
// 	hasUrl: !!supabaseUrl,
// 	hasAnonKey: !!supabaseAnonKey,
// 	url: supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : "undefined",
// });

// // Validate that environment variables are set
// if (!supabaseUrl || !supabaseAnonKey) {
// 	console.error("[SUPABASE ERROR] Missing Supabase credentials");
// }

// // Create a proper Supabase client with error handling
// export const supabase = createClient(
// 	supabaseUrl || "https://placeholder-url.supabase.co",
// 	supabaseAnonKey || "placeholder-key",
// 	{
// 		auth: {
// 			persistSession: true,
// 			autoRefreshToken: true,
// 			detectSessionInUrl: true,
// 		},
// 	}
// );

// // Log client creation success and verify methods
// console.log("[SUPABASE DEBUG] Client created successfully");
// console.log("[SUPABASE DEBUG] Client initialized with methods:", {
// 	hasFromMethod: typeof supabase.from === "function",
// 	hasAuthMethod: typeof supabase.auth === "object",
// 	hasChannelMethod: typeof supabase.channel === "function",
// });

// // Check and refresh authentication token
// export async function checkAndRefreshAuth() {
// 	try {
// 		console.log("Checking auth status...");
// 		const { data, error } = await supabase.auth.getSession();

// 		if (error) {
// 			console.error("Session error:", error.message);
// 			return {
// 				isValid: false,
// 				message: `Session error: ${error.message}`,
// 			};
// 		}

// 		if (!data.session) {
// 			console.log("No active session found");
// 			return {
// 				isValid: false,
// 				message: "No active session found",
// 			};
// 		}

// 		// Always assume session is valid if we have one
// 		console.log("Session found and appears valid");
// 		return {
// 			isValid: true,
// 			session: data.session,
// 		};
// 	} catch (e) {
// 		console.error("Auth check failed:", e);
// 		return {
// 			isValid: false,
// 			message: `Auth check error: ${e instanceof Error ? e.message : "Unknown error"}`,
// 		};
// 	}
// }

// // Helper function to create a mock client
// function createMockClient() {
// 	console.warn(
// 		"[SUPABASE WARNING] Using mock Supabase client - database operations will fail"
// 	);
// 	return {
// 		auth: {
// 			getSession: async () => ({ data: { session: null } }),
// 			onAuthStateChange: () => ({
// 				data: { subscription: { unsubscribe: () => {} } },
// 			}),
// 			signInWithOAuth: async () => ({
// 				error: new Error("Supabase client not initialized"),
// 			}),
// 			signOut: async () => ({ error: null }),
// 		},
// 		from: () => ({
// 			select: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 			insert: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 			update: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 			delete: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 			eq: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 			single: () => ({
// 				data: null,
// 				error: new Error("Mock client cannot perform database operations"),
// 			}),
// 		}),
// 		channel: () => ({
// 			on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
// 		}),
// 	} as any;
// }
// supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
import { supabase } from "@/lib/supabase";
export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);
}

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
