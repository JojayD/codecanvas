"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import GoogleLoginButton from "@/components/ui/GoogleButtonSignIn";
import GithubLoginButton from "@/components/ui/GithubButtonSignIn";
export default function LoginPage() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		setLoading(false);
		if (error) setError(error.message);
		else router.push("/dashboard");
	};

	const handleOAuth = async (provider: "google" | "github") => {
		setLoading(true);
		const { error } = await supabase.auth.signInWithOAuth({ provider });
		setLoading(false);
		if (error) setError(error.message);
	};

	return (
		<div className='min-h-screen flex'>
			{/* Left Panel */}
			<div className='w-1/2 bg-blue-800 flex flex-col items-center justify-center text-white p-12'>
				<div className='relative w-64 h-64 mb-8'>
					<Image
						src='/boycoding.png'
						alt='Coder Illustration'
						fill
						style={{ objectFit: "contain" }}
					/>
				</div>
				<h2 className='text-3xl font-bold mb-2'>Welcome aboard</h2>
				<p className='text-blue-200'>just a couple of clicks and we start</p>
			</div>

			{/* Right Panel */}
			<div className='w-1/2 flex items-center justify-center p-12 bg-white'>
				<div className='w-full max-w-md space-y-6'>
					<h1 className='text-2xl font-semibold text-gray-800 text-center'>
						Welcome
					</h1>
					{error && <div className='text-red-600 text-center'>{error}</div>}

					<form
						onSubmit={handleEmailLogin}
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
						<div>
							<label
								htmlFor='password'
								className='sr-only'
							>
								Password
							</label>
							<input
								id='password'
								type='password'
								placeholder='Password'
								required
								className='w-full px-4 py-2 border rounded-lg focus:ring focus:outline-none'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
							/>
							<div className='text-right mt-1'>
								<a
									href='/auth/reset'
									className='text-sm text-blue-600 hover:underline'
								>
									Forgot password?
								</a>
							</div>
						</div>
						<button
							type='submit'
							className='w-full py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50'
							disabled={loading}
						>
							{loading ? "Logging in…" : "Log in"}
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
						Don’t have an account?{" "}
						<a
							href='/signup'
							className='text-blue-600 hover:underline'
						>
							Sign Up
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
