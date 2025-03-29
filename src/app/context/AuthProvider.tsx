"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, checkAndRefreshAuth } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";

// Define the Authentication context shape
interface AuthContextType {
	session: Session | null;
	loading: boolean;
	error: string | null;
	signOut: () => Promise<void>;
	refreshAuth: () => Promise<boolean>;
	isAuthenticated: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
	session: null,
	loading: true,
	error: null,
	signOut: async () => {},
	refreshAuth: async () => false,
	isAuthenticated: false,
});

// Create a hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component to wrap the app and provide auth state
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

	// Sign out function
	const signOut = async () => {
		try {
			await supabase.auth.signOut();
			setSession(null);
		} catch (err) {
			console.error("Error signing out:", err);
			setError("Failed to sign out. Please try again.");
		}
	};

	// Function to refresh authentication
	const refreshAuth = async (): Promise<boolean> => {
		try {
			const result = await checkAndRefreshAuth();

			if (result.isValid && result.session) {
				// Update the session after refresh
				setSession(result.session);
				setError(null);
				return true;
			} else {
				// Don't clear session if there's no explicit error,
				// just return false to indicate the refresh didn't succeed
				if (result.message) {
					setError(result.message);
				}
				return false;
			}
		} catch (err) {
			console.error("Auth refresh error:", err);
			setError("Authentication error. Please try signing in again.");
			return false;
		}
	};

	// Initialize auth state
	useEffect(() => {
		const initAuth = async () => {
			try {
				setLoading(true);

				// Get the initial session
				const { data, error: sessionError } = await supabase.auth.getSession();

				if (sessionError) {
					throw sessionError;
				}

				setSession(data.session);

				// Set up periodic token refresh (every 4 minutes)
				if (data.session) {
					const timer = setInterval(refreshAuth, 4 * 60 * 1000);
					setRefreshTimer(timer);
				}
			} catch (err) {
				console.error("Auth initialization error:", err);
				setError("Failed to initialize authentication");
			} finally {
				setLoading(false);
			}
		};

		initAuth();

		// Listen for authentication changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			async (event: any, currentSession: any) => {

				if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
					setSession(currentSession);
					setError(null);

					// Setup refresh timer if not already set
					if (!refreshTimer && currentSession) {
						const timer = setInterval(refreshAuth, 4 * 60 * 1000);
						setRefreshTimer(timer);
					}
				} else if (event === "SIGNED_OUT") {
					setSession(null);

					// Clear refresh timer
					if (refreshTimer) {
						clearInterval(refreshTimer);
						setRefreshTimer(null);
					}
				}
			}
		);

		// Cleanup subscription and timer on unmount
		return () => {
			subscription.unsubscribe();
			if (refreshTimer) {
				clearInterval(refreshTimer);
			}
		};
	}, []);

	// Context value
	const value = {
		session,
		loading,
		error,
		signOut,
		refreshAuth,
		isAuthenticated: !!session,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Higher-order component to protect routes that require authentication
export function withAuthProtection<P extends object>(
	Component: React.ComponentType<P>
): React.FC<P> {
	return function ProtectedComponent(props: P) {
		const { isAuthenticated, loading, error, refreshAuth } = useAuth();
		const [isRefreshing, setIsRefreshing] = useState(false);
		const [authError, setAuthError] = useState<string | null>(null);
		const [refreshAttempts, setRefreshAttempts] = useState(0);
		const [forceRender, setForceRender] = useState(false);

		console.log("Auth protection status:", { isAuthenticated, loading, error });

		// Force render after 5 seconds regardless of auth state
		useEffect(() => {
			const timer = setTimeout(() => {
				if (loading || isRefreshing) {
					setForceRender(true);
				}
			}, 5000); // 5 second timeout

			return () => clearTimeout(timer);
		}, [loading, isRefreshing]);

		useEffect(() => {
			// Attempt to refresh auth on mount if not authenticated, but limit attempts
			const attemptRefresh = async () => {
				if (!isAuthenticated && !loading && refreshAttempts < 2) {
					setIsRefreshing(true);
					setRefreshAttempts((prev) => prev + 1);
					console.log(`Attempting auth refresh (attempt ${refreshAttempts + 1})`);
					const success = await refreshAuth();
					setIsRefreshing(false);

					if (!success) {
						console.error("Auth refresh failed");
						setAuthError(
							"Please ensure you are logged in and try refreshing the page."
						);
					} else {
						console.log("Auth refresh succeeded");
					}
				}
			};

			attemptRefresh();
		}, [isAuthenticated, loading, refreshAuth, refreshAttempts]);

		// Force render the component if timeout reached or max retries exceeded
		if (forceRender || (refreshAttempts >= 2 && loading)) {
			console.log("Bypassing auth check and rendering component");
			return <Component {...props} />;
		}

		// Show loading state
		if (loading || isRefreshing) {
			return (
				<div className='flex justify-center items-center h-full'>
					<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
					<span className='ml-3'>Verifying authentication...</span>
				</div>
			);
		}

		// Show auth error, but add a bypass option
		if (!isAuthenticated || authError) {
			return (
				<div className='bg-red-100 border-l-4 border-red-500 text-red-700 p-4'>
					<p className='font-bold'>Authentication Warning</p>
					<p>
						{authError ||
							error ||
							"Authentication check didn't complete. You may continue but some features might not work."}
					</p>
					<div className='flex gap-2 mt-2'>
						<button
							onClick={() => window.location.reload()}
							className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm'
						>
							Refresh Page
						</button>
						<button
							onClick={() => setForceRender(true)}
							className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm'
						>
							Continue Anyway
						</button>
					</div>
				</div>
			);
		}

		// Render the protected component if authenticated
		return <Component {...props} />;
	};
}

export default AuthProvider;
