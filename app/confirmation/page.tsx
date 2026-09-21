"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchFastAPI, BackendUnreachableError } from "@/lib/fastapi";

interface Ticket {
  ref_code: string;
  status: string;
  movie_title: string;
  screen_name: string;
  cinema_name: string;
  starts_at: string;
  created_at: string;
  seats: { seat_id: string; code: string; price_cents: number }[];
  total_price_cents: number;
}

function Loading({ message }: { message: string }) {
  return (
    <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
      <p className="muted">{message}</p>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<Loading message="Loading ticket..." />}>
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ref) {
      setNotFound(true);
      return;
    }
    setUnreachable(false);
    setNotFound(false);
    fetchFastAPI<Ticket>(`/tickets/${encodeURIComponent(ref)}`)
      .then((d) => setTicket(d))
      .catch((err: unknown) => {
        if (err instanceof BackendUnreachableError) setUnreachable(true);
        else setNotFound(true);
      });
  }, [ref]);

  if (unreachable) {
    return (
      <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <h2>This cinema&apos;s system may be waking up</h2>
        <p className="muted">Please try again in a moment.</p>
        <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: "16px" }}>
          Retry
        </button>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="container">
        <h1>Booking not found</h1>
        <p className="muted">Could not find reference: {ref}</p>
        <Link className="btn" href="/">Return to Home</Link>
      </main>
    );
  }

  if (!ticket) return <Loading message="Loading ticket..." />;

  const isCancelled = ticket.status === "CANCELLED";

  return (
    <main className="container">
      <div
        className={isCancelled ? "card" : "success"}
        style={{ padding: "24px", border: isCancelled ? "1px solid #ef4444" : undefined }}
      >
        {isCancelled ? (
          <>
            <div style={{ display: "inline-block", backgroundColor: "#fee2e2", color: "#dc2626", fontWeight: "bold", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
              CANCELLED
            </div>
            <h1 style={{ color: "#ef4444", margin: "0 0 12px 0" }}>Booking Cancelled</h1>
            <p>Ticket Ref: <b>{ticket.ref_code}</b></p>
            <p>Movie: <b>{ticket.movie_title}</b></p>
            <p style={{ color: "#666" }}>{ticket.cinema_name} • {ticket.screen_name}</p>
            <p style={{ color: "#666" }}>
              Showtime: {new Date(ticket.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
            <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", margin: "16px 0", fontSize: "14px" }}>
              This booking was cancelled. The seats have been released back to the cinema floor.
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "inline-block", backgroundColor: "#dcfce7", color: "#16a34a", fontWeight: "bold", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
              CONFIRMED
            </div>
            <h1 style={{ margin: "0 0 12px 0" }}>Booking Confirmed</h1>
            <p>Ticket Ref: <b>{ticket.ref_code}</b></p>
            <p>Movie: <b>{ticket.movie_title}</b></p>
            <p>Showtime: {new Date(ticket.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            <p>{ticket.cinema_name} • {ticket.screen_name}</p>
            <p>Seats: <b>{ticket.seats.map((s) => s.code).join(", ")}</b></p>
            <p>Amount paid: <b>₹{(ticket.total_price_cents / 100).toFixed(2)}</b></p>
          </>
        )}

        <Link className="btn" href="/" style={{ marginTop: "16px", display: "inline-block" }}>
          Book another movie
        </Link>
      </div>
    </main>
  );
}