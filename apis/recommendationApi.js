import { axios } from "./axiosConfig";

const RECOMMENDATIONS_BASE_PATH = "/api/v1/recommendations/requests";

const getRequestId = (data) =>
  data?.request_id ||
  data?.requestId ||
  data?.data?.request_id ||
  data?.data?.requestId ||
  data?.recommendation_request?.request_id ||
  data?.recommendation_request?.requestId ||
  data?.recommendationRequest?.request_id ||
  data?.recommendationRequest?.requestId;

export const createRecommendationRequest = async (payload) => {
  const data = await axios.post(RECOMMENDATIONS_BASE_PATH, payload);
  const requestId = getRequestId(data);

  if (!requestId) {
    const error = new Error("추천 요청 응답에서 request_id를 확인하지 못했어요.");
    error.code = "RECOMMENDATION_REQUEST_ID_MISSING";
    throw error;
  }

  return {
    requestId,
    raw: data,
  };
};

const recommendationApi = {
  createRecommendationRequest,
};

export default recommendationApi;
