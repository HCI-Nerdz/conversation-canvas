import type { CanvasViewport, ConversationCard } from "./core/model.ts";
import { CARD_WIDTH, CHAT_POPUP_HEIGHT, CHAT_POPUP_WIDTH } from "./core/model.ts";

/** Desktop-style UX: several chats at once without locking canvas pan. */
export function isDesktopMultiChat(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
}

export function initialChatPanelPlacement(
  card: Pick<ConversationCard, "x" | "y">,
  viewport: CanvasViewport,
  stageSize: { width: number; height: number },
  stackIndex: number,
): { x: number; y: number } {
  const z = viewport.zoom || 1;
  const pad = 12;
  const w = Math.min(CHAT_POPUP_WIDTH, stageSize.width - pad * 2);
  const h = Math.min(CHAT_POPUP_HEIGHT, stageSize.height - pad * 2);
  let x = viewport.x + card.x * z + CARD_WIDTH * z + 16 + stackIndex * 28;
  let y = viewport.y + card.y * z + stackIndex * 28;
  if (x + w > stageSize.width - pad) {
    x = viewport.x + card.x * z - w - 16 - stackIndex * 28;
  }
  x = Math.max(pad, Math.min(x, stageSize.width - w - pad));
  y = Math.max(pad, Math.min(y, stageSize.height - h - pad));
  return { x, y };
}
