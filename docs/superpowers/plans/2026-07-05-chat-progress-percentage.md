# Chat Progress Percentage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Render a monotonic percentage and progress bar for pending chat graph requests using server steps plus measured-time interpolation.

**Architecture:** Keep progress math in a pure ESM module so it can be tested with Node's built-in test runner. Store the active flow, step, timing anchor, and percentage on the provisional assistant message; a single React interval advances only pending messages and SSE callbacks snap them to authoritative server boundaries.

**Tech Stack:** Next.js 16, React 19, JavaScript ESM, Node `node:test`, SSE

---

### Task 1: Pure progress model

**Files:**
- Create: `app/chat/chatProgress.mjs`
- Create: `app/chat/chatProgress.test.mjs`

- [x] **Step 1: Write failing tests for initial state, intent mapping, step boundaries, interpolation, and monotonic caps**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { applyProgressEvent, createChatProgress, tickChatProgress } from "./chatProgress.mjs";

test("completed server steps snap forward without decreasing", () => {
  const initial = createChatProgress(0);
  const progressed = applyProgressEvent({ ...initial, percent: 70 }, {
    flow: "recommendation", step: 4, total_steps: 9, status: "completed",
  }, 1000);
  assert.equal(progressed.percent, 70);
});

test("time interpolation never reaches 100 before done", () => {
  const state = createChatProgress(0, "policy_summary");
  assert.equal(tickChatProgress(state, 60_000).percent, 95);
});
```

- [x] **Step 2: Run tests and confirm the missing module/function failure**

Run: `node --test app/chat/chatProgress.test.mjs`
Expected: FAIL because `chatProgress.mjs` does not exist.

- [x] **Step 3: Implement measured profiles and pure state transitions**

```js
export const CHAT_PROGRESS_PROFILES = {
  recommendation: { totalMs: 29300, firstEventMs: 6400, maxPercent: 95 },
  eligibility: { totalMs: 240000, firstEventMs: 200, maxPercent: 95 },
  comparison: { totalMs: 8500, firstEventMs: 5900, maxPercent: 95 },
  policy_summary: { totalMs: 3100, firstEventMs: 3100, maxPercent: 95 },
  default: { totalMs: 30000, firstEventMs: 5000, maxPercent: 95 },
};
```

Implement and export `normalizeProgressFlow`, `createChatProgress`, `setProgressFlow`, `applyProgressEvent`, and `tickChatProgress`. Clamp pending progress to 95%, calculate completed step boundaries from `step / total`, interpolate started steps toward their boundary, and always return `max(previousPercent, calculatedPercent)`.

- [x] **Step 4: Run focused tests**

Run: `node --test app/chat/chatProgress.test.mjs`
Expected: all tests PASS.

### Task 2: Connect progress state to chat SSE

**Files:**
- Modify: `app/chat/page.js`

- [x] **Step 1: Import progress helpers and initialize provisional messages at 1%**

```js
import {
  applyProgressEvent,
  createChatProgress,
  setProgressFlow,
  tickChatProgress,
} from "@/app/chat/chatProgress.mjs";
```

Spread `createChatProgress(Date.now())` into newly created and recovered provisional assistant messages.

- [x] **Step 2: Store authoritative intent and progress events**

In `onIntent`, call `setProgressFlow(message, event.intent, Date.now())`. In `onProgress`, call `applyProgressEvent(message, event, Date.now())` while preserving request metadata and status text.

- [x] **Step 3: Add one interval for pending messages**

```js
useEffect(() => {
  const timer = window.setInterval(() => {
    const now = Date.now();
    setMessages((current) => current.map((message) =>
      message.provisional && message.requestStatus !== CHAT_REQUEST_UI_STATUS.COMPLETED
        ? { ...message, ...tickChatProgress(message, now) }
        : message
    ));
  }, 250);
  return () => window.clearInterval(timer);
}, []);
```

Only create the interval while at least one provisional request is pending, and stop updating failed/cancelled messages.

- [x] **Step 4: Preserve progress through recovery and finish at 100 internally**

Recovery placeholders start from the saved message percentage or 1%. Completed payload replacement removes the provisional progress UI. Failed and cancelled states retain their last percentage without further ticks.

### Task 3: Render accessible percentage UI

**Files:**
- Modify: `app/chat/page.js`

- [x] **Step 1: Render percentage beside the status label**

```jsx
<span>{statusText}</span>
{Number.isFinite(message.progressPercent) && (
  <strong style={{ marginLeft: "auto" }}>{message.progressPercent}%</strong>
)}
```

- [x] **Step 2: Render a thin progress bar for active requests**

Use `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-valuenow={message.progressPercent}`. Use existing CSS variables (`--dd-coral-500`, `--dd-stone-100`) and inline styles consistent with the current component.

- [x] **Step 3: Do not render the bar for failed or cancelled requests**

Keep the final percentage text available for context, but hide active animation and the bar once the status is terminal.

### Task 4: Verify and ship

**Files:**
- Modify: `docs/superpowers/plans/2026-07-05-chat-progress-percentage.md`

- [x] **Step 1: Run focused unit tests**

Run: `node --test app/chat/chatProgress.test.mjs`
Expected: PASS.

- [x] **Step 2: Run repository checks**

Run: `npm run lint && npm run build`
Expected: no errors; the existing `app/layout.js` custom-font warning may remain.

- [x] **Step 3: Review the final diff**

Run: `git diff --check && git diff --stat && git status --short`
Expected: only the progress module, its tests, chat page, and this plan are changed.

- [x] **Step 4: Commit implementation**

```bash
git add app/chat/chatProgress.mjs app/chat/chatProgress.test.mjs app/chat/page.js docs/superpowers/plans/2026-07-05-chat-progress-percentage.md
git commit -m "feat: 채팅 그래프 진행률 표시"
```
