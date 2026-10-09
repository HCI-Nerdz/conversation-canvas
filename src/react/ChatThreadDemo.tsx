import { useEffect, useId, useRef, useState, type FormEvent, type PointerEvent } from "react";

import { STATUS_LABEL, type InboxStatus } from "../core/model.ts";

type ChatRole = "user" | "agent";

interface ChatMessage {
  readonly id: string;
  readonly role: ChatRole;
  readonly text: string;
}

const MOCK_AGENT_REPLIES = [
  "Understood — in the product this would go to your agent. This reply is demo-only.",
  "Noted. No model is running here; this is a stand-in while the agent would work.",
  "Got it. The real app would stream tokens and update status on the card.",
] as const;

function seedMessages(blurb: string): ChatMessage[] {
  return [
    { id: "seed-1", role: "user", text: "Can you pick this back up where we left off?" },
    { id: "seed-2", role: "agent", text: blurb },
    { id: "seed-3", role: "user", text: "Yes — keep going on that thread." },
    {
      id: "seed-4",
      role: "agent",
      text: "Still on it. I will post an update when the next checkpoint lands.",
    },
  ];
}

function nextMessageId(prefix: string, counter: number) {
  return `${prefix}-${counter}`;
}

export function ChatThreadDemo({
  blurb,
  standinNote,
  onComposerDraftChange,
}: {
  blurb: string;
  standinNote?: string;
  onComposerDraftChange?: (hasDraft: boolean) => void;
}) {
  const instanceId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState(() => seedMessages(blurb));

  useEffect(() => {
    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    onComposerDraftChange?.(draft.trim().length > 0);
  }, [draft, onComposerDraftChange]);

  useEffect(() => {
    return () => onComposerDraftChange?.(false);
  }, [onComposerDraftChange]);

  function stopBubble(event: PointerEvent) {
    event.stopPropagation();
  }

  function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;

    const userId = nextMessageId(instanceId, ++idCounter.current);
    setMessages((current) => [...current, { id: userId, role: "user", text }]);
    setDraft("");
    setThinking(true);

    thinkingTimer.current = setTimeout(() => {
      thinkingTimer.current = null;
      const agentId = nextMessageId(instanceId, ++idCounter.current);
      setMessages((current) => {
        const reply =
          MOCK_AGENT_REPLIES[current.length % MOCK_AGENT_REPLIES.length] ?? MOCK_AGENT_REPLIES[0];
        return [...current, { id: agentId, role: "agent", text: reply }];
      });
      setThinking(false);
    }, 1400);
  }

  return (
    <div className="chat-thread-shell">
      <div className="chat-thread-expanded" ref={scrollRef}>
        {messages.map((message) => (
          <p key={message.id} className={`bubble ${message.role}`}>
            {message.text}
          </p>
        ))}
        {thinking ? (
          <p
            className="bubble agent chat-thinking"
            aria-live="polite"
            aria-label="Agent thinking (mockup)"
          >
            Thinking
            <span className="preview-ellipsis" aria-hidden="true">
              …
            </span>
          </p>
        ) : null}
        {standinNote ? <p className="chat-note">{standinNote}</p> : null}
      </div>
      <form
        className="chat-composer"
        onSubmit={sendMessage}
        onPointerDown={stopBubble}
      >
        <label className="visually-hidden" htmlFor={`${instanceId}-input`}>
          Message
        </label>
        <textarea
          id={`${instanceId}-input`}
          rows={2}
          value={draft}
          placeholder="Type a message…"
          disabled={thinking}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
        />
        <button type="submit" disabled={thinking || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="chat-mock-disclaimer">
        Mock demo — your messages stay in this browser tab only. The thinking indicator and replies
        are scripted, not a live agent.
      </p>
    </div>
  );
}

export function chatStatusLabel(status: InboxStatus): string {
  return STATUS_LABEL[status];
}
