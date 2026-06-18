import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000",
});

axiosInstance.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const err = error.response?.data?.error;
    const message = err?.message || error.message;
    const code = err?.code || "UNKNOWN_ERROR";
    const rejected = new Error(message);
    rejected.code = code;
    return Promise.reject(rejected);
  }
);

const addAuthHeader = (accessToken) => {
  axiosInstance.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
};

const removeAuthHeader = () => {
  delete axiosInstance.defaults.headers.common["Authorization"];
};

export { axiosInstance as axios };

const axiosConfig = { addAuthHeader, removeAuthHeader };
export default axiosConfig;
