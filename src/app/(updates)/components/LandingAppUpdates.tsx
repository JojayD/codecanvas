"use client";
import React from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import {
	DotButton,
	useDotButton,
} from "@/components/ui/EmblaCarouselDotButton";
import {
	PrevButton,
	NextButton,
	usePrevNextButtons,
} from "@/components/ui/EmblaCarouselArrowButtons";

// Updates data structure
const updates = [
	{
		version: "Code Canvas 1.2",
		date: "May 8, 2025",
		features: [
			"Users can now record their coding sessions and share them with others",
			"Code Playback with timestamp markers for review",
		],
		improvements: [
			"Optimized UX with smoother transitions and reduced latency",
			"Improved mobile responsiveness for on-the-go collaboration",
		],
		fixes: [
		],
	},
	{
		version: "Code Canvas 1.1",
		date: "April 27, 2025",
		features: [
			"Video calls for collaborative coding interviews",
			"Enhanced whiteboard with TLDraw integration",
			"Responsive UI improvements for all device sizes",
		],
		improvements: [
			"Faster real-time code synchronization",
			"More robust error handling",
			"Additional programming language support",
		],
		fixes: [
			"Fixed authentication token expiration handling",
			"Fixed whiteboard resize issues",
			"Eliminated infinite update loops in TLDraw component",
		],
	},
	{
		version: "Code Canvas 1.0",
		date: "April 1, 2025",
		features: [
			"Basic code editor with syntax highlighting",
			"Room-based collaboration system",
			"Simple user authentication",
			"Text-based communication",
		],
		improvements: [],
		fixes: [],
	},
	// Add more updates here as your app grows
];

const LandingAppUpdates = () => {
	const router = useRouter();
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

	// Use the same dot button controls from your EmblaCarousel
	const { selectedIndex, scrollSnaps, onDotButtonClick } =
		useDotButton(emblaApi);

	// Use the same prev/next button controls from your EmblaCarousel
	const {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	} = usePrevNextButtons(emblaApi);

	return (
		<div className='w-full bg-white bg-opacity-90 rounded-xl shadow-lg'>
			<div className='relative rounded-lg bg-white'>
				{/* Header with styling similar to other components */}
				<div className='sticky top-0 w-full h-10 bg-gray-200 rounded-t-lg flex items-center px-2 z-10'>
					<div className='flex space-x-1'>
						<div
							className='w-3 h-3 rounded-full bg-red-500 cursor-pointer'
							title='Close'
							onClick={() => router.push("/")}
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
					<div className='flex-1 text-center text-sm text-gray-500'>
						Code Canvas - Latest Updates
					</div>
				</div>

				{/* Embla Carousel content section */}
				<div
					className='overflow-hidden'
					ref={emblaRef}
				>
					<div className='flex'>
						{updates.map((update, index) => (
							<div
								className='flex-[0_0_100%] min-w-0'
								key={index}
							>
								<div className='p-6 max-h-[70vh] overflow-y-auto'>
									<h1 className='text-4xl font-bold mb-6 text-blue-700'>
										Latest Updates
									</h1>

									<div className='mb-8'>
										<h2 className='text-2xl font-bold mb-3 text-blue-600'>
											{update.version}{" "}
											<span className='text-base text-gray-500 font-normal'>
												({update.date})
											</span>
										</h2>

										{update.features.length > 0 && (
											<div className='border-l-4 border-blue-500 pl-4 mb-4'>
												<h3 className='font-bold text-lg mb-2'>New Features:</h3>
												<ul className='list-disc ml-6 space-y-1 text-base'>
													{update.features.map((feature, i) => (
														<li key={i}>{feature}</li>
													))}
												</ul>
											</div>
										)}

										{update.improvements.length > 0 && (
											<div className='border-l-4 border-green-500 pl-4 mb-4'>
												<h3 className='font-bold text-lg mb-2'>Improvements:</h3>
												<ul className='list-disc ml-6 space-y-1 text-base'>
													{update.improvements.map((improvement, i) => (
														<li key={i}>{improvement}</li>
													))}
												</ul>
											</div>
										)}

										{update.fixes.length > 0 && (
											<div className='border-l-4 border-red-500 pl-4 mb-4'>
												<h3 className='font-bold text-lg mb-2'>Bug Fixes:</h3>
												<ul className='list-disc ml-6 space-y-1 text-base'>
													{update.fixes.map((fix, i) => (
														<li key={i}>{fix}</li>
													))}
												</ul>
											</div>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Embla Carousel controls */}
				<div className='p-4 border-t border-gray-100'>
					<div className='flex justify-between items-center'>
						<div className='embla__buttons'>
							<PrevButton
								onClick={onPrevButtonClick}
								disabled={prevBtnDisabled}
							/>
							<NextButton
								onClick={onNextButtonClick}
								disabled={nextBtnDisabled}
							/>
						</div>

						<div className='embla__dots'>
							{scrollSnaps.map((_, index) => (
								<DotButton
									key={index}
									onClick={() => onDotButtonClick(index)}
									className={`embla__dot ${index === selectedIndex ? "embla__dot--selected" : ""}`}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LandingAppUpdates;
