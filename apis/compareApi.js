import { axios } from "./axiosConfig";

const comparePolicies = ({ policyA, policyB, signal } = {}) =>
  axios.get("/compare", {
    params: {
      a: policyA,
      b: policyB,
    },
    signal,
  });

const getCompareHistory = ({ page = 1, size = 20, signal } = {}) =>
  axios.get("/api/v1/users/me/compare-history", {
    params: {
      page,
      size,
    },
    signal,
    preserveResponse: true,
  });

const deleteCompareHistory = (historyId) =>
  axios.delete(`/api/v1/users/me/compare-history/${historyId}`);

const deleteAllCompareHistory = () =>
  axios.delete("/api/v1/users/me/compare-history");

const compareApi = {
  comparePolicies,
  getCompareHistory,
  deleteCompareHistory,
  deleteAllCompareHistory,
};

export default compareApi;
