import assert from "node:assert/strict";
import test from "node:test";

import { inboxStatusForDisplay } from "./model.ts";

test("composer draft overlays needs-user as split lamp", () => {
  assert.equal(inboxStatusForDisplay("needsUser", true), "draftNeedsUser");
  assert.equal(inboxStatusForDisplay("needsUser", false), "needsUser");
});

test("composer draft on read shows draft grey", () => {
  assert.equal(inboxStatusForDisplay("read", true), "draft");
  assert.equal(inboxStatusForDisplay("agentWorking", true), "draft");
});

test("signed off ignores composer draft", () => {
  assert.equal(inboxStatusForDisplay("signedOff", true), "signedOff");
});
