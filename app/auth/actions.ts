"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeError(error: { message: string }) {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) return "That email and password combination did not work. Check them and try again.";
  if (message.includes("email not confirmed")) return "Please verify your email with the six-digit code first.";
  if (message.includes("user already registered")) return "An account with this email already exists. Try signing in instead.";
  if (message.includes("password")) return "Please choose a password with at least 8 characters.";
  if (message.includes("rate limit")) return "Too many attempts in a short time. Wait a little and try again.";
  if (message.includes("token") || message.includes("otp")) return "That code is invalid or has expired. Request a fresh code and try again.";
  return "Something went wrong. Please try again in a moment.";
}

function emailValue(formData: FormData) {
  return String(formData.get("email") || "").trim().toLowerCase();
}

export async function signIn(formData: FormData) {
  const email = emailValue(formData);
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent(safeError(error)));
  redirect("/app");
}

export async function requestSignInCode(formData: FormData) {
  const email = emailValue(formData);
  if (!email || !email.includes("@")) redirect("/login?error=Enter%20a%20valid%20email%20address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(safeError(error)));
  redirect("/verify-code?type=login&email=" + encodeURIComponent(email));
}

export async function signUp(formData: FormData) {
  const email = emailValue(formData);
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim().slice(0, 60);
  if (!email || !email.includes("@") || password.length < 8) {
    redirect("/signup?error=" + encodeURIComponent("Enter a valid email and choose a password with at least 8 characters."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) redirect("/signup?error=" + encodeURIComponent(safeError(error)));
  if (data.session) redirect("/app");
  redirect("/verify-code?type=signup&email=" + encodeURIComponent(email));
}

export async function verifyEmailCode(formData: FormData) {
  const email = emailValue(formData);
  const token = String(formData.get("token") || "").replace(/\\s/g, "");
  const type = String(formData.get("type") || "");
  if (!email || !/^\\d{6}$/.test(token) || !["signup", "login"].includes(type)) {
    redirect("/verify-code?error=" + encodeURIComponent("Enter the six-digit code from your email.") + "&type=" + encodeURIComponent(type) + "&email=" + encodeURIComponent(email));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: type === "signup" ? "signup" : "email",
  });
  if (error) redirect("/verify-code?error=" + encodeURIComponent(safeError(error)) + "&type=" + type + "&email=" + encodeURIComponent(email));
  redirect("/app");
}

export async function resendEmailCode(formData: FormData) {
  const email = emailValue(formData);
  const type = String(formData.get("type") || "");
  if (!email || !email.includes("@") || !["signup", "login"].includes(type)) {
    redirect("/verify-code?error=Enter%20a%20valid%20email%20address.");
  }
  const supabase = await createClient();
  const result = type === "signup"
    ? await supabase.auth.resend({ type: "signup", email })
    : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (result.error) redirect("/verify-code?error=" + encodeURIComponent(safeError(result.error)) + "&type=" + type + "&email=" + encodeURIComponent(email));
  redirect("/verify-code?message=" + encodeURIComponent("A fresh six-digit code has been sent.") + "&type=" + type + "&email=" + encodeURIComponent(email));
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailValue(formData);
  if (!email) redirect("/forgot-password?error=Enter%20your%20email.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) redirect("/forgot-password?error=" + encodeURIComponent(safeError(error)));
  redirect("/forgot-password?message=" + encodeURIComponent("If an account matches that email, a password reset email is on its way. Check your spam folder too."));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/reset-password?error=Password%20must%20be%20at%20least%208%20characters.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=" + encodeURIComponent(safeError(error)));
  redirect("/login?message=" + encodeURIComponent("Your password has been updated. You can now sign in."));
}
