import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DemoPage } from "./react/DemoPage.tsx";
import { applyDemoTheme, readStoredTheme } from "./theme.ts";
import "./demo.css";

applyDemoTheme(readStoredTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <DemoPage />
  </StrictMode>,
);
