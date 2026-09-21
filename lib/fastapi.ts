"use client";

const API_URL =
  process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000/v1";

const TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_CHAIN_BACKEND_TIMEOUT_MS || 15000
);

export class BackendUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnreachableError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("chain_token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("chain_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("chain_token");
}

export async function fetchFastAPI<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let detail = `Backend error: ${response.status}`;
      try {
        const body = await response.json();
        detail = body.detail || body.error || detail;
      } catch {
        // not json
      }
      throw new Error(detail);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BackendUnreachableError(
        `Request timed out after ${TIMEOUT_MS / 1000}s`
      );
    }
    if (err instanceof TypeError) {
      throw new BackendUnreachableError("Backend unreachable");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
