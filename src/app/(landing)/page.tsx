"use client"
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'
import GoogleLoginButton from "@/components/ui/GoogleButtonSignIn";
import { supabase } from '../../app/utils/supabase/lib/supabaseClient';

export default function Home() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check current auth status when component mounts
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            console.log(session);
            if (session) {
                router.push('/canvas');
            }
            setIsLoading(false);
        };

        checkUser();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    router.push('/canvas');
                }
            }
        );

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="flex-col justify-center items-center h-screen mx-auto gap-3.5">
            <h1 className="text-2xl font-bold text-center mb-4">Welcome to the App</h1>
            <div className="flex justify-center">
                <GoogleLoginButton />
            </div>
        </div>
    );
}