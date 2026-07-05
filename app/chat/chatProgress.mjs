const MAX_PENDING_PERCENT = 95;

export const CHAT_PROGRESS_PROFILES = {
  recommendation: {
    totalMs: 29300,
    firstEventMs: 6400,
    preEventTarget: 9,
    nodeMs: {
      candidate_search: 3020,
      rule_filter: 100,
      candidate_save: 440,
      policy_assessment: 4830,
      assessment_save: 480,
      build_result: 950,
      llm_rerank: 12600,
      rerank_save: 100,
      finalize_result: 150,
    },
  },
  eligibility: {
    totalMs: 240000,
    firstEventMs: 200,
    preEventTarget: 4,
    nodeMs: {
      create_request: 300,
      mark_processing: 100,
      assess_policy: 240000,
      build_result: 3000,
    },
  },
  comparison: {
    totalMs: 8500,
    firstEventMs: 5900,
    preEventTarget: 45,
    nodeMs: {
      compare_policies: 2470,
      build_result: 150,
    },
  },
  policy_summary: {
    totalMs: 3100,
    firstEventMs: 3100,
    preEventTarget: MAX_PENDING_PERCENT,
    nodeMs: {
      summary_evidence_search: 1200,
      policy_summary: 1900,
    },
  },
  default: {
    totalMs: 30000,
    firstEventMs: 30000,
    preEventTarget: MAX_PENDING_PERCENT,
    nodeMs: {},
  },
};

const FLOW_ALIASES = {
  recommend: "recommendation",
  recommendation: "recommendation",
  eligibility: "eligibility",
  compare: "comparison",
  comparison: "comparison",
  summary: "policy_summary",
  policy_summary: "policy_summary",
};

const clampPercent = (value) =>
  Math.max(1, Math.min(MAX_PENDING_PERCENT, Math.round(Number(value) || 1)));

const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const normalizeProgressFlow = (flow) =>
  FLOW_ALIASES[String(flow || "").toLowerCase()] || "default";

export const createChatProgress = (now = Date.now(), flow = "default") => ({
  progressFlow: normalizeProgressFlow(flow),
  progressStep: 0,
  progressTotal: 0,
  progressStatus: "waiting",
  progressNode: null,
  progressPercent: 1,
  progressStartedAt: now,
  progressAnchorPercent: 1,
});

export const setProgressFlow = (state, flow, now = Date.now()) => {
  const progressFlow = normalizeProgressFlow(flow);
  if (progressFlow === state.progressFlow) return state;
  return {
    progressFlow,
    progressStartedAt: now,
    progressAnchorPercent: clampPercent(state.progressPercent),
  };
};

export const applyProgressEvent = (state, event, now = Date.now()) => {
  const progressFlow = normalizeProgressFlow(event?.flow || state.progressFlow);
  const step = positiveNumber(event?.step);
  const total = positiveNumber(event?.total_steps ?? event?.total);
  const status = String(event?.status || "started").toLowerCase();
  const previousPercent = clampPercent(state.progressPercent);
  const completedBoundary = step && total
    ? clampPercent((step / total) * MAX_PENDING_PERCENT)
    : previousPercent;
  const startedBoundary = step && total
    ? clampPercent(((step - 1) / total) * MAX_PENDING_PERCENT)
    : previousPercent;
  const nextPercent = status === "completed"
    ? Math.max(previousPercent, completedBoundary)
    : Math.max(previousPercent, startedBoundary);

  return {
    progressFlow,
    progressStep: step || positiveNumber(state.progressStep),
    progressTotal: total || positiveNumber(state.progressTotal),
    progressStatus: status,
    progressNode: event?.node || state.progressNode || null,
    progressPercent: nextPercent,
    progressStartedAt: now,
    progressAnchorPercent: nextPercent,
  };
};

export const tickChatProgress = (state, now = Date.now()) => {
  const profile = CHAT_PROGRESS_PROFILES[state.progressFlow] || CHAT_PROGRESS_PROFILES.default;
  const previousPercent = clampPercent(state.progressPercent);
  const anchorPercent = clampPercent(state.progressAnchorPercent ?? previousPercent);
  const elapsed = Math.max(0, now - positiveNumber(state.progressStartedAt));
  const step = positiveNumber(state.progressStep);
  const total = positiveNumber(state.progressTotal);

  if (state.progressStatus === "completed" && step && total) {
    return { progressPercent: previousPercent };
  }

  let targetPercent;
  let durationMs;
  if (state.progressStatus === "started" && step && total) {
    targetPercent = Math.max(anchorPercent, clampPercent((step / total) * MAX_PENDING_PERCENT) - 1);
    durationMs = positiveNumber(profile.nodeMs[state.progressNode]) || profile.totalMs / total;
  } else if (!step) {
    targetPercent = profile.preEventTarget;
    durationMs = profile.firstEventMs;
  } else {
    targetPercent = MAX_PENDING_PERCENT;
    durationMs = profile.totalMs;
  }

  const ratio = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1;
  const interpolated = anchorPercent + (targetPercent - anchorPercent) * ratio;
  return { progressPercent: Math.max(previousPercent, clampPercent(interpolated)) };
};
