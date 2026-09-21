"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchFastAPI, BackendUnreachableError } from "@/lib/fastapi";

interface Showtime {
  id: string;
  movie_title: string;
  language: string;
  certificate: string;
  duration_min: number;
  cinema_name: string;
  screen_name: string;
  starts_at: string;
  poster_url: string | null;
}

function Loading({ message }: { message: string }) {
  return (
    <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
      <p className="muted">{message}</p>
    </main>
  );
}

export default function MoviePage() {
  return (
    <Suspense fallback={<Loading message="Loading movie..." />}>
      <MovieContent />
    </Suspense>
  );
}

function MovieContent() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get("id");
  const [allShowtimes, setAllShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);

  const load = () => {
    setLoading(true);
    setUnreachable(false);
    fetchFastAPI<Showtime[]>("/showtimes")
      .then((d) => setAllShowtimes(d))
      .catch((err: unknown) => {
        if (err instanceof BackendUnreachableError) setUnreachable(true);
        else setUnreachable(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading message="Loading movie..." />;

  if (unreachable) {
    return (
      <main className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <h2>This cinema&apos;s system may be waking up</h2>
        <p className="muted">Please try again in a moment.</p>
        <button className="btn" onClick={load} style={{ marginTop: "16px" }}>
          Retry
        </button>
        <Link href="/" className="btn secondary" style={{ marginTop: "16px", marginLeft: "8px", display: "inline-block" }}>
          Back to Movies
        </Link>
      </main>
    );
  }

  const selectedShow = allShowtimes.find((s) => s.id === movieId);
  if (!selectedShow) {
    return (
      <main className="container" style={{ textAlign: "center", padding: "40px" }}>
        <h1>Movie not found</h1>
        <Link href="/" className="btn" style={{ marginTop: "16px", display: "inline-block" }}>
          ← Back to Movies
        </Link>
      </main>
    );
  }

  const movieShowtimes = allShowtimes.filter(
    (s) => s.movie_title === selectedShow.movie_title
  );

  const posterUrl =
    selectedShow.poster_url ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60";

  return (
    <main className="container">
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/"
          style={{ textDecoration: "none", color: "#f59e0b", fontWeight: "bold", fontSize: "14px" }}
        >
          ← Back to Movies
        </Link>
      </div>

      <div className="card">
        <img className="poster" src={posterUrl} alt={selectedShow.movie_title} />
        <div className="pad">
          <h1>{selectedShow.movie_title}</h1>
          <p>
            {selectedShow.language} · {selectedShow.certificate} · {selectedShow.duration_min} mins
          </p>
          <p style={{ color: "#666" }}>Playing at {selectedShow.cinema_name}</p>

          <h2 style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "16px" }}>
            Select a showtime
          </h2>
          <div className="shows">
            {movieShowtimes.map((s) => (
              <Link className="show" href={`/booking?id=${s.id}`} key={s.id}>
                <b>
                  {new Date(s.starts_at).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </b>
                <br />
                <span className="muted">{s.screen_name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}