"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Tell me about Hemant",
  "Explain RAGForge",
  "What are his skills?",
  "What's his education?",
  "What certifications does he have?",
  "How can I contact him?",
];

/**
 * Portfolio assistant. Posts to /api/ai, which answers from the site's own
 * content — with an LLM when a key is configured, and from a grounded
 * fallback when it isn't, so the feature never appears broken.
 */
export function AIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm Hemant's portfolio assistant. Ask me about his projects, stack or experience.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.reply ??
            data.error ??
            "Something went wrong reaching the assistant.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I couldn't reach the server. Check your connection.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Nested inside the panel's own scroller, so it needs its own
          containment or reaching the end of the chat log jumps the panel. */}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "from-electric/25 to-purple/25 ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br px-4 py-2.5 text-sm"
                : "glass max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="glass w-fit rounded-2xl rounded-bl-sm px-4 py-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="bg-cyan h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="glass hover:border-cyan/50 hover:text-cyan cursor-pointer rounded-full px-3 py-1.5 text-[11px] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="glass focus-within:border-cyan/50 flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Hemant…"
          aria-label="Ask the portfolio assistant"
          className="placeholder:text-ink-dim flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="from-cyan to-purple text-void grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-gradient-to-br disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
