/** @type {import('next').NextConfig} */
const nextConfig = {
	// 1) Add the removeConsole compiler option:
	compiler: {
		// Only remove console.* in production builds
		removeConsole: process.env.NODE_ENV === "production",
	},

	webpack: (config: any, { isServer }: { isServer: boolean }) => {
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
