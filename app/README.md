# Compart frontend

## Preview

```text
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. Without a configured campaign the interface is in
preview mode: commitments and host quotes are simulated locally and move no funds.

## Live devnet

Copy `.env.example` to `.env.local` and set `VITE_CAMPAIGN_ADDRESS` after the
campaign initialization transaction confirms. The UI then uses real wallet
transactions for:

- the equal public deposit and commitment;
- delegation to MagicBlock's official TEE validator;
- authenticated private-budget creation or update;
- supplier group quotes;
- participant refund claims;
- prototype booking receipts.

## Mainnet proof

Use `.env.mainnet.example` only after the verified program and campaign are live on
mainnet. The UI changes its network label and Explorer links automatically. Keep
the campaign demo-valued and describe receipts as prototypes unless real supplier
inventory has been integrated.
