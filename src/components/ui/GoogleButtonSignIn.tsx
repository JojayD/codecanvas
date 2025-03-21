// components/GoogleLoginButton.tsx
import { supabase } from "../../app/utils/supabase/lib/supabaseClient";
import Image from "next/image";

export default function GoogleLoginButton() {
	const signInWithGoogle = async () => {
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
			});
			if (error) {
				console.error("Error signing in:", error.message);
			}
		} catch (err) {
			console.error("Google sign-in error:", err);
		}
	};

	return (
		<button
			onClick={signInWithGoogle}
			className='flex items-center justify-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg shadow-md transition-colors'
		>
			<Image
				src='/logo-google.svg'
				alt='Google Logo'
				width={20}
				height={20}
				className='w-5 h-5'
			/>
			<span>Sign in with Google</span>
		</button>
	);
}
