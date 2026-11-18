import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ eyebrow, title, description, children, footer }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-wrap">
      <section className="auth-card auth-card-modern">
        <div className="auth-topline">
          <Link className="brand" href="/">learnly<span>.</span></Link>
          <span className="auth-mark" aria-hidden="true">✳</span>
        </div>
        <div className="auth-heading">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        <div className="auth-content">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
        <p className="footer-note auth-privacy">Your account and learning progress stay private.</p>
      </section>
      <p className="auth-bottom-note">LEARN AT YOUR OWN PACE · LEARNLY</p>
    </main>
  );
}
