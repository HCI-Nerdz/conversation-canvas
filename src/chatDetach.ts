import type { CanvasViewport, ConversationCard, InboxStatus } from "./core/model.ts";
import { CARD_WIDTH, CHAT_POPUP_HEIGHT, CHAT_POPUP_WIDTH } from "./core/model.ts";

export interface ChatWindowSnapshot {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly status: InboxStatus;
}

const STORAGE_PREFIX = "conversation-canvas:chat:";

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

export function persistChatSnapshot(card: Pick<ConversationCard, "id" | "title" | "blurb" | "status">) {
  const snapshot: ChatWindowSnapshot = {
    id: card.id,
    title: card.title,
    blurb: card.blurb,
    status: card.status,
  };
  sessionStorage.setItem(`${STORAGE_PREFIX}${card.id}`, JSON.stringify(snapshot));
}

export function readChatSnapshot(id: string): ChatWindowSnapshot | null {
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChatWindowSnapshot;
  } catch {
    return null;
  }
}

export function chatWindowName(id: string): string {
  return `conversation-canvas-${id}`;
}

export function chatWindowFeatures(): string {
  return "popup=yes,width=540,height=640,left=96,top=96";
}

export function openDetachedChatUrl(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("chat", id);
  return url.toString();
}

export function parseStandaloneChatId(): string | null {
  return new URLSearchParams(window.location.search).get("chat");
}

/** User-gesture pop-out; returns the new window or null if blocked. */
export function popOutChatWindow(card: Pick<ConversationCard, "id" | "title" | "blurb" | "status">): Window | null {
  persistChatSnapshot(card);
  return window.open(openDetachedChatUrl(card.id), chatWindowName(card.id), chatWindowFeatures());
}
