/**
 * Optional bearer-token guard for future PiperTrace scheduled handlers.
 * This helper is not required by the current browser-local analysis workflow.
 */
export async function authenticateCronRequest(request: Request): Promise<Response | null> {
  const currentSecret = process.env["PIPERTRACE_CRON_SECRET"];
  const previousSecret = process.env["PIPERTRACE_CRON_SECRET_PREVIOUS"];

  if (!currentSecret) return new Response("Server configuration error", { status: 500 });

  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  const provided = digest(token);
  const currentMatches = timingSafeEqual(provided, digest(currentSecret));
  const previousMatches = timingSafeEqual(provided, digest(previousSecret ?? currentSecret));

  return currentMatches || previousMatches ? null : new Response("Unauthorized", { status: 401 });
}
