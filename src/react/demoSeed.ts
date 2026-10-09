import {
  CARD_GRID_STEP_X,
  CARD_GRID_STEP_Y,
  CARD_HEIGHT,
  type CanvasModel,
  type ConversationCard,
  type InboxStatus,
} from "../core/model.ts";

const seedTopics = (id: string, titles: string[]): ConversationCard["topics"] =>
  titles.map((title, index) => ({
    id: `${id}-topic-${index}`,
    title,
    changedAt: `2026-10-0${index + 1}T12:00:00.000Z`,
  }));

function card(
  id: string,
  title: string,
  blurb: string,
  status: InboxStatus,
  x: number,
  y: number,
  topics: string[] = [],
): ConversationCard {
  return {
    id,
    title,
    blurb,
    status,
    x,
    y,
    zIndex: y,
    archivedAt: null,
    topics: seedTopics(id, topics),
  };
}

export const demoModel: CanvasModel = {
  viewport: { x: 24, y: 24, zoom: 1 },
  archiveOpen: false,
  archiveViewMode: "spatial",
  openTopicsId: null,
  files: [],
  edges: [],
  cards: [
    card(
      "auth",
      "Session refresh loop",
      "The agent is still rewriting the token handoff. Last line: waiting on the cookie domain.",
      "agentWorking",
      40,
      40,
      ["Auth bug", "Cookie domain"],
    ),
    card(
      "copy",
      "Changelog voice",
      "Draft is ready. You read it. It still needs a yes before the notes go out.",
      "needsAttention",
      300,
      48,
      ["Release notes"],
    ),
    card(
      "inbox",
      "Unread design review",
      "A new pass landed while you were in another thread.",
      "needsAttention",
      560,
      36,
    ),
    card(
      "error",
      "Deploy script",
      "The run stopped on a missing env var. Nothing will proceed until you fix or retry.",
      "agentError",
      820,
      40,
    ),
    card(
      "sketch",
      "New API sketch",
      "You opened the thread to write a first prompt — needs attention even before you send.",
      "needsAttention",
      80,
      280,
    ),
    card(
      "snooze",
      "Hold until CI",
      "Pipeline running. Green flash means waiting on CI, not on you to reply.",
      "waitingOnCi",
      340,
      270,
    ),
    card(
      "read",
      "Font subset check",
      "You opened this after it finished. Read, clean composer, not signed off.",
      "read",
      600,
      270,
    ),
    card(
      "done",
      "Icon pass",
      "You signed this off after review. No status lamp — it stays on the desk until you archive it.",
      "signedOff",
      860,
      270,
      ["Favicon", "Eye mark"],
    ),
  ],
};

const FILLER_GRID_GAP = 48;

/** Place stress-test cards below (or beside) existing desk cards without overlap. */
export function fillerGridOrigin(
  existing: readonly Pick<ConversationCard, "x" | "y">[],
  gap = FILLER_GRID_GAP,
): { originX: number; originY: number } {
  if (existing.length === 0) return { originX: 32, originY: 32 };
  let maxBottom = -Infinity;
  let minX = Infinity;
  for (const item of existing) {
    maxBottom = Math.max(maxBottom, item.y + CARD_HEIGHT);
    minX = Math.min(minX, item.x);
  }
  return { originX: minX, originY: maxBottom + gap };
}

export function fillerCards(
  count: number,
  existing: readonly Pick<ConversationCard, "x" | "y">[] = [],
): ConversationCard[] {
  const columns = 10;
  const { originX, originY } = fillerGridOrigin(existing);
  const cycle: InboxStatus[] = ["agentWorking", "read", "needsAttention", "waitingOnCi", "read"];
  return Array.from({ length: count }, (_, index) =>
    card(
      `fill-${index}`,
      `Thread ${index + 1}`,
      "Shell card only — open it to read the transcript.",
      cycle[index % cycle.length] ?? "read",
      originX + (index % columns) * CARD_GRID_STEP_X,
      originY + Math.floor(index / columns) * CARD_GRID_STEP_Y,
    ),
  );
}
