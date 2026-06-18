import { axios } from "./axiosConfig";

const USERS_ME_PATH = "/api/v1/users/me";

const normalizeUserData = (data) =>
  data?.user || data?.user_summary || data?.userSummary || data;

const getMe = async () => {
  const data = await axios.get(USERS_ME_PATH);
  return normalizeUserData(data);
};

const updateMe = async (payload) => {
  const data = await axios.patch(USERS_ME_PATH, payload);
  return normalizeUserData(data);
};

const updatePassword = (payload) => {
  return axios.put(`${USERS_ME_PATH}/password`, payload);
};

const userApi = {
  getMe,
  updateMe,
  updatePassword,
};

export default userApi;
