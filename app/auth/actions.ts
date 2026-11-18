"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://learnly-learning-demo-git-build-nextjs-foundation-norrform.vercel.app";
const callbackUrl = (next: string) => `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

function safeError(error: { message: string }) {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "That email and password combination did not work. Check them and try again.";
  if (message.includes("email not confirmed")) return "Please confirm your email first. Check your inbox or request a new confirmation email.";
  if (message.includes("user already registered")) return "An account with this email already exists. Try signing in instead.";
  if (message.includes("password")) return "Please choose a password with at least 8 characters.";
  if (message.includes("rate limit")) return "Too many attempts in a short time. Wait a little and try again.";
  return "Something went wrong. Please try again in a moment.";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent(safeError(error)));
  redirect("/app");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim().slice(0, 60);
  if (!email || !email.includes("@") || password.length < 8) {
    redirect("/signup?error=" + encodeURIComponent("Enter a valid email and choose a password with at least 8 characters."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl("/app"),
    },
  });
  if (error) redirect("/signup?error=" + encodeURIComponent(safeError(error)));
  if (data.session) redirect("/app");
  redirect("/check-email");
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) redirect("/check-email?error=" + encodeURIComponent("Enter a valid email address."));
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl("/app") } });
  if (error) redirect("/check-email?error=" + encodeURIComponent(safeError(error)));
  redirect("/check-email?message=" + encodeURIComponent("If that account is waiting for confirmation, a fresh email is on its way."));
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=Enter%20your%20email.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/reset-password") });
  if (error) redirect("/forgot-password?error=" + encodeURIComponent(safeError(error)));
  redirect("/forgot-password?message=" + encodeURIComponent("If an account matches that email, a password reset link is on its way. Check your spam folder too."));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/reset-password?error=Password%20must%20be%20at%20least%208%20characters.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=" + encodeURIComponent(safeError(error)));
  redirect("/login?message=" + encodeURIComponent("Your password has been updated. You can now sign in."));
}
