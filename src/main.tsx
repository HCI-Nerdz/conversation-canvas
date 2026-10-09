import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { parseStandaloneChatId } from "./chatDetach.ts";
import { DemoPage } from "./react/DemoPage.tsx";
import { StandaloneChatPage } from "./react/StandaloneChatPage.tsx";
import { applyDemoTheme, readStoredTheme } from "./theme.ts";
import "./demo.css";

applyDemoTheme(readStoredTheme());

const standaloneChatId = parseStandaloneChatId();
const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    {standaloneChatId ? <StandaloneChatPage chatId={standaloneChatId} /> : <DemoPage />}
  </StrictMode>,
);
