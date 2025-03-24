// // src/app/utils/supabase/lib/supabaseClient.js
// import { createClient } from '@supabase/supabase-js';
//
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
//
// if (!supabaseUrl || !supabaseAnonKey) {
//     throw new Error('Missing Supabase environment variables');
// }
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//     auth: {
//         persistSession: true,
//         autoRefreshToken: true,
//         detectSessionInUrl: true,
//     }
// });
"use client";
// lib/supabaseClient.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Create client with error handling
let supabaseInstance: ReturnType<
	typeof createClientComponentClient<any>
> | null = null;

try {
	supabaseInstance = createClientComponentClient<any>({
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
		supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
	});

	// Test if the client is working by accessing a property
	if (!supabaseInstance?.auth) {
		console.error("Supabase client created but auth is not available");
		throw new Error("Invalid Supabase client");
	}
} catch (error) {
	console.error("Failed to initialize Supabase client:", error);
	// We'll return a mock client below
}

// Export a functioning client or a mock
export const supabase = supabaseInstance || {
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
