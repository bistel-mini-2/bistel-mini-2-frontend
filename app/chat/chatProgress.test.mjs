import test from "node:test";
import assert from "node:assert/strict";

import {
  applyProgressEvent,
  createChatProgress,
  setProgressFlow,
  tickChatProgress,
} from "./chatProgress.mjs";

test("new requests start at one percent", () => {
  assert.deepEqual(createChatProgress(1000), {
    progressFlow: "default",
    progressStep: 0,
    progressTotal: 0,
    progressStatus: "waiting",
    progressNode: null,
    progressPercent: 1,
    progressStartedAt: 1000,
    progressAnchorPercent: 1,
  });
});

test("intent aliases select the measured graph profile", () => {
  const initial = createChatProgress(0);
  assert.equal(setProgressFlow(initial, "recommend", 100).progressFlow, "recommendation");
  assert.equal(setProgressFlow(initial, "compare", 100).progressFlow, "comparison");
  assert.equal(setProgressFlow(initial, "summary", 100).progressFlow, "policy_summary");
});

test("completed server steps snap forward", () => {
  const progressed = applyProgressEvent(
    createChatProgress(0, "recommendation"),
    { flow: "recommendation", node: "candidate_search", step: 1, total_steps: 9, status: "completed" },
    1000
  );
  assert.equal(progressed.progressPercent, 11);
  assert.equal(progressed.progressStep, 1);
  assert.equal(progressed.progressTotal, 9);
});

test("late or reversed events never decrease progress", () => {
  const current = { ...createChatProgress(0, "recommendation"), progressPercent: 70 };
  const progressed = applyProgressEvent(
    current,
    { flow: "recommendation", step: 2, total: 9, status: "completed" },
    1000
  );
  assert.equal(progressed.progressPercent, 70);
});

test("started steps interpolate toward their boundary", () => {
  const started = applyProgressEvent(
    createChatProgress(0, "comparison"),
    { flow: "comparison", node: "compare_policies", step: 1, total: 2, status: "started" },
    1000
  );
  const halfway = tickChatProgress(started, 2235);
  assert.ok(halfway.progressPercent > started.progressPercent);
  assert.ok(halfway.progressPercent < 48);
});

test("time interpolation never reaches one hundred before done", () => {
  const state = createChatProgress(0, "policy_summary");
  assert.equal(tickChatProgress(state, 60000).progressPercent, 95);
});

test("general chat uses the default thirty second profile", () => {
  const state = createChatProgress(0);
  const halfway = tickChatProgress(state, 15000);
  assert.ok(halfway.progressPercent >= 47 && halfway.progressPercent <= 49);
});

test("invalid step metadata falls back without producing NaN", () => {
  const state = applyProgressEvent(
    createChatProgress(0, "unknown"),
    { flow: "unknown", step: 0, total_steps: 0, status: "started" },
    1000
  );
  assert.ok(Number.isFinite(tickChatProgress(state, 5000).progressPercent));
});
