// This file provides Amplify configuration using environment variables
// which makes it safe to commit to git and deploy with your application

import { Amplify } from "aws-amplify";

export function configureAmplifyWithEnv() {
	if (typeof window !== "undefined") {
		// Only run on client-side
		Amplify.configure(
			{
				// API Configuration
				API: {
					GraphQL: {
						endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT || "",
						region: process.env.NEXT_PUBLIC_APPSYNC_REGION || "",
						defaultAuthMode: (process.env.NEXT_PUBLIC_APPSYNC_AUTH_TYPE ||
							"apiKey") as any,
						apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY || "",
					},
				},
				// Auth Configuration
				Auth: {
					Cognito: {
						userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
						userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
						identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || "",
					},
				},
			},
			{ ssr: true }
		);
	}
}
