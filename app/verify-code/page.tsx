import Link from "next/link";
import { verifyEmailCode, resendEmailCode } from "@/app/auth/actions";
import { AuthShell } from "@/app/components/AuthShell";

export default async function VerifyCodePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; email?: string; type?: string }> }) {
  const q = await searchParams;
  const email = q.email || "";
  const type = q.type === "signup" ? "signup" : "login";
  return (
    <AuthShell eyebrow="CHECK YOUR INBOX" title="Enter your code." description="We sent a six-digit verification code to your email. Enter it below to continue."
      footer={<>Need to use a different email? <Link className="text-link" href={type === "signup" ? "/signup" : "/login"}>Go back</Link></>}>
      <div className="email-step"><span className="email-step-icon" aria-hidden="true">✉</span><div><strong>Code sent to {email || "your email"}</strong><p>Check your inbox and spam folder. The code can only be used once and expires after a short time.</p></div></div>
      {q.error && <p className="error" role="alert">{q.error}</p>}
      {q.message && <p className="success" role="status">{q.message}</p>}
      <form action={verifyEmailCode}>
        <input type="hidden" name="type" value={type} />
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required /></div>
        <div className="field"><label htmlFor="token">Six-digit code</label><input id="token" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required className="otp-input" /></div>
        <button className="button full auth-submit">Verify and continue <span aria-hidden="true">→</span></button>
      </form>
      <form action={resendEmailCode} className="resend-code-form">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="type" value={type} />
        <button className="text-link resend-code-button">Send me a new code</button>
      </form>
    </AuthShell>
  );
}
