import { useReducer } from "react";

import { reduceCanvas } from "../controller/reduce.ts";
import { ConversationDesk } from "./ConversationDesk.tsx";
import { demoModel, fillerCards } from "./demoSeed.ts";

export function DemoPage() {
  const [model, dispatch] = useReducer(reduceCanvas, demoModel);

  return (
    <main className="page">
      <nav className="identity" aria-label="Demo identity">
        <a href="https://hci-nerdz.github.io/">HCI Nerdz</a>
        <span aria-hidden="true">/</span>
        <a href="https://hci-nerdz.github.io/demos/">Demos</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Conversation canvas</span>
      </nav>
      <p className="vcs">
        <a href="https://github.com/HCI-Nerdz/conversation-canvas">GitHub</a>
      </p>
      <header>
        <p className="eyebrow">Demo · Conversation canvas</p>
        <h1>Conversation canvas</h1>
        <p className="lede">
          Agent chats sit on a desk as picture-and-blurb cards you can move. Color tells you whether a
          thread is working, waiting, unread, read, waiting on you, or marked complete. The archive bin
          remembers where a card lived. Drop a file from Explorer and drag a link into the chat that
          should start from it. When the title changes, the old title stays in a topic list, newest first.
        </p>
      </header>
      <p className="harness">
        <button
          type="button"
          onClick={() => dispatch({ type: "add-cards", cards: fillerCards(120) })}
        >
          Add 120 shell cards
        </button>
        <span>Demo control. The product desk is the canvas below.</span>
      </p>
      <section className="facsimile" aria-label="Conversation canvas facsimile">
        <div className="caption">
          <span />
          <span />
          <span />
          <strong>Agent desk</strong>
        </div>
        <ConversationDesk model={model} dispatch={dispatch} />
      </section>
    </main>
  );
}
