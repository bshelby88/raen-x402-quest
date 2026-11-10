// x402 Dev Quest — serverless checker. Verifies answers against the LIVE fleet.
const PAYTO = "0x9b8a27e03ceba490953cda8ab1291c0e13baf72f";
const PAYTO_PADDED = "0x" + PAYTO.slice(2).toLowerCase().padStart(64, "0");
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const CHALLENGE_URL = "https://dispatch-x402.fly.dev/dispatch";

async function liveChallenge() {
  const r = await fetch(CHALLENGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "quest" }),
  });
  const hdr = r.headers.get("payment-required");
  if (!hdr) throw new Error("no challenge header");
  return JSON.parse(Buffer.from(hdr, "base64").toString("utf8"));
}

async function verifyTx(txHash) {
  const body = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt",
    params: [txHash.toLowerCase()],
  });
  const r = await fetch("https://mainnet.base.org", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  const j = await r.json();
  const rec = j.result;
  if (!rec || rec.status !== "0x1") return { ok: false, why: "tx not found or reverted" };
  const hit = (rec.logs || []).some(
    (lg) =>
      lg.address?.toLowerCase() === USDC &&
      (lg.topics || [])[0]?.startsWith("0xddf252ad") &&
      (lg.topics || [])[2]?.toLowerCase() === PAYTO_PADDED
  );
  return hit
    ? { ok: true }
    : { ok: false, why: "tx settled but no USDC transfer to the fleet wallet found" };
}

export default async function handler(req, res) {
  const url = new URL(req.url, "https://quest.raen");
  const level = url.searchParams.get("level");
  const a = (url.searchParams.get("a") || "").trim();
  const msg = (m) => res.status(200).json({ msg: m });

  try {
    if (level === "1") {
      if (!a) return msg("Submit the payTo address: /api/check?level=1&a=0x...");
      const ch = await liveChallenge();
      const payTo = ch.accepts?.[0]?.payTo || "";
      if (payTo.toLowerCase() === a.toLowerCase())
        return msg("✅ LEVEL 1 CLEARED — you decoded a live 402 challenge. Next: level 2 (the exact maxAmountRequired).");
      return msg(`❌ That's not the payTo in the live challenge. POST ${CHALLENGE_URL} and decode the payment-required header yourself.`);
    }
    if (level === "2") {
      const ch = await liveChallenge();
      const amt = ch.accepts?.[0]?.amount ?? ch.accepts?.[0]?.maxAmountRequired ?? "";
      if (a && amt && a === amt)
        return msg(`✅ LEVEL 2 CLEARED — you read the price (${amt} atomic units) before paying. Next: level 3 — settle it and submit the tx hash.`);
      return msg("❌ Wrong. Fetch the live challenge, decode the header, and read accepts[0].maxAmountRequired exactly.");
    }
    if (level === "3") {
      if (!/^0x[0-9a-fA-F]{64}$/.test(a)) return msg("❌ That's not a transaction hash (0x + 64 hex chars).");
      const v = await verifyTx(a);
      if (!v.ok) return msg("❌ " + v.why + " Settle the level-1 challenge for real, then submit its tx hash.");
      const code = "RAEN-QUEST-" + a.slice(2, 10).toUpperCase();
      return msg("🏆 ALL LEVELS CLEARED. Your claim code: " + code + " — redeem it at github.com/bshelby88/raen-bounties (open an issue with the code + your wallet) for a free RAEN MCP gateway dev key.");
    }
    return msg("Usage: /api/check?level=1|2|3&a=<answer>");
  } catch (e) {
    return msg("⚠ checker error: " + e.message + " (fleet may be busy — retry)");
  }
}
