import { createClient } from "@supabase/supabase-js";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Only create the client if the environment variables are available
// or if we're in the browser (to avoid build errors)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create the Supabase client only if credentials exist, otherwise use a mock during build
export const supabase =
	supabaseUrl && supabaseAnonKey
		? createClient(supabaseUrl, supabaseAnonKey)
		: isBrowser
			? null
			: {
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

// Helper function to safely use Supabase (prevents build errors)
export const safeSupabase = {
	auth: {
		getSession: async () => {
			if (!supabase) return { data: { session: null } };
			return supabase.auth.getSession();
		},
		onAuthStateChange: (...args) => {
			if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
			return supabase.auth.onAuthStateChange(...args);
		},
		signInWithOAuth: async (options) => {
			if (!supabase)
				return { error: new Error("Supabase client not initialized") };
			return supabase.auth.signInWithOAuth(options);
		},
	},
};
