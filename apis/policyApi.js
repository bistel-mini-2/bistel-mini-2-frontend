import { axios } from "./axiosConfig";

const getPolicies = ({
  query,
  category,
  stage,
  sort = "updated_at",
  page = 1,
  size = 12,
  signal,
} = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
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

const policyApi = { getPolicies, getPolicyDetail, getPolicyAiSummary };

export default policyApi;
