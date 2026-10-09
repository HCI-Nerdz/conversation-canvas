import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveCard,
  cardsInView,
  restoreCard,
  retitleCard,
  worldViewport,
  type ConversationCard,
} from "./model.ts";

function card(partial: Partial<ConversationCard> & Pick<ConversationCard, "id">): ConversationCard {
  return {
    title: partial.id,
    blurb: "blurb",
    status: "read",
    x: 0,
    y: 0,
    zIndex: 1,
    archivedAt: null,
    topics: [],
    ...partial,
  };
}

test("viewport culling drops cards outside the padded world rect", () => {
  const view = worldViewport({ x: 0, y: 0, zoom: 1 }, 400, 300, 0);
  const visible = cardsInView(
    [card({ id: "near", x: 10, y: 10 }), card({ id: "far", x: 4000, y: 10 })],
    view,
  );
  assert.deepEqual(
    visible.map((item) => item.id),
    ["near"],
  );
});

test("retitle prepends the previous title as a bookmark", () => {
  const next = retitleCard(card({ id: "a", title: "Auth bug" }), "Session refresh", "2026-10-09T00:00:00.000Z");
  assert.equal(next.title, "Session refresh");
  assert.equal(next.topics[0]?.title, "Auth bug");
});

test("archive remembers the card and restore clears the stamp while raising z", () => {
  const archived = archiveCard(card({ id: "a", x: 40, y: 80, zIndex: 2 }), "2026-10-09T01:00:00.000Z");
  assert.equal(archived.x, 40);
  assert.equal(archived.archivedAt, "2026-10-09T01:00:00.000Z");
  const restored = restoreCard(archived, 9);
  assert.equal(restored.archivedAt, null);
  assert.equal(restored.zIndex, 9);
  assert.equal(restored.x, 40);
});
