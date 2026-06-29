import http from "node:http";

const HEALTH_CHECK_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 10000;

export async function healthCheck(port: number, timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await checkHealthOnce(port);
    if (ok) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  return false;
}

function checkHealthOnce(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(
      `http://127.0.0.1:${port}/health`,
      { timeout: HEALTH_CHECK_INTERVAL_MS },
      (response) => {
        resolve(response.statusCode === 200);
        response.resume();
      },
    );
    request.on("error", () => {
      resolve(false);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}
