import React from "react";
import { Textarea } from "@/components/ui/textarea";
type Props = {};

function Profile({}: Props) {


	return (
		<div>
			<Textarea
				placeholder='Name'
				className='h-full resize-none'
				// value={localPrompt}
			/>
		</div>
	);
}

export default Profile;
