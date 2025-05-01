import Link from "next/link";
import React from "react";

const Header = () => {
	return (
		<div className='sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 shadow-lg'>
			<div className='max-w-7xl mx-auto'>
				<div className='flex justify-between items-center h-16'>
					{/* Logo Section with Animation */}
					<div className='flex-shrink-0 transform hover:scale-105 transition-transform duration-300'>
						<Link href='/'>
							<img
								src='/codecanvastransparent.png'
								alt='CodeCanvas Logo'
								className='h-12 w-auto sm:h-14 md:h-16 object-contain'
							/>
						</Link>
					</div>

					{/* Navigation Links */}
					<div className='hidden md:block'>
						<div className='flex items-center space-x-8'>
							<Link
								href='/about'
								className='text-white hover:text-cyan-100 px-3 py-2 text-sm font-medium rounded-md transition duration-300'
							>
								About
							</Link>
							<Link
								href='/updates'
								className='text-white hover:text-cyan-100 px-3 py-2 text-sm font-medium rounded-md transition duration-300'
							>
								Updates
							</Link>
							<Link
								href='/login'
								className='text-white hover:text-cyan-100 px-4 py-2 text-sm font-medium rounded-md transition duration-300'
							>
								Login
							</Link>
							<Link
								href='/signup'
								className='text-white hover:text-cyan-100 bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-medium rounded-md transition duration-300'
							>
								Sign Up
							</Link>
						</div>
					</div>

					{/* Mobile Menu Button */}
					<div className='md:hidden flex items-center'>
						<button className='text-white hover:text-cyan-100 focus:outline-none'>
							<svg
								className='h-6 w-6'
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M4 6h16M4 12h16M4 18h16'
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu (Hidden by default) */}
			<div className='hidden md:hidden bg-blue-600 p-4'>
				<div className='flex flex-col space-y-2'>
					<Link
						href='/'
						className='text-white hover:bg-blue-700 px-3 py-2 rounded-md text-base font-medium'
					>
						About
					</Link>

					<Link
						href='/login'
						className='text-white hover:bg-blue-700 px-3 py-2 rounded-md text-base font-medium'
					>
						Login
					</Link>
					<Link
						href='/signup'
						className='text-white bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-md text-base font-medium'
					>
						Sign Up
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Header;
