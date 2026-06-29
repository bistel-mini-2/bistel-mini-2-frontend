import { axios } from "./axiosConfig";

const ELIGIBILITY_REQUESTS_PATH = "/api/v1/eligibility/requests";

const createRequest = ({
  policyId,
  userConditions,
  sourceRefId,
  sourceType,
  rawQuery,
}, config = {}) =>
  axios.post(
    ELIGIBILITY_REQUESTS_PATH,
    {
      policy_id: policyId,
      source_type: sourceType || "POLICY_DETAIL",
      user_conditions: userConditions,
      source_ref_id:
        sourceRefId ||
        (sourceType === "RECOMMENDATION_RESULT" ? null : policyId),
      raw_query: rawQuery || null,
    },
    config
  );

const getResult = (requestId, config = {}) =>
  axios.get(`${ELIGIBILITY_REQUESTS_PATH}/${requestId}`, config);

const submitAnswers = (requestId, payload = {}, config = {}) =>
  axios.post(
    `${ELIGIBILITY_REQUESTS_PATH}/${encodeURIComponent(requestId)}/answers`,
    payload,
    config
  );

const eligibilityApi = {
  createRequest,
  getResult,
  submitAnswers,
};

export default eligibilityApi;
