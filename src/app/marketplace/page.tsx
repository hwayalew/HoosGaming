"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NFTGame {
  gameId: string;
  title: string;
  engine: string;
  creator: string;
  ipfsUrl: string;
  metadataUrl?: string;
  price?: number;
  ts: string;
}

const DEMO_GAMES: NFTGame[] = [
  { gameId: "A1B2C3D4", title: "Ashenveil Chronicles", engine: "PHASER 3 · 2D", creator: "8BgC9yew…3iVR", ipfsUrl: "#", price: 0, ts: "2026-03-22" },
  { gameId: "E5F6G7H8", title: "Neon Void Runner",     engine: "THREE.JS 3D",    creator: "7XkP2mNq…8WYz", ipfsUrl: "#", price: 0.001, ts: "2026-03-21" },
  { gameId: "I9J0K1L2", title: "Crystal Maze",         engine: "PYTHON / PYODIDE",creator: "3QrT5sUv…4VWx", ipfsUrl: "#", price: 0, ts: "2026-03-20" },
  { gameId: "M3N4O5P6", title: "Cyber Dungeon",        engine: "BABYLON.JS 3D",  creator: "6ZaB8cDe…9FGh", ipfsUrl: "#", price: 0.002, ts: "2026-03-19" },
];

export default function MarketplacePage() {
  const [games, setGames] = useState<NFTGame[]>(DEMO_GAMES);
  const [wallet, setWallet] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ ipfsUrl?: string; gameId?: string; error?: string } | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Load local minted games from sessionStorage
    try {
      const local = sessionStorage.getItem("hoos_minted_games");
      if (local) {
        const parsed = JSON.parse(local) as NFTGame[];
        setGames(prev => [...parsed, ...prev]);
      }
    } catch { /* ignore */ }
  }, []);

  const connectWallet = async () => {
    const phantom = (window as { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toBase58: () => string } }> } }).solana;
    if (!phantom?.isPhantom) {
      window.open("https://phantom.app/", "_blank");
      return;
    }
    try {
      const resp = await phantom.connect!();
      setWallet(resp.publicKey.toBase58());
    } catch { /* user rejected */ }
  };

  const mintCurrentGame = async () => {
    const code = sessionStorage.getItem("hoos_game_code");
    const prompt = sessionStorage.getItem("hoos_game_prompt") ?? "Generated Game";
    const engine = sessionStorage.getItem("hoos_game_engine") ?? "PHASER 3 · 2D";
    if (!code) { alert("Build a game first on /create, then mint it here."); return; }
    if (!wallet) { await connectWallet(); return; }

    setMinting(true); setMintResult(null);
    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameCode: code, title: prompt.slice(0, 40), engine, prompt, walletAddress: wallet }),
      });
      const data = await res.json() as { ok?: boolean; ipfsUrl?: string; gameId?: string; error?: string };
      if (data.ok) {
        setMintResult({ ipfsUrl: data.ipfsUrl, gameId: data.gameId });
        const newGame: NFTGame = {
          gameId: data.gameId ?? "NEW",
          title: prompt.slice(0, 40),
          engine,
          creator: wallet.slice(0, 8) + "…" + wallet.slice(-4),
          ipfsUrl: data.ipfsUrl ?? "#",
          price: 0,
          ts: new Date().toISOString().slice(0, 10),
        };
        setGames(prev => [newGame, ...prev]);
        try {
          const existing = JSON.parse(sessionStorage.getItem("hoos_minted_games") ?? "[]") as NFTGame[];
          sessionStorage.setItem("hoos_minted_games", JSON.stringify([newGame, ...existing]));
        } catch { /* ignore */ }
      } else {
        setMintResult({ error: data.error ?? "Mint failed" });
      }
    } catch (e) {
      setMintResult({ error: String(e) });
    }
    setMinting(false);
  };

  const filtered = filter === "all" ? games : games.filter(g => g.engine.toLowerCase().includes(filter));

  return (
    <div className="mkt-shell">
      <nav className="an-nav">
        <Link href="/" className="nav-logo">
          <div className="nl-icon">🎮</div>
          <div><div className="nl-name">HOOS GAMING</div></div>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {wallet ? (
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#10b981", padding: "6px 12px", border: "1px solid #10b981", borderRadius: 6 }}>
              ✓ {wallet.slice(0, 6)}…{wallet.slice(-4)}
            </span>
          ) : (
            <button onClick={connectWallet} className="btn-primary" style={{ padding: "8px 20px", fontSize: 12 }}>
              Connect Wallet
            </button>
          )}
          <Link href="/create" style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>Build Game</Link>
        </div>
      </nav>

      <main className="mkt-main">
        <div className="an-header">
          <div className="sh-pre">Solana Devnet · NFT.Storage IPFS</div>
          <h1 className="sh-h2" style={{ fontSize: 32 }}>Game Marketplace</h1>
          <p className="sh-p">Every game generated by Hoos AI is a unique on-chain artifact. Mint yours as a compressed NFT.</p>
        </div>

        {/* Mint panel */}
        <div className="mkt-mint-panel">
          <div className="mkt-mint-title">Mint Your Latest Game as NFT</div>
          <p style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", marginBottom: 16, lineHeight: 1.6 }}>
            Game code is uploaded to IPFS via NFT.Storage. The IPFS link is permanently stored on Solana Devnet.
            Mint cost: ~$0.001 in SOL (compressed NFT via Metaplex Bubblegum).
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {!wallet && (
              <button onClick={connectWallet} className="btn-primary">Connect Phantom Wallet</button>
            )}
            <button onClick={mintCurrentGame} disabled={minting} className="btn-primary" style={{ background: "#a855f7", borderColor: "#a855f7" }}>
              {minting ? "⏳ Uploading to IPFS…" : "🔮 Mint Current Game as NFT"}
            </button>
            <Link href="/create" className="btn-ghost">Build a Game First</Link>
          </div>

          {mintResult && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: mintResult.error ? "rgba(239,68,68,.1)" : "rgba(16,185,129,.1)", borderRadius: 8, border: `1px solid ${mintResult.error ? "#ef4444" : "#10b981"}44` }}>
              {mintResult.error ? (
                <span style={{ color: "#ef4444", fontFamily: "var(--mono)", fontSize: 11 }}>✗ {mintResult.error}</span>
              ) : (
                <div>
                  <div style={{ color: "#10b981", fontFamily: "var(--mono)", fontSize: 11, marginBottom: 6 }}>
                    ✓ Game minted! ID: {mintResult.gameId}
                  </div>
                  {mintResult.ipfsUrl && mintResult.ipfsUrl !== "#" && (
                    <a href={mintResult.ipfsUrl} target="_blank" rel="noreferrer"
                      style={{ color: "var(--c1)", fontFamily: "var(--mono)", fontSize: 10 }}>
                      View on IPFS →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="mkt-filter-bar">
          {[["all", "All Games"], ["phaser", "Phaser 3"], ["three", "Three.js"], ["babylon", "Babylon.js"], ["python", "Python"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} className={filter === val ? "mkt-filter-btn mkt-filter-btn-active" : "mkt-filter-btn"}>
              {label}
            </button>
          ))}
        </div>

        {/* Game grid */}
        <div className="mkt-grid">
          {filtered.map(game => (
            <div key={game.gameId} className="mkt-card">
              <div className="mkt-card-thumb" style={{ background: "linear-gradient(135deg, #1a1240 0%, #0a1a3b 100%)" }}>
                <span style={{ fontSize: 32 }}>🎮</span>
                <div className="mkt-card-id">#{game.gameId}</div>
              </div>
              <div className="mkt-card-body">
                <div className="mkt-card-title">{game.title}</div>
                <div className="mkt-card-engine">{game.engine}</div>
                <div className="mkt-card-creator">by {game.creator}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                  {game.ipfsUrl && game.ipfsUrl !== "#" ? (
                    <a href={game.ipfsUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }}>
                      ▶ Play Free
                    </a>
                  ) : (
                    <span className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", opacity: 0.5 }}>▶ Play Free</span>
                  )}
                  {game.price && game.price > 0 ? (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#a855f7" }}>◎ {game.price} SOL</span>
                  ) : (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#10b981" }}>Free</span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>Solana Devnet · {game.ts}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11 }}>
          Solana Devnet · Metaplex Bubblegum compressed NFTs · IPFS via NFT.Storage<br />
          Phantom wallet required · <a href="https://phantom.app" target="_blank" rel="noreferrer" style={{ color: "var(--c1)" }}>Install Phantom →</a>
        </div>
      </main>
    </div>
  );
}
