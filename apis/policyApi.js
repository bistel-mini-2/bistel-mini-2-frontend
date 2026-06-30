import { axios } from "./axiosConfig";

const DEFAULT_TIMEOUT_MS = 15000;

function withTimeoutSignal(signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    if (signal && AbortSignal.any) {
      return AbortSignal.any([signal, timeoutSignal]);
    }
    return signal || timeoutSignal;
  }

  if (!signal) return signal;
  return signal;
}

const getPolicies = ({
  query,
  detailQuery,
  category,
  stage,
  sort = "updated_at",
  page = 1,
  size = 12,
  signal,
} = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (query) params.set("search_scope", "policy_name");
  if (detailQuery) params.set("detail_q", detailQuery);
  if (category) params.set("category", category);
  if (stage) params.set("stage", stage);
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return axios.get("/api/v1/policies", {
    params,
    signal: withTimeoutSignal(signal),
    preserveResponse: true,
    timeout: DEFAULT_TIMEOUT_MS,
  });
};

const getPolicyDetail = (policySlug, { signal } = {}) =>
  axios.get(`/api/v1/policies/${encodeURIComponent(policySlug)}`, {
    signal: withTimeoutSignal(signal),
    timeout: DEFAULT_TIMEOUT_MS,
  });

const getPolicyAiSummary = (
  policySlug,
  { signal, audience = "general", includeEvidences = true } = {}
) => {
  const params = new URLSearchParams();
  if (audience) params.set("audience", audience);
  params.set("include_evidences", includeEvidences ? "true" : "false");

  const encodedSlug = encodeURIComponent(policySlug);
  const config = {
    params,
    signal: withTimeoutSignal(signal),
    preserveResponse: true,
    timeout: DEFAULT_TIMEOUT_MS,
  };

  return axios
    .get(`/api/v1/policies/${encodedSlug}/summary`, config)
    .catch((error) => {
      if (error?.status === 404) {
        return axios.get(`/api/v1/policies/${encodedSlug}/ai-summary`, config);
      }

      return Promise.reject(error);
    });
};

// 기준 정책과 유사한 정책 목록(벡터+에이전트). items 배열만 반환한다.
const getSimilarPolicies = async (policySlug, { limit = 4, signal } = {}) => {
  const data = await axios.get(
    `/api/v1/policies/${encodeURIComponent(policySlug)}/similar`,
    {
      params: { limit },
      signal: withTimeoutSignal(signal),
      preserveResponse: true,
      timeout: DEFAULT_TIMEOUT_MS,
    }
  );
  const payload = data?.data ?? data;
  return Array.isArray(payload?.items) ? payload.items : [];
};

const policyApi = {
  getPolicies,
  getPolicyDetail,
  getPolicyAiSummary,
  getSimilarPolicies,
};

export default policyApi;
