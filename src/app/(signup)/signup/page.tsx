"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import GoogleLoginButton from "@/components/ui/GoogleButtonSignIn";
import GithubLoginButton from "@/components/ui/GithubButtonSignIn";

export default function SignUpPage() {
	const router = useRouter();

	const [email, setEmail] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
		});

		setLoading(false);
		if (error) {
			setError(error.message);
		} else {
			router.push("/auth/check-email");
		}
	};

	return (
		<div className='min-h-screen flex'>
			{/* Left Panel */}
			<div className='w-1/2 bg-blue-800 flex flex-col items-center justify-center text-white p-12'>
				<Button
					style={{ cursor: "pointer" }}
					className='absolute top-4 left-4 bg-white text-black px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-yellow-400 hover:to-orange-500'
					onClick={() => {
						router.push("/"); // Check if this logs when clicked
					}}
				>
					Back
				</Button>
				<div className='relative w-64 h-64 mb-8'>
					<Image
						src='/boycoding.png'
						alt='Coder Illustration'
						fill
						style={{ objectFit: "contain" }}
					/>
				</div>
				<h2 className='text-3xl font-bold mb-2'>Join Us</h2>
				<p className='text-blue-200'>Create your account to get started</p>
			</div>

			{/* Right Panel */}
			<div className='w-1/2 flex items-center justify-center p-12 bg-white'>
				<div className='w-full max-w-md space-y-6'>
					<h1 className='text-2xl font-semibold text-gray-800 text-center'>
						Sign Up with Email
					</h1>
					{error && <div className='text-red-600 text-center'>{error}</div>}

					<form
						onSubmit={handleSignUp}
						className='space-y-4'
					>
						<div>
							<label
								htmlFor='email'
								className='sr-only'
							>
								Email
							</label>
							<input
								id='email'
								type='email'
								placeholder='Email'
								required
								className='w-full px-4 py-2 border rounded-lg focus:ring focus:outline-none'
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={loading}
							/>
						</div>
						<p className='text-sm text-gray-600 mb-4'>
							We'll send you a magic link to sign up. No password needed!
						</p>
						<button
							type='submit'
							className='w-full py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50'
							disabled={loading}
						>
							{loading ? "Sending magic link..." : "Send Magic Link"}
						</button>
					</form>

					<div className='flex items-center my-4'>
						<hr className='flex-grow border-gray-300' />
						<span className='px-2 text-gray-500'>Or</span>
						<hr className='flex-grow border-gray-300' />
					</div>

					<div className='space-y-3'>
						<div className='w-full'>
							<GoogleLoginButton />
						</div>
						<div className='w-full'>
							<GithubLoginButton />
						</div>
					</div>

					<p className='text-center text-gray-600'>
						Already have an account?{" "}
						<a
							href='/auth/login'
							className='text-blue-600 hover:underline'
						>
							Log In
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
