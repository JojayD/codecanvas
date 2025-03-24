/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config: any, { isServer }: { isServer: boolean }) => {
		// Handle canvas module properly
		if (!isServer) {
			// Don't attempt to import canvas module on client-side
			config.resolve.fallback = {
				...config.resolve.fallback,
				canvas: false,
			};
		} else {
			// On server-side, mock the canvas module
			config.externals = [...(config.externals || []), "canvas"];
		}

		return config;
	},
};

module.exports = nextConfig;
