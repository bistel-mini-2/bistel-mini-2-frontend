import axios from "axios";

axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const addAuthHeader = (accessToken) => {
  axios.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
};

const removeAuthHeader = () => {
  delete axios.defaults.headers.common["Authorization"];
};

const axiosConfig = {
  addAuthHeader,
  removeAuthHeader,
};

export default axiosConfig;
