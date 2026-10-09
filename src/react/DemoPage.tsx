import { useEffect, useReducer, useState } from "react";

import { reduceCanvas } from "../controller/reduce.ts";
import { applyDemoTheme, readStoredTheme, type DemoTheme } from "../theme.ts";
import { ConversationDesk } from "./ConversationDesk.tsx";
import { demoModel, fillerCards } from "./demoSeed.ts";

export function DemoPage() {
  const [model, dispatch] = useReducer(reduceCanvas, demoModel);
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
          <span aria-current="page">Agent Canvas</span>
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
        <p className="eyebrow">Demo · Agent Canvas</p>
        <h1>Agent Canvas</h1>
        <p className="lede">
          Agent chats sit on a desk as picture-and-blurb cards you can move. The lamp beside{" "}
          <strong>History</strong> uses solid green (agent working), flashing green (waiting on CI),
          yellow (needs attention — feedback, planning, first prompt, unread), a grey ring (read, clean
          composer), grey fill (dirty composer), yellow/grey split (needs attention + dirty), or red
          (error); sign off and the lamp goes away. The archive bin
          remembers where a card lived. Drop a file from Explorer and drag its link onto a chat card.
          On desktop, opening previews adds <strong>floating chat panels</strong> on the desk so you can
          pan the canvas and keep several threads open. Use <strong>Pop out</strong> inside a panel to try the
          browser window mechanism (allow pop-ups if prompted). On smaller screens, one panel dims the desk and
          pauses pan until you close it. Use the edit control beside a title to rename; past titles stay under
          History. Drag empty canvas to pan; scroll
          to zoom.
        </p>
      </header>
      <p className="harness">
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "add-cards", cards: fillerCards(120, model.cards) });
            setFitRequest((n) => n + 1);
          }}
        >
          Add 120 shell cards
        </button>
        <span>Stress test — fits the grid into view afterward.</span>
      </p>
      <section className="facsimile" aria-label="Agent Canvas facsimile">
        <div className="caption">
          <span />
          <span />
          <span />
          <strong>Agent desk</strong>
        </div>
        <ConversationDesk model={model} dispatch={dispatch} fitRequest={fitRequest} />
      </section>
    </main>
  );
}
