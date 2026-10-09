import assert from "node:assert/strict";
import test from "node:test";

import { inboxStatusForDisplay } from "./model.ts";

test("dirty composer on needs-attention shows split lamp", () => {
  assert.equal(inboxStatusForDisplay("needsAttention", true), "needsAttentionDirty");
  assert.equal(inboxStatusForDisplay("needsAttention", false), "needsAttention");
});

test("dirty composer elsewhere shows grey dirty", () => {
  assert.equal(inboxStatusForDisplay("read", true), "dirty");
  assert.equal(inboxStatusForDisplay("agentWorking", true), "dirty");
});

test("signed off ignores composer draft", () => {
  assert.equal(inboxStatusForDisplay("signedOff", true), "signedOff");
});
