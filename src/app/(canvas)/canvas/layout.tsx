"use client"
  import React from 'react';
  import { supabase } from '../../../app/utils/supabase/lib/supabaseClient';
  import { useRouter } from 'next/navigation';

  export default function CanvasLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
      const router = useRouter();

      const handleLogout = async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
              console.error('Error signing out:', error.message);
          } else {
              router.push('/');
          }
      }

    return (
      <div className="flex min-h-screen flex-col bg-slate-100">
        <header className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Code Canvas</h1>
            <nav>
              <ul className="flex space-x-4">
                <li><a href="/canvas" className="hover:underline">Editor</a></li>
                <li><a href="/examples" className="hover:underline">Examples</a></li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="hover:underline cursor-pointer"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-grow p-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>

        <footer className="bg-blue-600 text-white p-3 text-center">
          <p className="text-sm">© {new Date().getFullYear()} Code Canvas Editor</p>
        </footer>
      </div>
    );
  }