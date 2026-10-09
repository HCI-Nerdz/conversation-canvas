import assert from "node:assert/strict";
import test from "node:test";

import {
  CARD_GRID_STEP_X,
  CARD_GRID_STEP_Y,
  CARD_HEIGHT,
  fitViewportToCards,
} from "../core/model.ts";
import { demoModel, fillerCards, fillerGridOrigin } from "./demoSeed.ts";

test("filler grid starts below the seeded demo cards", () => {
  const origin = fillerGridOrigin(demoModel.cards);
  const maxBottom = Math.max(...demoModel.cards.map((c) => c.y + CARD_HEIGHT));
  assert.equal(origin.originY, maxBottom + 48);
  assert.ok(origin.originY > 400);

  const first = fillerCards(1, demoModel.cards)[0];
  assert.equal(first?.y, origin.originY);
  assert.ok(first && first.y >= maxBottom + 48);
});

test("repeated filler batches stack without overlapping prior fillers", () => {
  const batchA = fillerCards(10, demoModel.cards);
  const combined = [...demoModel.cards, ...batchA];
  const batchB = fillerCards(10, combined);
  const overlap = batchB.some((b) =>
    batchA.some((a) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1),
  );
  assert.equal(overlap, false);
  assert.ok(batchB[0] && batchB[0].y > batchA[0]!.y);
});

test("fit viewport includes seed chats and 120 fillers together", () => {
  const all = [...demoModel.cards, ...fillerCards(120, demoModel.cards)];
  const vp = fitViewportToCards(all, 608, 640);
  const visibleTop = -vp.y / vp.zoom;
  const visibleBottom = visibleTop + 640 / vp.zoom;
  const minY = Math.min(...all.map((c) => c.y));
  const maxY = Math.max(...all.map((c) => c.y + CARD_GRID_STEP_Y));
  assert.ok(visibleTop <= minY + 2);
  assert.ok(visibleBottom >= maxY - 2);
});

test("filler grid rows and columns leave gap between card footprints", () => {
  const row = fillerCards(2, []);
  assert.ok(row[0] && row[1]);
  assert.equal(row[1]!.x - row[0]!.x, CARD_GRID_STEP_X);
  const col = fillerCards(11, []);
  assert.equal(col[10]!.y - col[0]!.y, CARD_GRID_STEP_Y);
  assert.equal(col[10]!.x, col[0]!.x);
});
