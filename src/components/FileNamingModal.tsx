"use client";

import React, { useState } from "react";
function FileNamingModal({
	isOpen,
	onClose,
	onConfirm,
}: {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (filename: string) => void;
}) {
	const [filename, setFilename] = useState("");

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[100]'>
			<div className='bg-white rounded-lg p-6 w-96'>
				<h3 className='text-lg font-medium mb-4'>Name your recording</h3>
				<input
					type='text'
					value={filename}
					onChange={(e) => setFilename(e.target.value)}
					placeholder='Enter a name for this recording'
					className='w-full border rounded p-2 mb-4'
					autoFocus
				/>
				<div className='flex justify-end space-x-2'>
					<button
						onClick={onClose}
						className='px-4 py-2 bg-gray-200 rounded hover:bg-gray-300'
					>
						Cancel
					</button>
					<button
						onClick={() => onConfirm(filename)}
						className='px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
						disabled={!filename.trim()}
					>
						Save Recording
					</button>
				</div>
			</div>
		</div>
	);
}

export default FileNamingModal;