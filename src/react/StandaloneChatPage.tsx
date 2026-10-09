import { useEffect, useMemo } from "react";

import { readChatSnapshot } from "../chatDetach.ts";
import { showsInboxStatusLight, statusLampTitle } from "../core/model.ts";
import { applyDemoTheme, readStoredTheme } from "../theme.ts";
import { ChatThreadDemo } from "./ChatThreadDemo.tsx";
import { demoModel } from "./demoSeed.ts";

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
    document.title = `${card.title} · Agent Chat - canvas`;
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
        <h1>{card.title}</h1>
        {showsInboxStatusLight(card.status) ? (
          <span
            className={`status-dot status-${card.status}`}
            title={statusLampTitle(card.status)}
            aria-label={statusLampTitle(card.status)}
          />
        ) : (
          <span className="visually-hidden">Signed off</span>
        )}
      </header>
      <ChatThreadDemo
        blurb={card.blurb}
        standinNote="Pop-out chat window — the canvas desk stays in the parent browser tab."
      />
    </main>
  );
}
