console.log("Checking required environment variables...");

const requiredVars = [
	"NEXT_PUBLIC_SUPABASE_URL",
	"NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const missing = [];

for (const varName of requiredVars) {
	if (!process.env[varName]) {
		missing.push(varName);
	}
}

if (missing.length > 0) {
	console.error("❌ Missing required environment variables:");
	missing.forEach((varName) => console.error(`   - ${varName}`));
	console.error("Please set these variables in the Amplify Console.");

	// Exit with an error code that will stop the build
	// Comment out this line if you only want warnings
	process.exit(1);
} else {
	console.log("✅ All required environment variables are set.");
}
