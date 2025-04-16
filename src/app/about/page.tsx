"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ReactTyped } from "react-typed";
type Props = {};

const typedSentences = [
	"Real-time collaboration",
	"Instant code sync",
	"Low-latency communication",
	"High-intensity collaboration",
];

export default function page({}: Props) {
	const router = useRouter();


	const handleBack = () => {
		console.log("Back button clicked");
		router.push("/");
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-600 py-10 relative overflow-hidden'>
			<div className='absolute top-10 left-10 bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded '>
				<button
					className='text-white'
					onClick={handleBack}
				>
					Back
				</button>
			</div>
			{/* Decorative background elements */}
			<div className='absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none'>
				<div className='absolute top-10 left-10 w-64 h-64 rounded-full bg-yellow-300 blur-3xl'></div>
				<div className='absolute bottom-20 right-20 w-80 h-80 rounded-full bg-blue-300 blur-3xl'></div>
				<div className='absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-pink-300 blur-3xl'></div>

				{/* Code-like pattern elements */}
				<div className='absolute top-20 right-40 text-black text-opacity-10 text-lg'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className='mb-2'
						>
							{"{"}...{"}"}
						</div>
					))}
				</div>
				<div className='absolute bottom-40 left-40 text-black text-opacity-10 text-lg'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className='mb-2'
						>
							{"<"}/{">"}
						</div>
					))}
				</div>
			</div>

			<div className='container mx-auto px-4 py-8 relative z-10 max-w-5xl text-black'>
				{/* Header section */}
				<div className='text-center mb-10'>
					<h1 className='text-4xl md:text-5xl font-bold text-white mb-3'>
						About Code Canvas
					</h1>
					<div className='h-1 w-32 bg-blue-800 mx-auto rounded-full'></div>
				</div>

				{/* First row with three equally spaced items */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
					<div className='bg-white bg-opacity-80 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-white border-opacity-20 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
						<div className='text-blue-800 mb-4 text-3xl'>
							<span className='inline-block p-3 rounded-full bg-blue-100 bg-opacity-80'>
								⚡
							</span>
						</div>
						<h2 className='text-2xl font-bold text-black mb-3'>
							REAL-TIME Collaboration
						</h2>
						<h3 className='text-xl font-semibold text-blue-800 mb-2'>
							Instant Code Sync
						</h3>
						<p className='text-gray-800'>
							Experience seamless real-time code sharing on our interactive
							whiteboard—ideal for live technical interviews and pair programming.
						</p>
					</div>
					<div className='bg-white bg-opacity-80 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-white border-opacity-20 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
						<div className='text-blue-800 mb-4 text-3xl'>
							<span className='inline-block p-3 rounded-full bg-blue-100 bg-opacity-80'>
								🖥️
							</span>
						</div>
						<h2 className='text-2xl font-bold text-black mb-3'>
							Interactive Whiteboard
						</h2>
						<p className='text-gray-800'>
							Our interactive whiteboard is designed for live technical interviews and
							pair programming. It allows you to share your code with your interviewer
							in real-time.
						</p>
					</div>
					<div className='bg-white bg-opacity-80 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-white border-opacity-20 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
						<div className='text-blue-800 mb-4 text-3xl'>
							<span className='inline-block p-3 rounded-full bg-blue-100 bg-opacity-80'>
								🚀
							</span>
						</div>
						<h2 className='text-2xl font-bold text-black mb-3'>Reliable & Fast</h2>
						<p className='text-gray-800'>
							Engineered for low-latency communication, Code Canvas supports
							high-intensity collaboration for teams of any size.
						</p>
					</div>
				</div>

				{/* Second row with typed text and content box */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
					<div className='h-64 md:h-auto flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-white border-opacity-20 text-center'>
						<div className='text-3xl font-bold text-black px-4 py-6 rounded-lg bg-opacity-80 w-full'>
							<span className='text-sm uppercase tracking-wider block mb-2 text-blue-800'>
								Experience
							</span>
							<ReactTyped
								strings={typedSentences}
								typeSpeed={100}
								backSpeed={50}
								loop
							/>
						</div>
					</div>
					<div className='bg-white bg-opacity-80 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-white border-opacity-20'>
						<div className='text-blue-800 mb-4 text-3xl'>
							<span className='inline-block p-3 rounded-full bg-blue-100 bg-opacity-80'>
								💬
							</span>
						</div>
						<h2 className='text-2xl font-bold text-black mb-3'>
							Simulate live coding interviews
						</h2>
						<p className='text-gray-800'>
							Experience our dynamic coding environment that mirrors the pressure and
							pace of live coding interviews. Practice in a realistic setting that
							prepares you for real-world technical challenges.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
