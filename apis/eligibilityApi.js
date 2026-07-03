import { axios } from "./axiosConfig";
import { postSseStream } from "./sseStreamClient";

const ELIGIBILITY_REQUESTS_PATH = "/api/v1/eligibility/requests";
const ELIGIBILITY_STREAM_PATH = "/api/v1/eligibility/requests/stream";

const createRequest = ({
  chatSessionId,
  policyId,
  userConditions,
  sourceRefId,
  sourceType,
  rawQuery,
  manualConfirmations,
}, config = {}) =>
  axios.post(
    ELIGIBILITY_REQUESTS_PATH,
    {
      ...(chatSessionId ? { chat_session_id: chatSessionId } : {}),
      policy_id: policyId,
      source_type: sourceType || "POLICY_DETAIL",
      user_conditions: userConditions,
      source_ref_id:
        sourceRefId ||
        (sourceType === "RECOMMENDATION_RESULT" ? null : policyId),
      raw_query: rawQuery || null,
      manual_confirmations: manualConfirmations || [],
    },
    config
  );

const getResult = (requestId, config = {}) =>
  axios.get(`${ELIGIBILITY_REQUESTS_PATH}/${requestId}`, config);

const streamRequest = ({
  chatSessionId,
  policyId,
  sourceRefId,
  sourceType,
  rawQuery,
  selectedConditions,
  accessToken,
  signal,
  onProgress,
  onDone,
  onError,
}) =>
  postSseStream({
    url: ELIGIBILITY_STREAM_PATH,
    body: {
      ...(chatSessionId ? { chat_session_id: chatSessionId } : {}),
      policy_id: policyId,
      source_type: sourceType || "POLICY_DETAIL",
      source_ref_id: sourceRefId || (sourceType === "RECOMMENDATION_RESULT" ? null : policyId),
      raw_query: rawQuery || null,
      selected_conditions: selectedConditions || null,
    },
    accessToken,
    signal,
    onProgress,
    onDone,
    onError,
  });

const eligibilityApi = {
  createRequest,
  getResult,
  streamRequest,
};

export default eligibilityApi;
