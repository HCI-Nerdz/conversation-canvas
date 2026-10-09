import { useEffect, useMemo } from "react";

import { readChatSnapshot } from "../chatDetach.ts";
import { STATUS_LABEL } from "../core/model.ts";
import { demoModel } from "./demoSeed.ts";
import { applyDemoTheme, readStoredTheme } from "../theme.ts";

export function StandaloneChatPage({ chatId }: { chatId: string }) {
  const card = useMemo(() => {
    const stored = readChatSnapshot(chatId);
    if (stored) return stored;
    const seeded = demoModel.cards.find((item) => item.id === chatId);
    if (seeded) {
      return { id: seeded.id, title: seeded.title, blurb: seeded.blurb, status: seeded.status };
    }
    return {
      id: chatId,
      title: "Thread",
      blurb: "No snapshot found for this id in the demo.",
      status: "read" as const,
    };
  }, [chatId]);

  useEffect(() => {
    applyDemoTheme(readStoredTheme());
    document.title = `${card.title} · Conversation canvas`;
  }, [card.title]);

  useEffect(() => {
    function notifyClosed() {
      window.opener?.postMessage({ type: "conversation-canvas:chat-closed", id: chatId }, "*");
    }
    window.addEventListener("beforeunload", notifyClosed);
    return () => window.removeEventListener("beforeunload", notifyClosed);
  }, [chatId]);

  return (
    <main className="standalone-chat">
      <header className="standalone-chat-chrome">
        <span className={`status-dot status-${card.status}`} title={STATUS_LABEL[card.status]} />
        <h1>{card.title}</h1>
      </header>
      <div className="chat-thread-expanded">
        <p className="bubble user">Can you pick this back up where we left off?</p>
        <p className="bubble agent">{card.blurb}</p>
        <p className="bubble user">Yes — keep going on that thread.</p>
        <p className="bubble agent">
          Still on it. I will post an update when the next checkpoint lands.
        </p>
        <p className="chat-note">
          Detached chat window (desktop). The canvas keeps your shell cards; open another preview for a
          second thread.
        </p>
      </div>
    </main>
  );
}
