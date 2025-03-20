import { supabase } from "./supabaseClient";

export const getSupabaseUUID = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
        const userId = data.session.user.id;
        console.log("Supabase User UUID:", userId);
        return userId;
    }
}
