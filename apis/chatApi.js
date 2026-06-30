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

const getPolicyLabel = (policy) =>
  policy?.policy_name || policy?.policyName || policy?.name || policy?.title || String(policy || "");

const getPolicyValue = (policy) =>
  policy?.policy_id || policy?.policyId || policy?.id || policy?.slug || getPolicyLabel(policy);

const normalizePolicyOptions = (options = []) =>
  options.map((option) => {
    if (!isObject(option)) return option;
    return {
      ...option,
      label: option.label || option.name || option.policy_name || option.policyName || option.title || String(getPolicyValue(option)),
      value: option.value || getPolicyValue(option),
    };
  });

const normalizeSlotRequest = (slotRequest) => {
  if (!isObject(slotRequest)) return slotRequest || null;
  const fields = Array.isArray(slotRequest.fields)
    ? slotRequest.fields
    : Array.isArray(slotRequest.slots)
      ? slotRequest.slots
      : [];

  const normalizedFields = fields.map((field, index) => {
    const source = isObject(field) ? field : { label: String(field) };
    const key = source.key || source.name || source.field || source.field_name || source.fieldName || `slot_${index + 1}`;
    return {
      ...source,
      key,
      label:
        source.label ||
        source.question ||
        source.question_text ||
        source.questionText ||
        source.message ||
        key,
      options: normalizePolicyOptions(source.options || source.choices || source.candidates || source.policies || []),
    };
  });

  if (normalizedFields.length > 0) {
    return { ...slotRequest, fields: normalizedFields };
  }

  const options = normalizePolicyOptions(
    slotRequest.options || slotRequest.choices || slotRequest.candidates || slotRequest.policies || []
  );
  const question =
    slotRequest.question ||
    slotRequest.message ||
    slotRequest.prompt ||
    slotRequest.content ||
    "어떤 정책을 선택할까요?";

  return {
    ...slotRequest,
    fields: [
      {
        key: slotRequest.key || slotRequest.slot || "policy",
        label: question,
        options,
      },
    ],
  };
};

const normalizeClarification = (clarification) => {
  if (!clarification) return null;
  if (typeof clarification === "string") {
    return {
      type: "clarification",
      fields: [{ key: "policy", label: clarification, options: [] }],
    };
  }
  if (!isObject(clarification)) return null;
  return normalizeSlotRequest({
    type: "clarification",
    ...clarification,
  });
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const normalizeSummaryCard = (payload, policies = []) => {
  const rawCard = payload.summary_card || payload.summaryCard || payload.policy_summary || payload.policySummary || null;
  const card = isObject(rawCard) ? rawCard : {};
  const hasPayloadSummary =
    rawCard ||
    payload.easy_summary ||
    payload.easySummary ||
    payload.key_points ||
    payload.keyPoints ||
    payload.target_summary ||
    payload.targetSummary ||
    payload.benefit_summary ||
    payload.benefitSummary ||
    payload.application_summary ||
    payload.applicationSummary;

  if (!hasPayloadSummary) return null;

  const rawKeyPoints = pickFirst(card.key_points, card.keyPoints, payload.key_points, payload.keyPoints, []);

  // key_points가 {label, content} 객체 배열이면 label 기준으로 target/benefit/apply/caution 추출
  let kpTarget = null, kpBenefit = null, kpApply = null, kpCaution = null;
  const keyConditions = [];
  if (Array.isArray(rawKeyPoints) && rawKeyPoints.length > 0 && isObject(rawKeyPoints[0])) {
    for (const point of rawKeyPoints) {
      const label = String(point.label || "");
      const content = String(point.content || "");
      if (!content) continue;
      if (label === "target" || /대상|자격|조건|연령|소득|거주/.test(label)) kpTarget = kpTarget || content;
      else if (label === "benefit" || /혜택|금액/.test(label)) kpBenefit = kpBenefit || content;
      else if (label === "application" || /신청|방법|절차/.test(label)) kpApply = kpApply || content;
      else if (label === "condition_check" || /유의|주의/.test(label)) kpCaution = kpCaution || content;
      else keyConditions.push(content);
    }
  } else if (Array.isArray(rawKeyPoints)) {
    keyConditions.push(
      ...rawKeyPoints.filter((p) => /대상|조건|자격|연령|소득|거주|지역|가구|출산|임신|아동|영유아/.test(String(p)))
    );
  }

  return {
    ...card,
    summary: pickFirst(card.summary, typeof rawCard === "string" ? rawCard : null, payload.easy_summary, payload.easySummary, payload.summary),
    key_conditions: pickFirst(card.key_conditions, card.keyConditions, keyConditions.length > 0 ? keyConditions : null) || [],
    target: pickFirst(card.target, card.target_summary, card.targetSummary, payload.target_summary, payload.targetSummary, kpTarget),
    benefit: pickFirst(card.benefit, card.benefit_summary, card.benefitSummary, payload.benefit_summary, payload.benefitSummary, kpBenefit),
    apply: pickFirst(
      card.apply,
      card.application_summary,
      card.applicationSummary,
      card.apply_method,
      card.applyMethod,
      payload.application_summary,
      payload.applicationSummary,
      kpApply
    ),
    caution: pickFirst(card.caution, card.cautions, payload.caution, payload.cautions, kpCaution),
    policy_id: pickFirst(card.policy_id, card.policyId, payload.policy_id, payload.policyId, policies[0]?.policy_id),
    policy_name: pickFirst(card.policy_name, card.policyName, payload.policy_name, payload.policyName, policies[0]?.policy_name),
  };
};

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
  const policies = Array.isArray(payload.policies) ? payload.policies.map(normalizePolicyItem) : [];
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map(normalizePolicyItem)
    : [];
  const slotRequest = normalizeSlotRequest(payload.slot_request || payload.slotRequest) ||
    normalizeClarification(payload.clarification || payload.clarification_request || payload.clarificationRequest);

  return {
    id: String(payload.chat_message_id || payload.chatMessageId || payload.id || `assistant-${Date.now()}`),
    role: "assistant",
    content: payload.content || payload.text || "",
    policies,
    recommendations,
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
    slotRequest,
    conditionFilling: payload.condition_filling || payload.conditionFilling || null,
    profileConfirm: payload.profile_confirm || payload.profileConfirm || null,
    eligibilityResult: payload.eligibility_result || payload.eligibilityResult || null,
    summaryCard: normalizeSummaryCard(payload, policies),
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

const getSessions = async ({ page = 1, size = 30, limit, signal } = {}) => {
  // limit은 마이페이지 상담 이력처럼 개수를 제한할 때만 보낸다.
  // 채팅 화면은 limit을 안 보내므로 백엔드가 전체를 반환(기존 동작 유지).
  const data = await axios.get(CHAT_SESSIONS_PATH, {
    params: { page, size, ...(limit != null ? { limit } : {}) },
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
    chat_session_ids: sessionIds,
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
