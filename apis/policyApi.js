import { axios } from "./axiosConfig";

const getPolicies = ({
  query,
  category,
  tags = [],
  regionCode,
  sort = "updated_at",
  page = 1,
  size = 12,
  signal,
} = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (category) params.set("category", category);
  tags.forEach((tag) => params.append("tags", tag));
  if (regionCode) params.set("region_code", regionCode);
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return axios.get("/api/v1/policies", {
    params,
    signal,
    preserveResponse: true,
  });
};

const policyApi = { getPolicies };

export default policyApi;
