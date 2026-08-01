// File: src/api/auth.ts
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const authApi = {
  /**
   * Log in with Email and Password
   */
  async login(email: string, password: string) {
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { user: null, profile: null, error: parsed.error };
    }

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

    if (authError || !authData.user) {
      return { user: null, profile: null, error: authError };
    }

    // Fetch the user's profile (role, name, etc) from the custom 'users' table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    return { user: authData.user, profile, error: profileError };
  },

  /**
   * Log out the current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current session and profile (Useful for checking if logged in on app startup)
   */
  async getCurrentProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return { user: null, profile: null };

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    return { user: session.user, profile, error };
  },
};
