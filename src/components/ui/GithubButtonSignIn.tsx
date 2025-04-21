// src/components/ui/GithubButtonSignIn.tsx
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
export default function GitHubLoginButton() {
	const [isLoading, setIsLoading] = useState(false);

	const signInWithGitHub = async () => {
		setIsLoading(true);

		try {
			if (!supabase || !supabase.auth) {
				console.error("Supabase client or auth is not available");
				throw new Error("Authentication service not available");
			}

			const { error } = await supabase.auth.signInWithOAuth({
				provider: "github",
			});
			if (error) {
				console.error("Error signing in:", error.message);
			}
		} catch (err) {
			console.error("GitHub sign-in error:", err);
			alert("Unable to sign in at this time. Please try again later.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<button
			onClick={signInWithGitHub}
			disabled={isLoading}
			className='relative flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-70'
		>
			{isLoading ? (
				<div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
			) : (
				<FaGithub size={20} />
			)}
			<span>{isLoading ? "Signing in..." : "Sign in with GitHub"}</span>
		</button>
	);
}
