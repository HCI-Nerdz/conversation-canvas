import type { ConversationCard, InboxStatus } from "./core/model.ts";

export interface ChatWindowSnapshot {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly status: InboxStatus;
}

const STORAGE_PREFIX = "conversation-canvas:chat:";

export function isDesktopChatDetach(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
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
  return "popup=yes,width=540,height=640,left=80,top=80";
}

export function openDetachedChatUrl(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("chat", id);
  return url.toString();
}

export function parseStandaloneChatId(): string | null {
  return new URLSearchParams(window.location.search).get("chat");
}
