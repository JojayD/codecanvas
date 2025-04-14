"use client";

import { useRouter } from "next/navigation";
import React from "react";

const TermsOfService: React.FC = () => {
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
				<div className='pt-7 px-4'>
					<h1 className='text-3xl font-bold mb-4'>Terms of Service</h1>
					<p className='mb-4'>
						Welcome to our platform. By accessing or using our real-time interview
						collaboration tools, you agree to the following terms and conditions.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						1. Acceptance of Terms
					</h2>
					<p className='mb-4'>
						By using this service, you agree to be bound by these Terms of Service and
						all applicable laws. If you do not agree, please do not use the
						application.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						2. Service Description
					</h2>
					<p className='mb-4'>
						This platform provides a real-time whiteboard and code editor for
						collaborative technical interviews. Features may include real-time
						collaboration, drawing tools, and user authentication.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						3. Account Responsibilities
					</h2>
					<p className='mb-4'>
						You are responsible for maintaining the security of your account
						credentials. You must notify us immediately of any unauthorized access or
						suspected breach of security.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>4. Acceptable Use</h2>
					<p className='mb-4'>
						You agree not to misuse the platform, interfere with other users'
						sessions, or upload malicious content. We reserve the right to suspend
						accounts that violate these rules.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>5. Data and Privacy</h2>
					<p className='mb-4'>
						User data, session content, and authentication are managed via Supabase.
						By using the platform, you consent to our data practices as outlined in
						our Privacy Policy.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						6. Service Availability
					</h2>
					<p className='mb-4'>
						While we aim for a reliable experience, we do not guarantee uninterrupted
						access. Downtime or performance issues may occur due to updates,
						maintenance, or third-party services.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>
						7. Limitation of Liability
					</h2>
					<p className='mb-4'>
						This platform is provided "as is" without warranties of any kind. We are
						not liable for loss of data, interruptions, or outcomes resulting from use
						of the service.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>8. Changes to Terms</h2>
					<p className='mb-4'>
						We may update these terms periodically. Continued use of the platform
						after changes constitutes your acceptance of the revised terms.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>9. Governing Law</h2>
					<p className='mb-4'>
						These Terms of Service are governed by the laws of the jurisdiction where
						our company is established.
					</p>

					<h2 className='text-2xl font-semibold mt-6 mb-2'>10. Contact</h2>
					<p className='mb-4'>
						For any questions or concerns, please contact us at
						support@yourappdomain.com.
					</p>

					<p className='mt-6'>Thank you for using our platform!</p>
				</div>
			</div>
		</div>
	);
};

export default TermsOfService;
