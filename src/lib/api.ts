/** Browser-side JSON client for the app's own API. Errors carry a message that is safe to show. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; raw?: string; keepalive?: boolean } = {}): Promise<T> {
  const hasBody = init.body !== undefined || init.raw !== undefined;
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      credentials: "same-origin",
      cache: "no-store",
      keepalive: init.keepalive,
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  const data = (await res.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
  if (!res.ok) {
    // Session ended: reload into the sign-in page so no stale data stays on screen.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401 && !path.startsWith("/api/auth/")) window.location.assign("/login");
    throw new ApiError(res.status, data?.error?.message ?? "Đã có lỗi xảy ra. Vui lòng thử lại.", data?.error?.code);
  }
  return data as T;
}

export const errorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
