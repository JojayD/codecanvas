"use client";
import React from "react";
import { useRouter } from "next/navigation";

const PatchNotes = () => {
	const router = useRouter();

	return (
		<div className='w-full min-h-screen p-6 flex flex-col justify-center items-center bg-gray-100'>
			{/* Main container taking full width */}
			<div className='relative w-full bg-white rounded-lg shadow-xl'>
				{/* Header with buttons */}
				<div className='absolute top-0 left-0 w-full h-6 bg-gray-200 rounded-t-lg flex items-center px-2'>
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
				</div>
				{/* Content */}
				<div>
					<h1 className='text-3xl font-bold mb-4'>Patch Notes</h1>
					<h2>Code Canvas 2.0</h2>
					<ul>
						<li className='mb-2'></li>
						<strong>New Features:</strong>
						<ul className='list-disc ml-6'>
							<li>User can now start calls during the interview</li>
							<li>Improved UI/UX design</li>
						</ul>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default PatchNotes;
