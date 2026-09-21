"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFastAPI, getToken, clearToken } from "@/lib/fastapi";

const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "PVR Cinemas";
const CHAIN_THEME_COLOR =
  process.env.NEXT_PUBLIC_CHAIN_THEME_COLOR || "#e50914";

interface Me {
  id: string;
  email: string;
  full_name?: string;
}

export default function Nav() {
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    fetchFastAPI<Me>("/auth/me")
      .then((d) => setUser(d))
      .catch(() => setUser(null));
  }, []);

  function logout() {
    clearToken();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <nav
      className="nav"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        backgroundColor: CHAIN_THEME_COLOR,
      }}
    >
      <Link
        className="brand"
        href="/"
        style={{ fontWeight: "bold", fontSize: "18px" }}
      >
        {CHAIN_NAME}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {user ? (
          <>
            <Link
              href="/my-bookings"
              style={{ textDecoration: "none", color: "inherit", fontWeight: "bold" }}
            >
              My Bookings
            </Link>
            <span>
              <b>{user.full_name || user.email}</b>{" "}
              <button
                onClick={logout}
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  color: "inherit",
                  opacity: 0.85,
                }}
              >
                Logout
              </button>
            </span>
          </>
        ) : (
          <Link href="/login" style={{ fontWeight: "bold" }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
