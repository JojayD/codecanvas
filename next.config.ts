/** @type {import('next').NextConfig} */
const nextConfig = {
	// Log environment variables during build
	env: {
		DEPLOY_ENV: process.env.NODE_ENV || 'development',
		SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
		REDIRECT_URL: process.env.NEXT_PUBLIC_REDIRECT_URL || '',
	},
	
	// 1) Add the removeConsole compiler option:
	compiler: {
		// Only remove console.* in production builds
		// removeConsole: process.env.NODE_ENV === "production",
	},

	webpack: (config: any, { isServer }: { isServer: boolean }) => {
		 // Log environment information during build
		if (isServer) {
			console.log('=== BUILD ENVIRONMENT INFO ===');
			console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
			console.log(`NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || '(not set)'}`);
			console.log(`Building for: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}`);
		}
		
		// 2) Keep your existing canvas handling:
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				canvas: false,
			};
		} else {
			config.externals = [...(config.externals || []), "canvas"];
		}

		return config;
	},
};

module.exports = nextConfig;
