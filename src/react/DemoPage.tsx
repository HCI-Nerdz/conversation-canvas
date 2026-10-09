import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  chatWindowFeatures,
  chatWindowName,
  isDesktopChatDetach,
  openDetachedChatUrl,
  persistChatSnapshot,
} from "../chatDetach.ts";
import { reduceCanvas } from "../controller/reduce.ts";
import { applyDemoTheme, readStoredTheme, type DemoTheme } from "../theme.ts";
import { ConversationDesk } from "./ConversationDesk.tsx";
import { demoModel, fillerCards } from "./demoSeed.ts";

export function DemoPage() {
  const [model, dispatch] = useReducer(reduceCanvas, demoModel);
  const [canvasChatId, setCanvasChatId] = useState<string | null>(null);
  const [detachedChatIds, setDetachedChatIds] = useState<ReadonlySet<string>>(() => new Set());
  const [fitRequest, setFitRequest] = useState(0);
  const [theme, setTheme] = useState<DemoTheme>(() => readStoredTheme());
  const detachedWindowsRef = useRef<Map<string, Window>>(new Map());

  useEffect(() => {
    applyDemoTheme(theme);
  }, [theme]);

  const markDetachedClosed = useCallback((id: string) => {
    detachedWindowsRef.current.delete(id);
    setDetachedChatIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "conversation-canvas:chat-closed") return;
      if (typeof event.data.id !== "string") return;
      markDetachedClosed(event.data.id);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [markDetachedClosed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      for (const [id, win] of detachedWindowsRef.current) {
        if (win.closed) markDetachedClosed(id);
      }
    }, 800);
    return () => window.clearInterval(timer);
  }, [markDetachedClosed]);

  function openChat(id: string) {
    dispatch({ type: "focus", id });
    const card = model.cards.find((item) => item.id === id);
    if (!card) return;

    if (isDesktopChatDetach()) {
      persistChatSnapshot(card);
      const existing = detachedWindowsRef.current.get(id);
      if (existing && !existing.closed) {
        existing.focus();
        setDetachedChatIds((current) => new Set(current).add(id));
        return;
      }
      const opened = window.open(openDetachedChatUrl(id), chatWindowName(id), chatWindowFeatures());
      if (!opened) {
        setCanvasChatId(id);
        return;
      }
      detachedWindowsRef.current.set(id, opened);
      setDetachedChatIds((current) => new Set(current).add(id));
      return;
    }

    setCanvasChatId(id);
  }

  return (
    <main className="page">
      <div className="page-top">
        <nav className="identity" aria-label="Demo identity">
          <a href="https://hci-nerdz.github.io/">HCI Nerdz</a>
          <span aria-hidden="true">/</span>
          <a href="https://hci-nerdz.github.io/demos/">Demos</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Conversation canvas</span>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <p className="vcs">
        <a href="https://github.com/HCI-Nerdz/conversation-canvas">GitHub</a>
      </p>
      <header>
        <p className="eyebrow">Demo · Conversation canvas</p>
        <h1>Conversation canvas</h1>
        <p className="lede">
          Agent chats sit on a desk as picture-and-blurb cards you can move. Color tells you whether a
          thread is working, waiting, unread, read, waiting on you, or marked complete. The archive bin
          remembers where a card lived. Drop a file from Explorer and drag its link onto a chat card.
          On desktop, the message preview opens a <strong>separate chat window</strong> so you can keep
          panning the canvas and open several threads at once. On smaller screens, chat stays as a popup
          over the desk (panning pauses until you close it). Edit the title inline; past titles stay under
          History. Drag empty canvas to pan; scroll to zoom.
        </p>
      </header>
      <p className="harness">
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "add-cards", cards: fillerCards(120) });
            setFitRequest((n) => n + 1);
          }}
        >
          Add 120 shell cards
        </button>
        <span>Stress test — fits the grid into view afterward.</span>
      </p>
      <section className="facsimile" aria-label="Conversation canvas facsimile">
        <div className="caption">
          <span />
          <span />
          <span />
          <strong>Agent desk</strong>
        </div>
        <ConversationDesk
          model={model}
          dispatch={dispatch}
          canvasChatId={canvasChatId}
          detachedChatIds={detachedChatIds}
          onOpenChat={openChat}
          onCloseCanvasChat={() => setCanvasChatId(null)}
          fitRequest={fitRequest}
        />
      </section>
    </main>
  );
}
