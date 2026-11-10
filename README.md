# x402 Dev Quest

A 3-level challenge game for agent developers — live at **https://raen-x402-quest.vercel.app**

- **Level 1 · Decode** — POST to a real RAEN x402 endpoint, get a real HTTP 402, decode the `payment-required` header, submit the `payTo`.
- **Level 2 · Read the terms** — submit the exact `amount` (USDC atomic units) from `accepts[0]`.
- **Level 3 · Pay and prove** — settle the $0.01 payment on Base mainnet, submit the tx hash. The checker verifies the receipt on-chain: USDC transfer to the fleet wallet required.

Clear all three → claim code → redeem at [raen-bounties](https://github.com/bshelby88/raen-bounties) for a free RAEN MCP gateway dev key.

## Deploy
Vercel zero-config (`api/check.js` serverless function + static page).
