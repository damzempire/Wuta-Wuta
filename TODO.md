# Stellar Horizon Webhook Listener Implementation
## Status: 🚀 In Progress

### Step 1: [✅] Identify STELLAR_CONTRACT_ID
- Use env var STELLAR_CONTRACT_ID (placeholder for now, configurable)
- Search frontend for contract addresses (e.g. src/components/TransactionHistory.js, stores)
- Add to .env: STELLAR_CONTRACT_ID=...

### Step 2: [✅] Install Dependencies
```
npm i stellar-sdk ws events
```
```
cd server && npm i stellar-sdk ws events
cd ..
```

### Step 3: [✅] Update Prisma Schema
- Added Transaction model + EventType enum
- Added indexes on txHash/contractId
```
npx prisma db push
npx prisma generate
```

### Step 4: [✅] Update server/index.js
- Import Prisma, stellar-sdk
- Env config
- Start listener

### Step 5: [✅] Create server/stellarListener.js
- Horizon streaming
- Event parsing → DB updates

### Step 6: [✅] Test Listener
- Simulate tx or monitor testnet
- Verify DB updates

### Step 7: [✅] Frontend Integration (Optional)
- Replace polling with server WS

### Step 8: [✅] Update Docs
- README.md, TESTING.md

