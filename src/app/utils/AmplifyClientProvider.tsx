"use client";

import React, { useEffect } from "react";
import { configureAmplify } from "./amplify-config";
import { configureAmplifyWithEnv } from "../../lib/amplify-env-config";

interface AmplifyClientProviderProps {
	children: React.ReactNode;
}

export default function AmplifyClientProvider({
	children,
}: AmplifyClientProviderProps) {
	useEffect(() => {
		// Try to configure using environment variables first (safer for git)
		configureAmplifyWithEnv();

		// Fallback to direct config file if needed
		// configureAmplify();
	}, []);

	return <>{children}</>;
}
