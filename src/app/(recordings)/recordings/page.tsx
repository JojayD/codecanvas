"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import VideoPreviewModal from "@/app/(recordings)/_components/VideoPreviewModal";
interface Recording {
	key: string;
	name: string;
	size: number;
	lastModified: string;
}
import DeleteModal from "@/app/(recordings)/_components/DeleteModal";

export default function RecordingsPage() {
	const [recordings, setRecordings] = useState<Recording[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [openPreviewModal, setOpenPreviewModal] = useState<boolean>(false);
	const [previewUrl, setPreviewUrl] = useState<string>("");
	const [currentRecording, setCurrentRecording] = useState<Recording | null>(
		null
	);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

	const router = useRouter();
	useEffect(() => {
		async function fetchRecordings() {
			try {
				setLoading(true);

				// Get user ID from supabase
				const {
					data: { user },
				} = await supabase.auth.getUser();
				console.log("User data:", user?.id);
				if (!user) {
					setError("Please login to view your recordings");
					return;
				}

				// Fetch recordings from your API
				const response = await fetch(`/api/s3-bucket-all?userId=${user.id}`);

				if (!response.ok) {
					throw new Error(`Failed to fetch recordings: ${response.status}`);
				}

				const data = await response.json();
				if (data.success) {
					setRecordings(data.files);
				} else {
					throw new Error(data.error || "Failed to fetch recordings");
				}
			} catch (err: any) {
				console.error("Error fetching recordings:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		fetchRecordings();
	}, []);

	// Helper function to format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	const handleGetUser = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return user;
	};

	const handleDelete = async (recording: Recording) => {
		try {
			console.log("Attempting to delete recording:", recording);
			const user = await handleGetUser();
			const response = await fetch("/api/s3-bucket-delete", {
				method: "DELETE",
					
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ key: recording.key, user_id: user?.id }),
			});

			const responseText = await response.text();
			console.log(`Delete response (${response.status}):`, responseText);

			let data;
			try {
				data = JSON.parse(responseText);
			} catch (e) {
				console.error("Failed to parse response as JSON:", e);
				throw new Error(
					`Server returned status ${response.status}: ${responseText}`
				);
			}

			if (!response.ok) {
				throw new Error(
					`Failed to delete recording: ${response.status} - ${data.error || responseText}`
				);
			}

			if (data.success) {
				setRecordings(recordings.filter((r) => r.key !== recording.key));
				console.log("Successfully deleted recording:", recording.key);
			} else {
				throw new Error(data.error || "Failed to delete recording");
			}
		} catch (error) {
			console.error("Error deleting recording:", error);
			alert(
				`Failed to delete recording: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	};

	const handleBack = () => {
		router.back();
	};

	const handlePreview = async (recording: Recording) => {
		try {
			// Get the download URL for the video
			const downloadUrl = `/api/s3-bucket?key=${encodeURIComponent(recording.key)}`;

			// Set the current recording and preview URL
			setCurrentRecording(recording);
			setPreviewUrl(downloadUrl);
			setOpenPreviewModal(true);
		} catch (error) {
			console.error("Failed to get preview URL:", error);
			alert("Could not preview this recording. Please try again.");
		}
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8'>
			<div className='flex justify-end'>
				<Button
					className='bg-blue-500 text-white'
					onClick={handleBack}
				>
					Back
				</Button>
			</div>
			<h1 className='text-3xl font-bold text-gray-800 mb-6 text-center'>
				Your Recordings
			</h1>

			{loading && (
				<div className='flex justify-center'>
					<p className='text-gray-600'>Loading your recordings...</p>
				</div>
			)}

			{error && (
				<div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
					{error}
				</div>
			)}

			{!loading && !error && recordings.length === 0 && (
				<div className='text-center py-10'>
					<p className='text-xl text-gray-600'>You don't have any recordings yet.</p>
					<p className='mt-2 text-gray-500'>
						Start a screen recording in the canvas to create one!
					</p>
				</div>
			)}

			{recordings.length > 0 && (
				<ul className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{recordings.map((recording, index) => (
						<li
							key={index}
							className='p-4 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow'
						>
							<p className='font-semibold text-lg text-blue-700 truncate'>
								{recording.name}
							</p>
							<div className='flex justify-between mt-2 text-sm text-gray-600'>
								<p>{formatFileSize(recording.size)}</p>
								<p>{new Date(recording.lastModified).toLocaleString()}</p>
							</div>
							<div className='mt-3 flex justify-between'>
								<div className='flex gap-2'>
									<a
										href={`/api/s3-bucket?key=${encodeURIComponent(recording.key)}`}
										className='inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm'
										target='_blank'
									>
										Download
									</a>
									<Button
										variant='destructive'
										onClick={() => handlePreview(recording)}
									>
										Preview
									</Button>
								</div>
								<div className=''>
									<button
										className='w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors'
										aria-label='Delete recording'
										onClick={() => {
											setCurrentRecording(recording);
											setDeleteModalOpen(true);
										}}
									>
										<svg
											xmlns='http://www.w3.org/2000/svg'
											className='h-4 w-4'
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
							</div>
						</li>
					))}
				</ul>
			)}
			{openPreviewModal && (
				<VideoPreviewModal
					isOpen={openPreviewModal}
					onClose={() => setOpenPreviewModal(false)}
					videoUrl={previewUrl}
				/>
			)}
			{deleteModalOpen && (
				<DeleteModal
					isOpen={deleteModalOpen}
					onClose={() => setDeleteModalOpen(false)}
					onDelete={() => currentRecording && handleDelete(currentRecording)}
				/>
			)}
		</div>
	);
}
