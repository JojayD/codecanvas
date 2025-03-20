"use client";
import React from 'react'
import { Button } from "@/components/ui/button"


function DashboardPage() {
    return (
        <div className={`flex flex-col items-center justify-center h-screen `}>
            <div className={`flex flex-col items-center justify-center h-screen gap-3.5`}>
                <Button>Create session</Button>
                <Button>Join session</Button>
            </div>
        </div>
    );
}

export default DashboardPage;