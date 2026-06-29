import { axios } from "./axiosConfig";

const CHAT_SESSIONS_PATH = "/api/v1/chat/sessions";

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getPayload = (response) => {
  if (isObject(response) && Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }

  return response;
};

const firstArray = (values) => values.find((value) => Array.isArray(value)) || [];

const normalizePolicyItem = (policy) => {
  if (!isObject(policy)) return policy;

  return {
    ...policy,
    policy_id: policy.policy_id || policy.policyId || policy.id,
    policy_name: policy.policy_name || policy.policyName || policy.name,
    slug: policy.slug || policy.policy_slug || policy.policySlug || policy.policy_id || policy.policyId,
    user_status: policy.user_status || policy.userStatus || null,
    assessment_status: policy.assessment_status || policy.assessmentStatus || null,
    reason_summary: policy.reason_summary || policy.reasonSummary || policy.summary || null,
    missing_conditions:
      policy.missing_conditions || policy.missingConditions || policy.follow_up_questions || policy.followUpQuestions || [],
    matched_conditions: policy.matched_conditions || policy.matchedConditions || [],
    manual_check_points: policy.manual_check_points || policy.manualCheckPoints || [],
  };
};

const normalizeSession = (session) => {
  if (!isObject(session)) return null;
  const id =
    session.chat_session_id ||
    session.chatSessionId ||
    session.session_id ||
    session.sessionId ||
    session.id;

  if (!id) return null;

  return {
    id: String(id),
    title: session.title || session.session_title || session.sessionTitle || "새 상담",
    lastMessageAt:
      session.last_message_at ||
      session.lastMessageAt ||
      session.updated_at ||
      session.updatedAt ||
      session.created_at ||
      session.createdAt ||
      null,
    status: session.session_status || session.sessionStatus || session.status || null,
    raw: session,
  };
};

const normalizeSessions = (response) => {
  const payload = getPayload(response);
  const sessions = firstArray([
    payload?.sessions,
    payload?.items,
    payload?.content,
    payload?.results,
    payload?.chat_sessions,
    payload?.chatSessions,
    response?.sessions,
    response?.items,
    response?.content,
    response?.results,
  ]);

  return sessions.map(normalizeSession).filter(Boolean);
};

const normalizeMessage = (message) => {
  if (!isObject(message)) return null;
  const roleValue = String(message.role || message.sender || message.message_role || "").toLowerCase();
  const role =
    roleValue === "assistant" || roleValue === "ai" || roleValue === "bot"
      ? "assistant"
      : roleValue === "user"
        ? "user"
        : message.assistant_message || message.assistantMessage
          ? "assistant"
          : "user";

  const assistantPayload = message.assistant_message || message.assistantMessage;
  const id =
    message.chat_message_id ||
    message.chatMessageId ||
    message.message_id ||
    message.messageId ||
    message.id ||
    assistantPayload?.chat_message_id ||
    assistantPayload?.chatMessageId;

  if (role === "assistant") {
    return {
      id: String(id || `assistant-${Date.now()}`),
      role,
      ...normalizeAssistantMessage(assistantPayload || message),
      createdAt: message.created_at || message.createdAt || null,
      raw: message,
    };
  }

  return {
    id: String(id || `user-${Date.now()}`),
    role,
    content: message.content || message.text || "",
    createdAt: message.created_at || message.createdAt || null,
    raw: message,
  };
};

export const normalizeAssistantMessage = (assistantMessage = {}) => {
  const payload = isObject(assistantMessage) ? assistantMessage : {};

  return {
    id: String(payload.chat_message_id || payload.chatMessageId || payload.id || `assistant-${Date.now()}`),
    role: "assistant",
    content: payload.content || payload.text || "",
    policies: Array.isArray(payload.policies) ? payload.policies.map(normalizePolicyItem) : [],
    recommendations: Array.isArray(payload.recommendations)
      ? payload.recommendations.map(normalizePolicyItem)
      : [],
    evidences: Array.isArray(payload.evidences) ? payload.evidences : [],
    applyCard: payload.apply_card || payload.applyCard || null,
    actions: Array.isArray(payload.actions) ? payload.actions : [],
    disclaimer: !!payload.disclaimer,
    contextPolicy:
      payload.context_policy ||
      payload.contextPolicy ||
      payload.slot_context?.policy_name ||
      payload.slotContext?.policyName ||
      null,
    slotRequest: payload.slot_request || payload.slotRequest || null,
    conditionFilling: payload.condition_filling || payload.conditionFilling || null,
    profileConfirm: payload.profile_confirm || payload.profileConfirm || null,
    summaryCard: payload.summary_card || payload.summaryCard || null,
    recommendationRequestId:
      payload.recommendation_request_id ||
      payload.recommendationRequestId ||
      payload.request_id ||
      payload.requestId ||
      null,
    raw: payload,
  };
};

const normalizeMessages = (response) => {
  const payload = getPayload(response);
  const messages = firstArray([
    payload?.messages,
    payload?.items,
    payload?.content,
    payload?.results,
    payload?.chat_messages,
    payload?.chatMessages,
    response?.messages,
    response?.items,
    response?.content,
    response?.results,
  ]);

  return messages.map(normalizeMessage).filter(Boolean);
};

const createSession = async ({ title, signal } = {}) => {
  const data = await axios.post(CHAT_SESSIONS_PATH, title ? { title } : {}, { signal });
  const payload = getPayload(data);
  const id =
    payload?.chat_session_id ||
    payload?.chatSessionId ||
    payload?.session_id ||
    payload?.sessionId ||
    payload?.id ||
    data?.meta?.chat_session_id ||
    data?.meta?.chatSessionId;

  if (!id) {
    const error = new Error("채팅 세션 ID를 확인하지 못했어요.");
    error.code = "CHAT_SESSION_ID_MISSING";
    throw error;
  }

  return {
    id: String(id),
    status: payload?.session_status || payload?.sessionStatus || payload?.status || null,
    raw: data,
  };
};

const getSessions = async ({ page = 1, size = 30, signal } = {}) => {
  const data = await axios.get(CHAT_SESSIONS_PATH, {
    params: { page, size },
    signal,
    preserveResponse: true,
  });

  return normalizeSessions(data);
};

const updateSession = (sessionId, payload) =>
  axios.patch(`${CHAT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}`, payload);

const deleteSession = (sessionId) =>
  axios.delete(`${CHAT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}`);

const bulkDeleteSessions = (sessionIds) =>
  axios.post(`${CHAT_SESSIONS_PATH}/bulk-delete`, {
    chat_session_ids: sessionIds.map((sessionId) => Number(sessionId)),
  });

const sendMessage = async ({ sessionId, content, signal }) => {
  const data = await axios.post(
    `${CHAT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}/messages`,
    { content },
    { signal, preserveResponse: true }
  );
  const payload = getPayload(data);
  const responseData = getPayload(payload);
  const assistantPayload = responseData?.assistant_message || responseData?.assistantMessage;

  return {
    chatSessionId:
      responseData?.chat_session_id ||
      responseData?.chatSessionId ||
      data?.meta?.chat_session_id ||
      data?.meta?.chatSessionId ||
      sessionId,
    userMessageId:
      responseData?.user_message_id ||
      responseData?.userMessageId ||
      responseData?.user_message?.chat_message_id ||
      responseData?.userMessage?.chatMessageId,
    assistantMessage: normalizeAssistantMessage(assistantPayload),
    raw: data,
  };
};

const getMessages = async ({ sessionId, signal }) => {
  const data = await axios.get(
    `${CHAT_SESSIONS_PATH}/${encodeURIComponent(sessionId)}/messages`,
    {
      signal,
      preserveResponse: true,
    }
  );

  return normalizeMessages(data);
};

const chatApi = {
  createSession,
  getSessions,
  updateSession,
  deleteSession,
  bulkDeleteSessions,
  sendMessage,
  getMessages,
};

export default chatApi;
