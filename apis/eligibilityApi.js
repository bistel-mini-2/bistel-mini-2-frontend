import { axios } from "./axiosConfig";

const ELIGIBILITY_REQUESTS_PATH = "/api/v1/eligibility/requests";

const createRequest = ({
  policyId,
  userConditions,
  sourceRefId,
  rawQuery,
}) =>
  axios.post(ELIGIBILITY_REQUESTS_PATH, {
    policy_id: policyId,
    user_conditions: userConditions,
    source_ref_id: sourceRefId || policyId,
    raw_query: rawQuery || null,
  });

const eligibilityApi = {
  createRequest,
};

export default eligibilityApi;
