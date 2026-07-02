// =========================================================================
// 범용 POST SSE 스트림 클라이언트
// POST body가 필요한 SSE 엔드포인트 전용 (EventSource는 GET만 지원).
// 추천(/recommendations/requests/stream), 지원가능성(/eligibility/requests/stream) 등에 사용.
// =========================================================================

const parseSseEventBlock = (raw) => {
  const lines = raw.split("\n");
  const dataParts = [];

  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).replace(/^ /, ""));
    }
  }

  if (dataParts.length === 0) return null;

  try {
    return JSON.parse(dataParts.join("\n"));
  } catch {
    return null;
  }
};

/**
 * @param {object} options
 * @param {string}   options.url           - 경로 (baseUrl 제외). 예: "/api/v1/recommendations/requests/stream"
 * @param {object}   options.body          - 요청 body (JSON으로 직렬화)
 * @param {string}  [options.accessToken]  - Bearer 토큰
 * @param {AbortSignal} [options.signal]   - AbortController signal
 * @param {function} [options.onProgress]  - (event) => void  progress 이벤트 수신 시
 * @param {function} [options.onDone]      - (payload) => void done 이벤트 수신 시
 * @param {function} [options.onError]     - ({ code, message }) => void
 */
export async function postSseStream({ url, body, accessToken, signal, onProgress, onDone, onError }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const headers = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${baseUrl}${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") return;
    onError?.({
      code: "NETWORK_ERROR",
      message: "서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
    });
    return;
  }

  if (!response.ok || !response.body) {
    onError?.({
      code: `HTTP_${response.status}`,
      message:
        response.status === 401
          ? "로그인이 만료됐어요. 다시 로그인해주세요."
          : "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finished = false;

  const dispatch = (event) => {
    if (!event || typeof event !== "object") return;

    if (event.type === "progress") {
      onProgress?.(event);
    } else if (event.type === "done") {
      onDone?.(event.payload);
      finished = true;
    } else if (event.type === "error") {
      onError?.({
        code: event.code || "STREAM_ERROR",
        message: event.message || "오류가 발생했어요.",
      });
      finished = true;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatch(parseSseEventBlock(block));
        boundary = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (buffer.trim().length > 0) {
      dispatch(parseSseEventBlock(buffer));
    }

    if (!finished) {
      onError?.({
        code: "STREAM_INCOMPLETE",
        message: "응답이 끝까지 전달되지 않았어요. 다시 시도해주세요.",
      });
    }
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") return;
    onError?.({
      code: "STREAM_ERROR",
      message: "응답을 받는 중 문제가 생겼어요.",
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // reader가 이미 닫혔으면 무시
    }
  }
}
