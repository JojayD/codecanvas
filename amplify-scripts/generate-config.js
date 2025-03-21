const fs = require("fs");
const path = require("path");

console.log("Generating configuration files...");

// Create a fallback configuration based on environment variables
const generateFallbackConfig = () => {
	const config = {
		supabase: {
			url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
			anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
		},
		amplify: {
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
		},
	};

	return config;
};

// Generate the configuration file
try {
	const config = generateFallbackConfig();

	// Ensure directory exists
	const configDir = path.join(__dirname, "../src/config");
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true });
	}

	// Write the fallback config
	fs.writeFileSync(
		path.join(configDir, "fallback-config.json"),
		JSON.stringify(config, null, 2)
	);

	console.log("✅ Configuration file generated successfully.");
} catch (error) {
	console.error("❌ Error generating configuration file:", error);
	process.exit(1);
}
