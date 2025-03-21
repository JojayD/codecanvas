"use client";

import React, { useEffect } from "react";
import { configureAmplify } from "./amplify-config";

interface AmplifyClientProviderProps {
	children: React.ReactNode;
}

export default function AmplifyClientProvider({
	children,
}: AmplifyClientProviderProps) {
	useEffect(() => {
		// Configure Amplify on the client side
		configureAmplify();
	}, []);

	return <>{children}</>;
}
