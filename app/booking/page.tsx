"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchFastAPI,
  BackendUnreachableError,
  getToken,
} from "@/lib/fastapi";

interface Seat {
  id: string;
  code: string;
  number: number;
  price_cents: number;
  status: "AVAILABLE" | "BOOKED";
}

interface Row {
  label: string;
  price_cents: number;
  seats: Seat[];
}

interface SeatMapData {
  showtime_id: string;
  movie_title: string;
  screen_name: string;
  cinema_name: string;
  starts_at: string;
  rows: Row[];
}

interface HoldResponse {
  hold_id: string;
  expires_at: string;
  seats: { seat_id: string; code: string; price_cents: number }[];
  total: number;
  currency: string;
}

interface BookingResponse {
  id: string;
  ref_code: string;
}

function Loading({ message }: { message: string }) {
  return (
    <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
      <p className="muted">{message}</p>
    </main>
  );
}

function Unreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
      <h2>This cinema&apos;s system may be waking up</h2>
      <p className="muted">
        The server takes a moment to respond after being idle. Please try again.
      </p>
      <button className="btn" onClick={onRetry} style={{ marginTop: "16px" }}>
        Retry
      </button>
      <Link href="/" className="btn secondary" style={{ marginTop: "16px", marginLeft: "8px", display: "inline-block" }}>
        Back to Movies
      </Link>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<Loading message="Loading seat map..." />}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const searchParams = useSearchParams();
  const showId = searchParams.get("id");
  const [data, setData] = useState<SeatMapData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [error, setError] = useState("");
  const [unreachable, setUnreachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  const load = () => {
    if (!showId) return;
    setUnreachable(false);
    setError("");
    setData(null);
    fetchFastAPI<SeatMapData>(`/showtimes/${showId}/seats`)
      .then((d) => setData(d))
      .catch((err: unknown) => {
        if (err instanceof BackendUnreachableError) setUnreachable(true);
        else if (err instanceof Error) setError(err.message);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  useEffect(() => {
    if (!holdExpiry) return;
    const t = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((holdExpiry.getTime() - Date.now()) / 1000)
      );
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(t);
        setError("Hold expired. Please select seats again.");
        setHoldExpiry(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [holdExpiry]);

  if (unreachable) return <Unreachable onRetry={load} />;

  if (error && !data) {
    return (
      <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444" }}>{error}</h2>
        <Link className="btn" href="/" style={{ marginTop: "16px", display: "inline-block" }}>
          Back to Movies
        </Link>
      </main>
    );
  }

  if (!data) return <Loading message="Loading seat map..." />;

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") return;
    const exists = selectedSeats.some((s) => s.id === seat.id);
    if (exists) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 10) {
        alert("You can select a maximum of 10 seats per booking.");
        return;
      }
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price_cents / 100, 0);

  const handlePay = async () => {
    if (selectedSeats.length === 0 || !showId) return;
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const hold = await fetchFastAPI<HoldResponse>(`/holds`, {
        method: "POST",
        body: JSON.stringify({
          showtime_id: showId,
          seat_ids: selectedSeats.map((s) => s.id),
          idempotency_key: crypto.randomUUID(),
          end_user_ref: "web-user",
        }),
      });
      setHoldExpiry(new Date(hold.expires_at));

      const booking = await fetchFastAPI<BookingResponse>(
        `/holds/${hold.hold_id}/commit`,
        { method: "POST", body: JSON.stringify({}) }
      );

      router.push(`/confirmation?ref=${encodeURIComponent(booking.ref_code)}`);
    } catch (err: unknown) {
      if (err instanceof BackendUnreachableError) setUnreachable(true);
      else if (err instanceof Error) setError(err.message);
      setLoading(false);
    }
  };

  const tiers: { name: string; price: number; rows: Row[] }[] = [];
  data.rows.forEach((row) => {
    const price = row.price_cents / 100;
    let tierName = "CLASSIC";
    if (price >= 350) tierName = "RECLINER / VIP";
    else if (price >= 250) tierName = "PRIME PLUS";

    let existingTier = tiers.find((t) => t.price === price);
    if (!existingTier) {
      existingTier = { name: tierName, price, rows: [] };
      tiers.push(existingTier);
    }
    existingTier.rows.push(row);
  });

  return (
    <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 16px 120px 16px" }}>
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/"
          style={{ textDecoration: "none", color: "#f11d48", fontWeight: "bold", fontSize: "14px" }}
        >
          ← Back to Movies
        </Link>
      </div>

      <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "14px", marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "24px" }}>{data.movie_title}</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          {data.cinema_name} • {data.screen_name} |{" "}
          <b>
            {new Date(data.starts_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
          </b>
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {holdExpiry && countdown > 0 && (
        <div
          style={{
            backgroundColor: "#fef3c7",
            color: "#92400e",
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          Seats held for {Math.floor(countdown / 60)}:
          {(countdown % 60).toString().padStart(2, "0")}
        </div>
      )}

      <div style={{ overflowX: "auto", padding: "10px 0 30px 0" }}>
        <div
          style={{
            minWidth: "680px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div style={{ marginTop: "40px", width: "70%", textAlign: "center" }}>
            <div
              style={{
                height: "6px",
                width: "100%",
                background: "linear-gradient(to bottom, #93c5fd, #bfdbfe)",
                borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                boxShadow: "0 -2px 10px rgba(147, 197, 253, 0.5)",
                marginBottom: "8px",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                color: "#9ca3af",
                textTransform: "uppercase",
                fontWeight: "bold",
              }}
            >
              All eyes this way please (Screen)
            </span>
          </div>

          {tiers.map((tier) => (
            <div key={tier.price} style={{ width: "100%" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#9ca3af",
                  borderBottom: "1px solid #f3f4f6",
                  paddingBottom: "6px",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {tier.name} — ₹{tier.price.toFixed(2)}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {tier.rows.map((row) => {
                  const midIndex = Math.floor(row.seats.length / 2);
                  return (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ width: "24px", fontSize: "12px", fontWeight: "bold", color: "#9ca3af", textAlign: "center" }}>
                        {row.label}
                      </span>

                      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                        {row.seats.map((seat, index) => {
                          const isSelected = selectedSeats.some((s) => s.id === seat.id);
                          const isBooked = seat.status === "BOOKED";
                          const isAisle = index === midIndex;
                          return (
                            <div key={seat.id} style={{ display: "flex", alignItems: "center" }}>
                              {isAisle && <div style={{ width: "24px" }} />}
                              <button
                                type="button"
                                disabled={isBooked}
                                onClick={() => toggleSeat(seat)}
                                title={`${seat.code} • ₹${seat.price_cents / 100}`}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: isBooked ? "not-allowed" : "pointer",
                                  transition: "all 0.15s ease",
                                  border: isBooked
                                    ? "1px solid transparent"
                                    : isSelected
                                    ? "1px solid #16a34a"
                                    : "1px solid #10b981",
                                  backgroundColor: isBooked
                                    ? "#e5e7eb"
                                    : isSelected
                                    ? "#16a34a"
                                    : "#ffffff",
                                  color: isBooked ? "#9ca3af" : isSelected ? "#ffffff" : "#059669",
                                  boxShadow: isSelected ? "0 2px 4px rgba(22, 163, 74, 0.3)" : "none",
                                }}
                              >
                                {seat.number}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <span style={{ width: "24px", fontSize: "12px", fontWeight: "bold", color: "#9ca3af", textAlign: "center" }}>
                        {row.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "24px", fontSize: "12px", color: "#6b7280", marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", border: "1px solid #10b981", borderRadius: "4px", backgroundColor: "#fff" }} />
              <span>Available</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", backgroundColor: "#16a34a", borderRadius: "4px" }} />
              <span>Selected</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px" }} />
              <span>Sold</span>
            </div>
          </div>
        </div>
      </div>

      {selectedSeats.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            padding: "16px 24px",
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>
                Seats ({selectedSeats.length}):{" "}
                <b style={{ color: "#111827" }}>{selectedSeats.map((s) => s.code).join(", ")}</b>
              </div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#111827" }}>
                ₹{totalPrice.toFixed(2)}
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                backgroundColor: "#e11d48",
                color: "#ffffff",
                border: "none",
                fontWeight: "bold",
                fontSize: "15px",
                padding: "12px 28px",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(225, 29, 72, 0.3)",
              }}
            >
              {loading ? "Processing..." : `Pay ₹${totalPrice.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}