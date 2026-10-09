import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DemoPage } from "./react/DemoPage.tsx";
import "./demo.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <DemoPage />
  </StrictMode>,
);
