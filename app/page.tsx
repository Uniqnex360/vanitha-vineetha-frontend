"use client";

import { useEffect, useState } from "react";
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
  poster_url: string | null;
  city: string | null;
}

interface MovieCard {
  id: string;
  title: string;
  language: string;
  certificate: string;
  durationMin: number;
  cinema: string;
  screen: string;
  description: string;
  posterUrl: string;
}

const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "PVR Cinemas";
const CHAIN_CINEMA_FALLBACK =
  process.env.NEXT_PUBLIC_CHAIN_CINEMA_FALLBACK || "PVR Lulu Mall, Kochi";
const AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_AGGREGATOR_URL ||
  "https://booking-app-frontend-navy.vercel.app";

export default function Home() {
  const [movies, setMovies] = useState<MovieCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const load = () => {
    setLoading(true);
    setUnreachable(false);
    setIsEmpty(false);

    fetchFastAPI<Showtime[]>("/showtimes")
      .then((showtimes) => {
        const map: Record<string, MovieCard> = {};
        for (const st of showtimes) {
          if (!map[st.movie_title]) {
            map[st.movie_title] = {
              id: st.id,
              title: st.movie_title,
              language: st.language,
              certificate: st.certificate,
              durationMin: st.duration_min,
              cinema: st.cinema_name,
              screen: st.screen_name,
              description: `Now Showing on ${st.screen_name} at ${st.cinema_name}.`,
              posterUrl:
                st.poster_url ||
                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
            };
          }
        }
        const list = Object.values(map);
        setMovies(list);
        setIsEmpty(list.length === 0);
      })
      .catch((err: unknown) => {
        if (err instanceof BackendUnreachableError) setUnreachable(true);
        else setUnreachable(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main className="container">
        <h1>Movies at {CHAIN_CINEMA_FALLBACK}</h1>
        <p className="muted">Loading showtimes...</p>
      </main>
    );
  }

  if (unreachable) {
    return (
      <main className="container">
        <h1>Movies at {CHAIN_CINEMA_FALLBACK}</h1>
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "14px",
            marginTop: "24px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{CHAIN_NAME} may be waking up</h2>
          <p className="muted">
            The server takes a moment to respond after being idle. Please try
            again in a moment.
          </p>
          <button className="btn" onClick={load} style={{ marginTop: "16px" }}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Movies at {movies[0]?.cinema || CHAIN_CINEMA_FALLBACK}</h1>
      <p className="muted">Select a movie below to book your tickets</p>

      {isEmpty ? (
        <div style={{ padding: "20px", color: "#666", textAlign: "center", marginTop: "24px" }}>
          No movies currently playing.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: "24px" }}>
          {movies.map((m) => (
            <article className="card" key={m.id}>
              <img
                className="poster"
                src={m.posterUrl}
                alt={m.title}
                style={{ height: "280px", objectFit: "cover" }}
              />
              <div className="pad">
                <h2>{m.title}</h2>
                <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
                  {m.language} · {m.certificate} · {m.durationMin} mins
                </p>
                <p style={{ minHeight: "50px", fontSize: "14px" }}>{m.description}</p>
                <Link
                  className="btn"
                  href={`/movie?id=${m.id}`}
                  style={{ display: "block", textAlign: "center", marginTop: "12px" }}
                >
                  Book Tickets
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer
        className="muted"
        style={{
          marginTop: "48px",
          paddingTop: "20px",
          borderTop: "1px solid #e5e7eb",
          fontSize: "13px",
          textAlign: "center",
        }}
      >
        Showtimes also on{" "}
        <a href={AGGREGATOR_URL} style={{ fontWeight: "bold" }}>
          Vyhbz
        </a>
      </footer>
    </main>
  );
} 