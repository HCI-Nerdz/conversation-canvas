import assert from "node:assert/strict";
import test from "node:test";

import { CARD_HEIGHT } from "../core/model.ts";
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
