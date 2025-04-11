"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleLoginButton from "@/components/ui/GoogleButtonSignIn";
import { supabase } from "@/app/utils/supabase/lib/supabaseClient";
import Image from "next/image";

export default function Home() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Check current auth status when component mounts
		const checkUser = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (session) {
					router.push("/dashboard");
				}
			} catch (error) {
				console.error("Auth check error:", error);
			} finally {
				setIsLoading(false);
			}
		};

		checkUser();

		// Subscribe to auth changes
		let subscription = { unsubscribe: () => {} };
		try {
			const { data } = supabase.auth.onAuthStateChange((event, session) => {
				if (event === "SIGNED_IN" && session) {
					router.push("/dashboard");
				}
			});
			if (data) subscription = data.subscription;
		} catch (error) {
			console.error("Auth subscription error:", error);
		}

		// Cleanup subscription on unmount
		return () => {
			subscription.unsubscribe();
		};
	}, [router]);

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
				<div className='animate-pulse flex flex-col items-center'>
					<div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4'></div>
					<p className='text-blue-600 font-medium'>Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
			{/* Hero Section */}
			<div className='container mx-auto px-4 py-16 md:py-24'>
				<div className='flex flex-col md:flex-row items-center'>
					<div className='md:w-1/2 mb-10 md:mb-0'>
						<h1 className='text-4xl md:text-5xl font-bold text-blue-900 mb-4'>
							Code Canvas
						</h1>
						<h2 className='text-2xl md:text-3xl text-blue-700 mb-6'>
							Collaborative Coding Made Simple
						</h2>
						<p className='text-lg text-gray-700 mb-8'>
							A dynamic platform designed to simulate technical whiteboard interviews
							through real-time code collaboration, making it easier to practice,
							learn, and teach coding interview skills.
						</p>
						<div className='flex flex-col sm:flex-row gap-4'>
							<GoogleLoginButton />
							<button
								onClick={() => router.push("/examples")}
								className='px-6 py-3 bg-white text-blue-600 rounded-lg shadow-md hover:bg-blue-50 transition-all'
							>
								See Examples
							</button>
						</div>
					</div>
					<div className='md:w-1/2 flex justify-center'>
						<div className='relative w-full max-w-lg h-72 md:h-96 bg-white p-2 rounded-lg shadow-xl'>
							<div className='absolute top-0 left-0 w-full h-6 bg-gray-200 rounded-t-lg flex items-center px-2'>
								<div className='flex space-x-1'>
									<div className='w-3 h-3 rounded-full bg-red-500'></div>
									<div className='w-3 h-3 rounded-full bg-yellow-500'></div>
									<div className='w-3 h-3 rounded-full bg-green-500'></div>
								</div>
							</div>
							<div className='pt-7 px-4 h-full overflow-hidden font-mono text-sm'>
								<pre className='text-gray-800'>
									<code>
										{`def greet() {
		print("Welcome to Code Canvas!");
	}

	// Real-time collaboration
	// Code sharing
	// And much more...

	greet();`}
									</code>
								</pre>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Features Section */}
			<div className='bg-white py-16'>
				<div className='container mx-auto px-4'>
					<h2 className='text-3xl font-bold text-center text-blue-900 mb-12'>
						Why Choose Code Canvas?
					</h2>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
						{[
							{
								title: "Real-Time Collaboration",
								description:
									"Simulate live technical interviews with instant code sharing and feedback.",
							},
							{
								title: "Interview-Focused Learning",
								description:
									"Designed for practicing data structures, algorithms, and whiteboard-style problem solving.",
							},
							{
								title: "Cross-Platform Access",
								description:
									"Run interviews or practice sessions seamlessly from any device, anywhere.",
							},
						].map((feature, index) => (
							<div
								key={index}
								className='bg-blue-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow'
							>
								<h3 className='text-xl font-semibold text-blue-800 mb-3'>
									{feature.title}
								</h3>
								<p className='text-gray-700'>{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Call to Action */}
			<div className='py-16 bg-blue-600 text-white mt-auto'>
				<div className='container mx-auto px-4 text-center '>
					<h2 className='text-3xl font-bold mb-6'>Ready to start coding?</h2>
					<p className='text-xl mb-8 max-w-2xl mx-auto'>
						Join Code Canvas to practice coding with your friends and teammates.
					</p>
					<div className='mb-4 flex justify-center'>
						<GoogleLoginButton />
					</div>
				</div>
			</div>
		</div>
	);
}
