import { axios } from "./axiosConfig";

const comparePolicies = ({ policyA, policyB, signal } = {}) =>
  axios.get("/compare", {
    params: {
      a: policyA,
      b: policyB,
    },
    signal,
  });

const compareApi = { comparePolicies };

export default compareApi;
