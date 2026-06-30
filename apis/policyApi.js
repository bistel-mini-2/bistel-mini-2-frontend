import { axios } from "./axiosConfig";

const getPolicies = ({
  query,
  detailQuery,
  searchScope = "policy_name",
  category,
  tags,
  regionCode,
  region,
  stage,
  sort = "updated_at",
  page = 1,
  size = 12,
  signal,
} = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (searchScope) params.set("search_scope", searchScope);
  if (detailQuery) params.set("detail_q", detailQuery);
  if (category) params.set("category", category);
  if (Array.isArray(tags)) {
    tags.filter(Boolean).forEach((tag) => params.append("tags", tag));
  } else if (tags) {
    params.set("tags", tags);
  }
  if (regionCode) params.set("region_code", regionCode);
  else if (region) params.set("region", region);
  if (stage) params.set("stage", stage);
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return axios.get("/api/v1/policies", {
    params,
    signal,
    preserveResponse: true,
  });
};

const getPolicyDetail = (policySlug, { signal } = {}) =>
  axios.get(`/api/v1/policies/${encodeURIComponent(policySlug)}`, {
    signal,
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
    signal,
    preserveResponse: true,
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
      signal,
      preserveResponse: true,
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
