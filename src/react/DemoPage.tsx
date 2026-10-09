import { useEffect, useReducer, useState } from "react";

import { reduceCanvas } from "../controller/reduce.ts";
import { applyDemoTheme, readStoredTheme, type DemoTheme } from "../theme.ts";
import { ConversationDesk } from "./ConversationDesk.tsx";
import { demoModel, fillerCards } from "./demoSeed.ts";

export function DemoPage() {
  const [model, dispatch] = useReducer(reduceCanvas, demoModel);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [theme, setTheme] = useState<DemoTheme>(() => readStoredTheme());

  useEffect(() => {
    applyDemoTheme(theme);
  }, [theme]);

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
          Click the message preview to open a chat window on the canvas (panning pauses while it is open). Edit the title inline; past titles stay under History.
          Drag empty canvas to pan; scroll to zoom.
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
          openChatId={openChatId}
          onOpenChat={setOpenChatId}
          fitRequest={fitRequest}
        />
      </section>
    </main>
  );
}
