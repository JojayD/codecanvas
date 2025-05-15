"use client";

import Link from "next/link";
import React, { useState } from "react";
import Hamburger from "hamburger-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
const Header = () => {
	const [isOpen, setOpen] = useState(false);
	return (
		<div className='sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 dark:from-indigo-800 dark:via-blue-700 dark:to-cyan-600 shadow-lg'>
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
								className='text-white hover:text-cyan-100 bg-blue-700 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-900 px-4 py-2 text-sm font-medium rounded-md transition duration-300'
							>
								Sign Up
							</Link>
							<ThemeToggle />
						</div>
					</div>

					{/* Mobile Menu Button */}
					<div className='md:hidden flex items-center'>
						<Hamburger
							color='white'
							toggled={isOpen}
							toggle={setOpen}
						/>
						{isOpen && (
							<div className='absolute top-16 right-0 w-48 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 dark:from-indigo-800 dark:via-blue-700 dark:to-cyan-600 p-4 rounded-lg shadow-lg flex flex-col space-y-2'>
								<Link
									href='/'
									className='text-white px-3 py-2 rounded-md text-base font-medium'
								>
									About
								</Link>
								<Link
									href='/'
									className='text-white px-3 py-2 rounded-md text-base font-medium'
								>
									Updates
								</Link>
								<Link
									href='/login'
									className='text-white px-3 py-2 rounded-md text-base font-medium'
								>
									Login
								</Link>
								<Link
									href='/signup'
									className='text-white px-3 py-2 rounded-md text-base font-medium'
								>
									Sign Up
								</Link>
								<div className='px-3 py-2'>
									<ThemeToggle />
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Header;
