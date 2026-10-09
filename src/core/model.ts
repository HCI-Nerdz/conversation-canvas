export type InboxStatus =
  | "working"
  | "waiting"
  | "unread"
  | "read"
  | "needsResponse"
  | "completed";

export type ArchiveViewMode = "spatial" | "grid" | "list";

export interface TopicBookmark {
  readonly id: string;
  readonly title: string;
  readonly changedAt: string;
}

export interface ConversationCard {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly status: InboxStatus;
  readonly x: number;
  readonly y: number;
  readonly zIndex: number;
  readonly archivedAt: string | null;
  readonly topics: readonly TopicBookmark[];
}

export interface FileNode {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly zIndex: number;
}

export interface PromptLinkEdge {
  readonly id: string;
  readonly fileId: string;
  readonly cardId: string;
}

export interface CanvasViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CanvasModel {
  readonly cards: readonly ConversationCard[];
  readonly files: readonly FileNode[];
  readonly edges: readonly PromptLinkEdge[];
  readonly viewport: CanvasViewport;
  readonly archiveOpen: boolean;
  readonly archiveViewMode: ArchiveViewMode;
  readonly openTopicsId: string | null;
}

export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 184;

export const STATUS_LABEL: Record<InboxStatus, string> = {
  working: "Working",
  waiting: "Waiting",
  unread: "Unread",
  read: "Read",
  needsResponse: "Needs response",
  completed: "Completed",
};

export interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function activeCards(model: CanvasModel): ConversationCard[] {
  return model.cards.filter((card) => card.archivedAt === null);
}

export function archivedCards(model: CanvasModel): ConversationCard[] {
  return [...model.cards.filter((card) => card.archivedAt !== null)].sort((left, right) =>
    (right.archivedAt ?? "").localeCompare(left.archivedAt ?? ""),
  );
}

export function worldViewport(viewport: CanvasViewport, width: number, height: number, buffer: number): WorldRect {
  const zoom = viewport.zoom || 1;
  return {
    x: -viewport.x / zoom - buffer,
    y: -viewport.y / zoom - buffer,
    width: width / zoom + buffer * 2,
    height: height / zoom + buffer * 2,
  };
}

export function intersects(card: Pick<ConversationCard, "x" | "y">, view: WorldRect): boolean {
  return (
    card.x + CARD_WIDTH > view.x &&
    card.x < view.x + view.width &&
    card.y + CARD_HEIGHT > view.y &&
    card.y < view.y + view.height
  );
}

export function cardsInView(cards: readonly ConversationCard[], view: WorldRect): ConversationCard[] {
  return cards.filter((card) => intersects(card, view));
}

export function fitViewportToCards(
  cards: readonly Pick<ConversationCard, "x" | "y">[],
  stageWidth: number,
  stageHeight: number,
  padding = 48,
): CanvasViewport {
  if (cards.length === 0) return { x: 24, y: 24, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const card of cards) {
    minX = Math.min(minX, card.x);
    minY = Math.min(minY, card.y);
    maxX = Math.max(maxX, card.x + CARD_WIDTH);
    maxY = Math.max(maxY, card.y + CARD_HEIGHT);
  }
  const worldW = maxX - minX + padding * 2;
  const worldH = maxY - minY + padding * 2;
  const zoom = Math.min(2.5, Math.max(0.25, Math.min(stageWidth / worldW, stageHeight / worldH)));
  const x = (stageWidth - (maxX - minX + padding * 2) * zoom) / 2 - (minX - padding) * zoom;
  const y = (stageHeight - (maxY - minY + padding * 2) * zoom) / 2 - (minY - padding) * zoom;
  return { x, y, zoom };
}

export function nextZ(cards: readonly { zIndex: number }[]): number {
  return cards.reduce((max, card) => Math.max(max, card.zIndex), 0) + 1;
}

export function retitleCard(card: ConversationCard, title: string, changedAt: string): ConversationCard {
  if (title === card.title) return card;
  return {
    ...card,
    title,
    topics: [{ id: `${card.id}:${changedAt}`, title: card.title, changedAt }, ...card.topics],
  };
}

export function archiveCard(card: ConversationCard, archivedAt: string): ConversationCard {
  if (card.archivedAt !== null) return card;
  return { ...card, archivedAt };
}

export function restoreCard(card: ConversationCard, zIndex: number): ConversationCard {
  return { ...card, archivedAt: null, zIndex };
}
