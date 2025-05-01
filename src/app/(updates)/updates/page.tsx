import React from "react";
import LandingAppUpdates from "../components/LandingAppUpdates";
type Props = {};

function page({}: Props) {
	return (
		<div className='min-h-screen grid place-items-center'>
			<div className='w-[1000px] max-h-[90vh] bg-white bg-opacity-90 rounded-xl shadow-lg mx-auto grid-cols-1 align-middle'>
				<LandingAppUpdates />
			</div>
		</div>
	);
}

export default page;
