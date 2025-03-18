// components/GoogleLoginButton.tsx
import { supabase } from '../../app/utils/supabase/lib/supabaseClient';

export default function GoogleLoginButton() {
    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' },);
        if (error) {
            console.error('Error signing in:', error.message);
        }
    };

    return (
        <button onClick={signInWithGoogle}>
            Sign in with Google
        </button>
    );
}
