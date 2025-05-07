"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Recording {
	key: string;
	name: string;
	size: number;
	lastModified: string;
}

export default function RecordingsPage() {
	const [recordings, setRecordings] = useState<Recording[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	return (
		<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8'>
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
							<div className='mt-3'>
								<a
									href={`/api/s3-bucket?key=${encodeURIComponent(recording.key)}`}
									className='inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm'
									target='_blank'
								>
									Download
								</a>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
