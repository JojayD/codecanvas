import { Button } from "@/components/ui/button";
import React, { useEffect } from "react";

type Props = {
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
};

function DeleteModal({ isOpen, onClose, onDelete }: Props) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	return (
		<div className='fixed inset-0 flex backdrop-blur-sm items-center justify-center bg-transparent bg-opacity-50'>
			<div className='bg-white rounded-lg p-6 shadow-lg max-w-sm w-full'>
				<h2 className='text-lg font-bold mb-4'>Confirm Deletion</h2>
				<p>Are you sure you want to delete this recording?</p>
				<div className='flex justify-end mt-4'>
					<Button
						variant='outline'
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						variant='destructive'
						onClick={() => {
              console.log("deleting");
							onDelete();
							onClose();
						}}
						className='ml-2'
					>
						Delete
					</Button>
				</div>
			</div>
		</div>
	);
}

export default DeleteModal;
