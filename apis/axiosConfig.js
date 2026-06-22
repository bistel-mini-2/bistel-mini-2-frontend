import axios from "axios";

const DEFAULT_API_ERROR_MESSAGE = "요청 처리에 실패했어요. 잠시 후 다시 시도해주세요.";
const NETWORK_ERROR_MESSAGE = "서버와 연결하지 못했어요. 잠시 후 다시 시도해주세요.";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "",
});

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const createApiError = ({ message, code, details, status }) => {
  const error = new Error(message || DEFAULT_API_ERROR_MESSAGE);
  error.code = code || "UNKNOWN_ERROR";
  error.details = details;
  error.status = status;
  error.isApiError = true;

  return error;
};

const createResponseError = (body, status) => {
  const error = isObject(body) ? body.error : null;
  const responseMessage = isObject(body) ? body.message : null;

  return createApiError({
    message: error?.message || responseMessage,
    code: error?.code,
    details: error?.details,
    status,
  });
};

const normalizeAxiosError = (error) => {
  if (error?.isApiError) {
    return error;
  }

  const body = error?.response?.data;
  const responseError = isObject(body) ? body.error : null;
  const responseMessage = isObject(body) ? body.message : null;
  const fallbackMessage = error?.response
    ? DEFAULT_API_ERROR_MESSAGE
    : NETWORK_ERROR_MESSAGE;

  return createApiError({
    message: responseError?.message || responseMessage || fallbackMessage,
    code: responseError?.code || error?.code,
    details: responseError?.details,
    status: error?.response?.status,
  });
};

axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data;

    if (isObject(body) && Object.prototype.hasOwnProperty.call(body, "success")) {
      if (!body.success) {
        return Promise.reject(createResponseError(body, response.status));
      }

      return response.config.preserveResponse ? body : body.data;
    }

    return body;
  },
  (error) => {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

const addAuthHeader = (accessToken) => {
  axiosInstance.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
};

const removeAuthHeader = () => {
  delete axiosInstance.defaults.headers.common["Authorization"];
};

export { axiosInstance as axios };
export const getApiErrorMessage = (error, fallbackMessage) =>
  error?.message || fallbackMessage;

const axiosConfig = { addAuthHeader, removeAuthHeader };
export default axiosConfig;
