"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { getUserId } from "../utils/supabase/lib/supabaseGetUserId";
type DashboardContextType = {
	id: string | null;
	last_login_date: string | null;
	current_streak: number;
	longest_streak: number;
	setCurrentStreak: React.Dispatch<React.SetStateAction<number>>;
	setLongestStreak: React.Dispatch<React.SetStateAction<number>>;
	setLastLoginDate: React.Dispatch<React.SetStateAction<string | null>>;
};

const DashboardContext = createContext<DashboardContextType | null>(null);

// Client-side only component wrapper
function ClientOnly({ children }: { children: React.ReactNode }) {
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	if (!hasMounted) {
		return null;
	}

	return <>{children}</>;
}

export function DashboardContextProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [lastLoginDate, setLastLoginDate] = useState<string | null>(null);
	const [currentStreak, setCurrentStreak] = useState<number>(1);
	const [longestStreak, setLongestStreak] = useState<number>(1);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const fetchUserData = async () => {
			const userId = await getUserId();
			setUserId(userId);
			if (!userId) {
				return;
			}

			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("last_login_date, current_streak, longest_streak")
					.eq("id", userId)
					.single();

				if (error) {
					console.log("Error fetching user profile in DashboardContextProvider:", error);
					const { data: newData, error: insertError } = await supabase
						.from("profiles")
						.insert({
							id: userId,
							last_login_date: new Date().toISOString(),
							current_streak: 1,
							longest_streak: 1,
						});

					if (insertError) {
						throw insertError;
					}

					// Set initial values for a new user
					setLastLoginDate(new Date().toISOString());
					setCurrentStreak(1);
					setLongestStreak(1);
				} else if (data) {
					setLastLoginDate(data.last_login_date || new Date().toISOString());
					setCurrentStreak(data.current_streak || 1);
					setLongestStreak(data.longest_streak || 1);
				}
			} catch (err) {
			}
		};

		fetchUserData();
	}, []);

	return (
		<DashboardContext.Provider
			value={{
				id: userId,
				last_login_date: lastLoginDate,
				current_streak: currentStreak,
				longest_streak: longestStreak,
				setCurrentStreak,
				setLongestStreak,
				setLastLoginDate,
			}}
		>
			<ClientOnly>{children}</ClientOnly>
		</DashboardContext.Provider>
	);
}

export const useDashboard = () => {
	const context = useContext(DashboardContext);

	if (!context) {
		throw new Error(
			"useDashboard must be used within a DashboardContextProvider"
		);
	}
	return context;
};

export default DashboardContextProvider;
