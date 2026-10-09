import assert from "node:assert/strict";
import test from "node:test";

import { peekLastMessage } from "./messagePeek.ts";

test("peekLastMessage omits overflow instead of clamping in the DOM", () => {
  const long = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
  const peek = peekLastMessage(long, 40);
  assert.ok(peek.truncated);
  assert.ok(long.startsWith(peek.text) || peek.text.length < long.length);
  assert.ok(!peek.text.includes("omega"));
});
