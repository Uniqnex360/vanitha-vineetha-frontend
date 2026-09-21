"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchFastAPI, setToken } from "@/lib/fastapi";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(
    process.env.NEXT_PUBLIC_CHAIN_DEMO_EMAIL || "demo@pvr.local"
  );
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const data = await fetchFastAPI<{
        access_token?: string;
        token?: string;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = data.access_token || data.token;
      if (!token) {
        setError("No token returned from server");
        setLoading(false);
        return;
      }
      setToken(token);
      window.location.href = "/";
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: "420px", marginTop: "40px" }}>
      <div className="card" style={{ padding: "24px" }}>
        <h1 style={{ marginTop: 0 }}>{isRegister ? "Register" : "Login"}</h1>
        {error && <p className="error">{error}</p>}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Email
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          </div>

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ marginTop: "8px", padding: "10px", cursor: "pointer" }}
          >
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p style={{ fontSize: "13px", marginTop: "16px", textAlign: "center" }}>
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: "#f59e0b", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            {isRegister ? "Login here" : "Register here"}
          </button>
        </p>
      </div>
    </main>
  );
}
