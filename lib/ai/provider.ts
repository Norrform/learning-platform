export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

export class AIProviderError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "AIProviderError";
  }
}

export async function createAICompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIProviderError(
      "The Study AI is not connected yet. An administrator must configure an AI provider key.",
      503,
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1800,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(35_000),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const providerMessage =
      typeof details?.error?.message === "string"
        ? details.error.message.slice(0, 240)
        : "The AI provider could not complete the request.";
    throw new AIProviderError(providerMessage, response.status === 429 ? 429 : 502);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AIProviderError("The AI returned an empty response.");
  }
  return content.trim();
}

export function parseAIJson<T>(
  content: string,
  validate: (value: unknown) => value is T,
): T {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new AIProviderError("The AI returned invalid structured data. Please try again.");
  }
  if (!validate(value)) {
    throw new AIProviderError("The AI response was missing required information. Please try again.");
  }
  return value;
}
