import { axios } from "./axiosConfig";

const RECOMMENDATIONS_BASE_PATH = "/api/v1/recommendations/requests";

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getRequestId = (data) =>
  data?.request_id ||
  data?.requestId ||
  data?.data?.request_id ||
  data?.data?.requestId ||
  data?.meta?.request_id ||
  data?.meta?.requestId ||
  data?.recommendation_request?.request_id ||
  data?.recommendation_request?.requestId ||
  data?.recommendationRequest?.request_id ||
  data?.recommendationRequest?.requestId;

const firstArray = (values) => values.find((value) => Array.isArray(value)) || [];

const getPayload = (data) => {
  if (isObject(data) && Object.prototype.hasOwnProperty.call(data, "data")) {
    return data.data;
  }

  return data;
};

// 추천 결과 item은 원본 객체를 그대로 반환한다.
// candidate_status / reason_summary / reason / reasons 등 백엔드 표시용 필드가
// 정규화 과정에서 누락되지 않도록 item을 가공/재구성하지 않는다.
const getRecommendationItems = (data) => {
  const payload = getPayload(data);

  return firstArray([
    data?.results,
    data?.recommendations,
    data?.items,
    data?.data?.results,
    data?.data?.recommendations,
    data?.data?.items,
    data?.data?.result?.results,
    data?.data?.result?.recommendations,
    payload?.results,
    payload?.recommendations,
    payload?.items,
    payload?.result?.results,
    payload?.result?.recommendations,
  ]);
};

const normalizeRecommendationStatus = (status, hasRecommendations) => {
  const value = String(status || "").trim().toUpperCase();

  if (["COMPLETED", "COMPLETE", "DONE", "PARTIAL", "SUCCESS", "SUCCEEDED"].includes(value)) {
    return "done";
  }

  // 추가질문 게이트: 결과 대신 답변 폼을 띄우기 위해 별도 상태로 노출한다.
  // 폴링 응답은 "follow_up", 원시 요청 상태는 "FOLLOW_UP_REQUIRED"로 올 수 있다.
  if (value === "FOLLOW_UP" || value === "FOLLOW_UP_REQUIRED") {
    return "follow_up";
  }

  if (["FAILED", "FAILURE", "ERROR"].includes(value)) {
    return "error";
  }

  if (["READY", "PROCESSING", "PENDING", "RUNNING", "LOADING"].includes(value)) {
    return "loading";
  }

  return hasRecommendations ? "done" : "loading";
};

const getQuestionText = (question) => {
  if (typeof question === "string") {
    return question;
  }

  if (!isObject(question)) {
    return "";
  }

  return (
    question.question_text ||
    question.questionText ||
    question.question ||
    question.text ||
    question.content ||
    question.prompt ||
    question.reason ||
    ""
  );
};

const normalizeFollowUpQuestions = (data, recommendations) => {
  const payload = getPayload(data);
  const questionSources = [
    data?.follow_up_questions,
    data?.followUpQuestions,
    data?.questions,
    data?.data?.follow_up_questions,
    data?.data?.followUpQuestions,
    data?.data?.questions,
    payload?.follow_up_questions,
    payload?.followUpQuestions,
    payload?.questions,
    ...recommendations.flatMap((item) => [
      item?.follow_up_questions,
      item?.followUpQuestions,
      item?.questions,
    ]),
  ];

  const seen = new Set();
  const questions = [];

  questionSources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((question) => {
      const text = getQuestionText(question).trim();

      if (!text || seen.has(text)) {
        return;
      }

      seen.add(text);
      questions.push(text);
    });
  });

  return questions;
};

const normalizeRecommendationResult = (data) => {
  const payload = getPayload(data);
  const recommendations = getRecommendationItems(data);
  const rawStatus =
    payload?.status ||
    data?.status ||
    data?.data?.status ||
    data?.meta?.status;
  const status = normalizeRecommendationStatus(rawStatus, recommendations.length > 0);

  return {
    requestId: getRequestId(data) || getRequestId(payload),
    status,
    rawStatus,
    recommendations,
    followUpQuestions: normalizeFollowUpQuestions(data, recommendations),
    reasonSummary:
      payload?.reason_summary ||
      payload?.reasonSummary ||
      payload?.summary ||
      data?.reason_summary ||
      data?.reasonSummary ||
      data?.summary,
    errorMessage:
      payload?.error_message ||
      payload?.errorMessage ||
      payload?.message ||
      data?.error?.message ||
      data?.message,
    raw: data,
  };
};

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

export const getRecommendationResult = async (requestId) => {
  if (!requestId) {
    const error = new Error("추천 요청 ID를 확인하지 못했어요.");
    error.code = "RECOMMENDATION_REQUEST_ID_REQUIRED";
    throw error;
  }

  const data = await axios.get(
    `${RECOMMENDATIONS_BASE_PATH}/${encodeURIComponent(requestId)}`,
    {
      params: {
        include_evidences: true,
        include_questions: true,
      },
      preserveResponse: true,
    }
  );

  return normalizeRecommendationResult(data);
};

// 추가질문 답변(또는 건너뛰기) 제출 → 추천 재실행.
// answers: [{ question_text, answer }]. 빈 배열이면 건너뛰기로 처리된다.
export const submitRecommendationAnswers = async (requestId, answers = []) => {
  if (!requestId) {
    const error = new Error("추천 요청 ID를 확인하지 못했어요.");
    error.code = "RECOMMENDATION_REQUEST_ID_REQUIRED";
    throw error;
  }

  return axios.post(
    `${RECOMMENDATIONS_BASE_PATH}/${encodeURIComponent(requestId)}/answers`,
    { answers: Array.isArray(answers) ? answers : [] }
  );
};

const recommendationApi = {
  createRecommendationRequest,
  getRecommendationResult,
  submitRecommendationAnswers,
};

export default recommendationApi;
