"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name."),
});

function normalizeMessage(message: string) {
  return encodeURIComponent(message);
}

function getAuthOrigin(originHeader: string | null) {
  return (
    originHeader ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login data." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid signup data." };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = getAuthOrigin(headerStore.get("origin"));

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(
    `/login?message=${normalizeMessage(
      "Check your email to confirm your account, then sign in.",
    )}`,
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?message=${normalizeMessage("You have been signed out.")}`);
}
