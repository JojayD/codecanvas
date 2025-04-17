"use client";

import Link from "next/link";
import Image from "next/image";

export default function CheckEmail() {
	return (
		<div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4'>
			<div className='w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center'>
				<div className='flex justify-center mb-6'>
					<div className='relative w-20 h-20'>
						<Image
							src='/email-sent.svg' // You'll need to create this SVG or use another image
							alt='Email sent'
							fill
							style={{ objectFit: "contain" }}
							className='text-blue-600'
						/>
					</div>
				</div>

				<h1 className='text-2xl font-bold text-gray-800 mb-4'>Check your email</h1>

				<p className='text-gray-600 mb-6'>
					We've sent a magic link to your email address. Click the link in the email
					to sign in to your account.
				</p>

				<div className='text-sm text-gray-500 mb-6'>
					If you don't see the email, check your spam folder or make sure you entered
					the correct email address.
				</div>

				<div className='flex flex-col gap-4'>
					<Link
						href='/signup'
						className='text-blue-600 hover:text-blue-800 font-medium'
					>
						← Back to sign up
					</Link>
				</div>
			</div>
		</div>
	);
}
