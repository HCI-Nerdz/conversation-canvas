import type { CanvasModel, ConversationCard, InboxStatus } from "../core/model.ts";

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
      "working",
      40,
      40,
      ["Auth bug", "Cookie domain"],
    ),
    card(
      "copy",
      "Changelog voice",
      "Draft is ready. You read it. It still needs a yes before the notes go out.",
      "needsResponse",
      300,
      48,
      ["Release notes"],
    ),
    card(
      "inbox",
      "Unread design review",
      "A new pass landed on the archive bin while you were in another thread.",
      "unread",
      560,
      36,
    ),
    card(
      "snooze",
      "Hold until CI",
      "Parked on purpose. Nothing should run until the pipeline answers.",
      "waiting",
      80,
      280,
    ),
    card(
      "read",
      "Font subset check",
      "You opened this after it finished. Nothing is waiting on you.",
      "read",
      340,
      270,
    ),
    card(
      "done",
      "Icon pass",
      "You marked this complete. It stays on the desk until you archive it.",
      "completed",
      600,
      260,
      ["Favicon", "Eye mark"],
    ),
  ],
};

export function fillerCards(count: number): ConversationCard[] {
  const columns = 10;
  const colWidth = 232;
  const rowHeight = 196;
  return Array.from({ length: count }, (_, index) =>
    card(
      `fill-${index}`,
      `Thread ${index + 1}`,
      "Shell card only — open it to read the transcript.",
      index % 5 === 0 ? "working" : "read",
      32 + (index % columns) * colWidth,
      32 + Math.floor(index / columns) * rowHeight,
    ),
  );
}
