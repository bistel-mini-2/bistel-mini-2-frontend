// =========================================================================
// 채팅 메시지 SSE 스트림 클라이언트
// 백엔드 POST /api/v1/chat/sessions/{id}/messages/stream 를 호출하고,
// 토큰 단위 응답을 콜백으로 흘려보낸다.
// axios는 브라우저에서 ReadableStream을 안 노출해서 fetch로 직접 처리.
// =========================================================================

const streamPath = (sessionId) =>
  `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages/stream`;

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

const dispatchEvent = (event, { onToken, onDone, onError }) => {
  if (!event || typeof event !== "object") return false;

  if (event.type === "token") {
    onToken?.(typeof event.delta === "string" ? event.delta : "");
    return false;
  }

  if (event.type === "done") {
    onDone?.(event.payload);
    return true;
  }

  if (event.type === "error") {
    onError?.({
      code: event.code || "STREAM_ERROR",
      message: event.message || "응답을 받는 중 문제가 생겼어요.",
    });
    return true;
  }

  return false;
};

export async function sendMessageStream({
  sessionId,
  content,
  accessToken,
  signal,
  onToken,
  onDone,
  onError,
}) {
  if (!sessionId) {
    onError?.({
      code: "SESSION_ID_REQUIRED",
      message: "세션 정보가 없어서 메시지를 보낼 수 없어요.",
    });
    return;
  }

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
    response = await fetch(`${baseUrl}${streamPath(sessionId)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
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
          : "메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finished = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseEventBlock(block);
        const isTerminal = dispatchEvent(event, { onToken, onDone, onError });
        if (isTerminal) finished = true;
        boundary = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (buffer.trim().length > 0) {
      const event = parseSseEventBlock(buffer);
      const isTerminal = dispatchEvent(event, { onToken, onDone, onError });
      if (isTerminal) finished = true;
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
