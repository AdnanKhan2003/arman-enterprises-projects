import { authClient } from "../lib/auth-client";
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const authApi = {
  async login(email: string, password: string) {
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { user: null, profile: null, error: parsed.error };
    }

    const { data, error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data) {
      return { user: null, profile: null, error };
    }

    return { user: data.user, profile: data.user, error: null };
  },

  async logout() {
    const { error } = await authClient.signOut();
    return { error };
  },

  async getCurrentProfile() {
    const { data, error } = await authClient.getSession();
    
    if (!data?.user) return { user: null, profile: null, error };

    return { user: data.user, profile: data.user, error };
  },
};
