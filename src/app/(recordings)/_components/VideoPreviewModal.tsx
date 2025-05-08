// src/components/VideoPreviewModal.tsx
import React, { useEffect, useRef } from "react";

interface VideoPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	videoUrl: string;
	title?: string;
}

const VideoPreviewModal = ({
	isOpen,
	onClose,
	videoUrl,
	title = "Video Preview",
}: VideoPreviewModalProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);

	// Close on escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Handle click outside modal to close
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				modalRef.current &&
				!modalRef.current.contains(e.target as Node) &&
				isOpen
			) {
				onClose();
			}
		};

		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onClose]);

	// Add scroll lock when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const togglePlayPause = () => {
		if (videoRef.current) {
			if (videoRef.current.paused) {
				videoRef.current.play();
			} else {
				videoRef.current.pause();
			}
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-75 backdrop-blur-sm transition-opacity'>
			<div
				ref={modalRef}
				className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden flex flex-col'
				style={{ maxHeight: "90vh" }}
			>
				<div className='flex justify-between items-center p-4 border-b dark:border-gray-700'>
					<h3 className='text-lg font-medium text-gray-900 dark:text-white truncate'>
						{title}
					</h3>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none'
					>
						<svg
							className='h-6 w-6'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M6 18L18 6M6 6l12 12'
							/>
						</svg>
					</button>
				</div>

				<div className='relative flex-grow flex items-center justify-center bg-black p-1'>
					<video
						ref={videoRef}
						src={videoUrl}
						className='max-h-[70vh] max-w-full'
						controls
					
						autoPlay
					/>
				</div>

				<div className='p-4 border-t dark:border-gray-700 flex justify-between'>
					<button
						onClick={onClose}
						className='inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default VideoPreviewModal;
