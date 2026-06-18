import { axios } from "./axiosConfig";

const signup = (payload) => axios.post("/auth/signup", payload);

const login = (payload) => axios.post("/auth/login", payload);

const getMe = () => axios.get("/auth/me");

const authApi = {
  signup,
  login,
  getMe,
};

export default authApi;
