/**
 * Purpose: Upload game HTML + JSON metadata to NFT.storage (IPFS).
 * Called by: play/page.tsx, marketplace/page.tsx
 * Input: JSON { gameCode, title, engine, prompt, walletAddress }
 * Output: IPFS URLs + gameId — does not submit a Solana on-chain mint transaction
 * Auth: None
 */
import { NextRequest, NextResponse } from "next/server";

const NFT_STORAGE_KEY = process.env.NFT_STORAGE_API_KEY ?? "";

interface MintBody {
  gameCode: string;
  title: string;
  engine: string;
  prompt: string;
  walletAddress: string;
}

export async function POST(req: NextRequest) {
  let body: MintBody;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { gameCode, title, engine, prompt, walletAddress } = body;
  if (!gameCode || !walletAddress) {
    return NextResponse.json({ error: "gameCode and walletAddress required" }, { status: 400 });
  }

  if (!NFT_STORAGE_KEY) {
    return NextResponse.json({ error: "NFT_STORAGE_API_KEY not configured" }, { status: 503 });
  }

  try {
    // Upload game HTML to NFT.storage
    const htmlBlob = new Blob([gameCode], { type: "text/html" });
    const uploadRes = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NFT_STORAGE_KEY}`,
        "Content-Type": "text/html",
      },
      body: htmlBlob,
      signal: AbortSignal.timeout(30000),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`NFT.storage upload failed: ${uploadRes.status} ${errText}`);
    }

    const uploadData = await uploadRes.json() as { ok?: boolean; value?: { cid?: string } };
    const cid = uploadData.value?.cid;
    if (!cid) throw new Error("No CID returned from NFT.storage");

    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    const gameId = crypto.randomUUID().slice(0, 8).toUpperCase();

    // Build NFT metadata (Metaplex standard)
    const metadata = {
      name: title || `HOOS Game #${gameId}`,
      description: `AI-generated HTML5 game built by Hoos Gaming using 78 IBM watsonx Orchestrate agents. Prompt: "${prompt}". Engine: ${engine}.`,
      image: `https://ipfs.io/ipfs/${cid}`,
      animation_url: ipfsUrl,
      external_url: ipfsUrl,
      attributes: [
        { trait_type: "Engine", value: engine },
        { trait_type: "AI Agents", value: "78" },
        { trait_type: "Platform", value: "IBM watsonx Orchestrate" },
        { trait_type: "Creator", value: walletAddress.slice(0, 8) + "…" },
        { trait_type: "Game ID", value: gameId },
      ],
      properties: {
        files: [{ uri: ipfsUrl, type: "text/html" }],
        category: "html",
        creators: [{ address: walletAddress, share: 100 }],
      },
    };

    // Upload metadata JSON
    const metaRes = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NFT_STORAGE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(15000),
    });

    if (!metaRes.ok) throw new Error(`Metadata upload failed: ${metaRes.status}`);
    const metaData = await metaRes.json() as { value?: { cid?: string } };
    const metaCid = metaData.value?.cid;

    return NextResponse.json({
      ok: true,
      gameCid: cid,
      metaCid,
      ipfsUrl,
      metadataUrl: metaCid ? `https://ipfs.io/ipfs/${metaCid}` : null,
      gameId,
      metadata,
      network: "devnet",
      message: "Game uploaded to IPFS. Connect wallet on-chain to complete mint.",
    });

  } catch (e) {
    console.error("[mint] error:", e);
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
