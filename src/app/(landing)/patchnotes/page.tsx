import React from 'react'
import PatchNotes from '../components/PatchNotes'
type Props = {}

function page({}: Props) {
  return (
    <div className="w-full min-h-screen p-6 flex flex-col justify-center items-center bg-gray-100">
      <PatchNotes/>
    </div>
  )
}

export default page