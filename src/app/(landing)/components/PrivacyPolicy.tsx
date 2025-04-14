"use client";
import React from "react";
import { useRouter } from "next/navigation";

const PrivacyPolicy: React.FC = () => {
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
				<div className='pt-7 px-4'>
					<h1 className='text-3xl font-bold mb-4'>Privacy Policy</h1>
					<p className='mb-4'>
						Your privacy is important to us. This Privacy Policy explains how we
						collect, use, and protect your information when you use our services.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						1. Information We Collect
					</h2>
					<p className='mb-4'>
						We may collect personal information such as your name, email address, and
						any other information you provide when you use our services.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						2. How We Use Your Information
					</h2>
					<p className='mb-4'>
						We use your information to provide and improve our services, communicate
						with you, and comply with legal obligations.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						3. Sharing Your Information
					</h2>
					<p className='mb-4'>
						We do not sell or rent your personal information to third parties. We may
						share your information with trusted partners to help us operate our
						services.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>4. Data Security</h2>
					<p className='mb-4'>
						We take reasonable measures to protect your information from unauthorized
						access, use, or disclosure. However, no method of transmission over the
						internet is 100% secure.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>5. Your Rights</h2>
					<p className='mb-4'>
						You have the right to access and correct your personal information. You
						can also object to the processing of your data in certain circumstances.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						6. Changes to This Privacy Policy
					</h2>
					<p className='mb-4'>
						We may update this Privacy Policy from time to time. We will notify you of
						any changes by posting the new Privacy Policy on this page.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>7. Contact Us</h2>
					<p className='mb-4'>
						If you have any questions about this Privacy Policy, please contact us at
						spamusubidump@gmail.com.
					</p>

					<p className='mt-6'>Thank you for trusting us with your information!</p>
				</div>
			</div>
		</div>
	);
};

export default PrivacyPolicy;
