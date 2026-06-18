import { axios } from "./axiosConfig";

const AUTH_BASE_PATH = "/api/v1/auth";

const getAccessToken = (data) =>
  data?.access_token ||
  data?.accessToken ||
  data?.token ||
  data?.session?.access_token ||
  data?.session?.accessToken;

const getUserSummary = (data) => {
  const user = data?.user || data?.user_summary || data?.userSummary;

  if (user) {
    return user;
  }

  const userId = data?.user_id || data?.userId || data?.id;
  if (userId || data?.email || data?.nickname || data?.role) {
    return {
      user_id: userId,
      email: data?.email,
      nickname: data?.nickname,
      role: data?.role,
    };
  }

  return null;
};

const createAuthResult = (data) => {
  const accessToken = getAccessToken(data);

  if (!accessToken) {
    const error = new Error("인증 응답에서 access token을 확인하지 못했어요.");
    error.code = "AUTH_TOKEN_MISSING";
    throw error;
  }

  return {
    accessToken,
    user: getUserSummary(data),
    raw: data,
  };
};

const signup = async (payload) => {
  const data = await axios.post(`${AUTH_BASE_PATH}/signup`, payload);
  return createAuthResult(data);
};

const validateSignup = async (payload) => {
  const data = await axios.post(`${AUTH_BASE_PATH}/signup/validate`, payload);

  if (data?.valid === false) {
    const error = new Error("회원가입 정보를 다시 확인해주세요.");
    error.code = "SIGNUP_VALIDATION_FAILED";
    throw error;
  }

  return data;
};

const login = async (payload) => {
  const data = await axios.post(`${AUTH_BASE_PATH}/login`, payload);
  return createAuthResult(data);
};

const getMe = () => axios.get("/api/v1/users/me");

const authApi = {
  signup,
  validateSignup,
  login,
  getMe,
};

export default authApi;
