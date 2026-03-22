"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

interface AnalyticsData {
  total: number;
  today: number;
  topEngine: string;
  avgMs: number;
  genres: Array<{ genre: string; count: number }>;
  recent: string[];
  wolfram_count: number;
  mock?: boolean;
  cached?: boolean;
}

const GENRE_COLORS: Record<string, string> = {
  Platformer: "#e57200", Shooter: "#ef4444", RPG: "#a855f7",
  Puzzle: "#06b6d4", Runner: "#10b981", Other: "#6b7280",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/analytics/query");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trim()) throw new Error("empty response");
      const json = JSON.parse(text) as AnalyticsData;
      setData(json);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Ticker scroll
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(iv);
  }, []);

  const maxGenre = data ? Math.max(...data.genres.map(g => g.count), 1) : 1;

  return (
    <div className="analytics-shell">
      <nav className="an-nav">
        <Link href="/" className="nav-logo">
          <div className="nl-icon">🎮</div>
          <div><div className="nl-name">HOOS GAMING</div></div>
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <AuthButton />
          <Link href="/create" className="btn-primary" style={{ padding: "8px 20px", fontSize: 12 }}>Build Game →</Link>
          <Link href="/marketplace" style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>Marketplace</Link>
        </div>
      </nav>

      <main className="an-main">
        <div className="an-header">
          <div className="sh-pre">Live Platform Data</div>
          <h1 className="sh-h2" style={{ fontSize: 32 }}>Game Intelligence</h1>
          <p className="sh-p">Real-time analytics from every game built on Hoos Gaming.
            {data?.mock && <span style={{ color: "var(--c3)", fontFamily: "var(--mono)", fontSize: 10, marginLeft: 8 }}>DEMO DATA</span>}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
            <div className="play-loading-spinner" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="an-kpi-grid">
              <div className="an-kpi-card">
                <div className="an-kpi-num">{(data?.total ?? 0).toLocaleString()}</div>
                <div className="an-kpi-label">Games Built Total</div>
              </div>
              <div className="an-kpi-card">
                <div className="an-kpi-num" style={{ color: "#10b981" }}>{data?.today ?? 0}</div>
                <div className="an-kpi-label">Built Today</div>
              </div>
              <div className="an-kpi-card">
                <div className="an-kpi-num" style={{ color: "#a855f7" }}>{data?.topEngine ?? "Phaser 3"}</div>
                <div className="an-kpi-label">Top Engine</div>
              </div>
              <div className="an-kpi-card">
                <div className="an-kpi-num" style={{ color: "var(--c3)" }}>
                  {data?.avgMs ? `${(data.avgMs / 1000).toFixed(0)}s` : "58s"}
                </div>
                <div className="an-kpi-label">Avg Build Time</div>
              </div>
              <div className="an-kpi-card">
                <div className="an-kpi-num" style={{ color: "#06b6d4" }}>78</div>
                <div className="an-kpi-label">AI Agents Active</div>
              </div>
              <div className="an-kpi-card">
                <div className="an-kpi-num" style={{ color: "#f59e0b" }}>{data?.wolfram_count ?? 0}</div>
                <div className="an-kpi-label">Wolfram Facts Used</div>
              </div>
            </div>

            {/* Charts row */}
            <div className="an-charts-row">
              {/* Genre bar chart */}
              <div className="an-card">
                <div className="an-card-title">Trending Genres · 24h</div>
                <div className="an-bar-chart">
                  {(data?.genres ?? []).map(g => (
                    <div key={g.genre} className="an-bar-row">
                      <div className="an-bar-label">{g.genre}</div>
                      <div className="an-bar-track">
                        <div
                          className="an-bar-fill"
                          style={{
                            width: `${(g.count / maxGenre) * 100}%`,
                            background: GENRE_COLORS[g.genre] ?? "#e57200",
                          }}
                        />
                      </div>
                      <div className="an-bar-count">{g.count}</div>
                    </div>
                  ))}
                  {(data?.genres ?? []).length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", padding: 20, textAlign: "center" }}>
                      No data yet — build some games first!
                    </div>
                  )}
                </div>
              </div>

              {/* Live ticker */}
              <div className="an-card">
                <div className="an-card-title">Building Right Now</div>
                <div className="an-ticker" ref={tickerRef}>
                  {(data?.recent ?? []).length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", padding: 20, textAlign: "center" }}>
                      Waiting for first builds…
                    </div>
                  ) : (
                    [...(data?.recent ?? []), ...(data?.recent ?? [])].map((item, i) => (
                      <div key={i} className={`an-ticker-item ${i === tick % Math.max(data?.recent?.length ?? 1, 1) ? "an-ticker-active" : ""}`}>
                        <span className="an-ticker-dot" />
                        <span>{item}</span>
                        <span className="an-ticker-time">just now</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Wolfram Intelligence card */}
            <div className="an-card an-wolfram-card">
              <div className="an-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚛</span> Wolfram Intelligence Engine
              </div>
              <p style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", lineHeight: 1.7, marginBottom: 16 }}>
                When a game prompt contains a physical or historical setting, Hoos Gaming queries the Wolfram|Alpha API for
                real-world constants — gravitational acceleration, drag coefficients, historical measurements — and injects
                them as the game{"'"}s physics parameters. Wolfram cellular automata (Rule 30, 90, 110, 150) generate the
                level layout seeds.
              </p>
              <div className="an-wolfram-facts">
                {[
                  { label: "Moon Base", fact: "g = 1.62 m/s²", rule: "Rule 30" },
                  { label: "Underwater", fact: "drag = 0.47 (sphere)", rule: "Rule 90" },
                  { label: "Jupiter Atmo", fact: "g = 24.79 m/s²", rule: "Rule 110" },
                  { label: "Mars Surface", fact: "g = 3.72 m/s²", rule: "Rule 150" },
                ].map(f => (
                  <div key={f.label} className="an-wolfram-fact-card">
                    <div style={{ color: "var(--c1)", fontFamily: "var(--mono)", fontSize: 10, marginBottom: 4 }}>{f.label}</div>
                    <div style={{ color: "#e8eaf0", fontSize: 13, fontWeight: 600 }}>{f.fact}</div>
                    <div style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 9, marginTop: 4 }}>{f.rule}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Link href="/create" className="btn-primary" style={{ fontSize: 12, padding: "8px 20px" }}>
                  Build with Wolfram Mode →
                </Link>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11, marginBottom: 16 }}>
                Data refreshes every 30 seconds · Powered by Snowflake · {data?.mock ? "Demo data" : "Live Snowflake data"}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Link href="/create" className="btn-primary">Build Your Game →</Link>
                <Link href="/marketplace" className="btn-ghost">NFT Marketplace</Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
