import { createClient } from "@supabase/supabase-js";

// Try to import the fallback config (generated during build)
let fallbackConfig: any = null;
try {
	fallbackConfig = require("./fallback-config.json");
} catch (error) {
	// File might not exist during development
	console.log("No fallback config found, using environment variables");
}

// Get Supabase config from environment or fallback
export const getSupabaseConfig = () => {
	return {
		url:
			process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackConfig?.supabase?.url || "",
		anonKey:
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
			fallbackConfig?.supabase?.anonKey ||
			"",
	};
};

// Get Amplify config from environment or fallback
export const getAmplifyConfig = () => {
	return (
		fallbackConfig?.amplify || {
			API: {
				GraphQL: {
					endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT || "",
					region: process.env.NEXT_PUBLIC_APPSYNC_REGION || "",
					defaultAuthMode: process.env.NEXT_PUBLIC_APPSYNC_AUTH_TYPE || "apiKey",
					apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY || "",
				},
			},
			Auth: {
				Cognito: {
					userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
					userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
					identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || "",
				},
			},
		}
	);
};

// Create Supabase client with fallback
export const createSupabaseClient = () => {
	const config = getSupabaseConfig();

	// Only create client if config is available
	if (config.url && config.anonKey) {
		return createClient(config.url, config.anonKey);
	}

	// Return mock client if config is missing
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
};
