"use client";
import React from "react";
import { useRouter } from "next/navigation";

const PatchNotes = () => {
	const router = useRouter();

	return (
		<div className='w-full min-h-screen bg-gray-100'>
			{/* Main container with max width and center alignment */}
			<div className='relative max-w-5xl mx-auto my-8 bg-white rounded-lg shadow-xl h-[calc(100vh-4rem)]'>
				{/* Header with buttons */}
				<div className='sticky top-0 w-full h-8 bg-gray-200 rounded-t-lg flex items-center px-2'>
					<div className='flex space-x-1'>
						<div
							className='w-3 h-3 rounded-full bg-red-500 cursor-pointer'
							title='Close'
							onClick={() => {
								router.push("/");
							}}
						></div>
						<div
							className='w-3 h-3 rounded-full bg-yellow-500 cursor-pointer'
							title='Minimize'
						></div>
						<div
							className='w-3 h-3 rounded-full bg-green-500 cursor-pointer'
							title='Maximize'
						></div>
					</div>
					<div className='flex-1 text-center text-xs text-gray-500'>
						Code Canvas - Patch Notes
					</div>
				</div>

				{/* Content with scrolling */}
				<div className='p-8 overflow-y-auto h-[calc(100%-2rem)]'>
					<h1 className='text-4xl font-bold mb-6 text-blue-700'>Patch Notes</h1>

					<div className='mb-10'>
						<h2 className='text-2xl font-bold mb-4 text-blue-600'>
							Code Canvas 1.1{" "}
							<span className='text-sm text-gray-500 font-normal'>
								(April 27, 2025)
							</span>
						</h2>
						<div className='border-l-4 border-blue-500 pl-4 mb-6'>
							<h3 className='font-bold text-lg mb-2'>New Features:</h3>
							<ul className='list-disc ml-6 space-y-2'>
								<li>User can now start video calls during coding interviews</li>
								<li>Improved UI/UX design with responsive layouts</li>								
							</ul>
						</div>

						<div className='border-l-4 border-green-500 pl-4 mb-6'>
							<h3 className='font-bold text-lg mb-2'>Improvements:</h3>
							<ul className='list-disc ml-6 space-y-2'>
								<li>Enhanced performance for real-time collaboration</li>
								<li>Better error handling for network disruptions</li>
								<li>Added support for more programming languages</li>
							</ul>
						</div>

						<div className='border-l-4 border-red-500 pl-4'>
							<h3 className='font-bold text-lg mb-2'>Bug Fixes:</h3>
							<ul className='list-disc ml-6 space-y-2'>
								<li>Fixed authentication token expiration handling</li>
							</ul>
						</div>
					</div>

					<div className='mb-10'>
						<h2 className='text-2xl font-bold mb-4 text-blue-600'>
							Code Canvas 1.0{" "}
							<span className='text-sm text-gray-500 font-normal'>
								(April 1, 2025)
							</span>
						</h2>
						<div className='border-l-4 border-blue-500 pl-4'>
							<h3 className='font-bold text-lg mb-2'>Initial Release:</h3>
							<ul className='list-disc ml-6 space-y-2'>
								<li>Basic code editor with syntax highlighting</li>
								<li>Room-based collaboration system</li>
								<li>Simple user authentication</li>
								<li>Text-based communication</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PatchNotes;
