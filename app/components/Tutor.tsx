"use client";

import { useState, type FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Tutor({ pathId }: { pathId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }].slice(-10);
    setBusy(true);
    setError("");
    setQuestion("");

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The tutor is unavailable.");
      setMessages([...nextMessages, { role: "assistant", content: data.answer }].slice(-10));
    } catch (cause) {
      setQuestion(text);
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel tutor-box">
      <h2>Study with Learnly</h2>
      <p className="muted">Ask follow-up questions, request another explanation, or test your understanding.</p>
      <div aria-live="polite" style={{ display: "grid", gap: 12, margin: "18px 0" }}>
        {messages.map((message, index) => (
          <div key={index} className="tutor-answer" style={{ background: message.role === "user" ? "#fff5ed" : "#f8f7fb" }}>
            <strong>{message.role === "user" ? "You" : "Learnly"}</strong>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{message.content}</p>
          </div>
        ))}
        {busy && <p className="muted">Learnly is thinking…</p>}
      </div>
      <form onSubmit={ask}>
        <div className="field">
          <label htmlFor="question">Your question</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2500}
            required
            placeholder="Explain this concept another way…"
          />
        </div>
        <button className="button" disabled={busy || !question.trim()}>
          {busy ? "Thinking…" : "Ask Learnly"}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
