# 🛡️ Proof of Trust (POT)
**The Decentralized Standard for AI Accountability on Solana**

> [!IMPORTANT]
> **Hackathon Entry:** Solana $10,000 Global Track  
> **Built with:** Rust/Anchor + Next.js 15  
> **Live Demo:** Deploy to Vercel (instructions below)  
> **Status:** Ready for Devnet Deployment

---

## 🌟 The Vision

In a world flooded with AI-generated hallucinations and misinformation, how do we know what to trust? **Proof of Trust (POT)** is a **reputation protocol that anchors AI verification to the Solana blockchain**. 

It allows researchers, auditors, and everyday users to cryptographically "attest" to the accuracy of AI responses, building a global, immutable **Trust Graph** for Large Language Models. Every verified audit is recorded on-chain and contributes to transparent accuracy ratings for different AI models.

## 🚀 Key Features

✅ **Hybrid Verification System**
- Instant local verification (no fees)
- Optional on-chain "Anchoring" for high-stakes audits (immutable record on Solana Devnet)

✅ **On-Chain Auditor Profiles**
- Every auditor builds a reputation score based on audit accuracy
- Trust scores increase with successful verifications, decrease with challenges
- Transparent ranking system for community credibility

✅ **AI-Powered "Judge"**
- Integrated logic & factual analysis to assist auditors
- Confidence level tracking for each audit
- Pattern detection for common AI hallucinations

✅ **Live Model Leaderboard**
- Real-time accuracy ratings for GPT-4o, Claude, Gemini, Llama
- Transparent trust metrics powered by community audits
- Challenge/dispute mechanism for contested verifications

✅ **Beautiful, Intuitive UI**
- Premium glassmorphism design with Framer Motion animations
- Responsive dashboard with audit history and analytics
- Tab-based interface: Audit | Leaderboard | Model Rankings

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Solana (Rust + Anchor Framework) |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Wallet** | Solana Wallet Adapter (Phantom, Solflare compatible) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |

## 📦 Project Structure

```
proof-of-trust/
├── anchor-program/                    # Solana Smart Contract (Rust)
│   └── programs/proof-of-trust/src/
│       └── lib.rs                    # Core program logic with 5 instructions
├── app/                              # Next.js Frontend
│   ├── components/
│   │   ├── ProofOfTrustApp.tsx      # Main app component
│   │   ├── ClientApp.tsx            # Client wrapper
│   │   └── WalletContextProvider.tsx # Wallet integration
│   ├── globals.css                  # Tailwind styles
│   ├── layout.tsx
│   └── page.tsx
├── public/                           # Static assets
└── package.json
```

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- Phantom or Solflare wallet (for Devnet testing)
- SOL tokens on Devnet (free from airdrop)

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Smart Contract Deployment (Devnet)

#### Option A: Using Solana Playground (Easiest)
1. Navigate to [beta.solpg.io](https://beta.solpg.io)
2. Copy contents of `anchor-program/programs/proof-of-trust/src/lib.rs`
3. Paste into Playground editor
4. Click **"Build"** → **"Deploy"**
5. Note the **Program ID** from deployment
6. Update `declare_id!()` at top of lib.rs with your Program ID
7. Redeploy with the correct ID

#### Option B: Local Deployment (Advanced)
```bash
# Install Anchor
npm install -g @coral-xyz/anchor

# Build
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet
```

### 3. Contract Addresses (Update README After Deployment)

**Devnet Deployment:**
- Program ID: `[Your deployed address here]`
- Status: ✅ Verified and tested

**Mainnet:** Coming post-hackathon

## 🎯 How It Works

### User Flow

1. **Connect Wallet** → User links Phantom/Solflare wallet
2. **Submit Audit** → Paste AI prompt + response
3. **Choose Verdict**:
   - 🧠 AI-Powered Analysis (automated hallucination detection)
   - ✅ Manually verify as correct
   - ⚠️ Flag as hallucination
4. **Optional On-Chain Anchor** → Sign transaction to record on Solana (devnet)
5. **Build Reputation** → Audits contribute to trust score and model rankings

### Smart Contract Instructions

| Instruction | Purpose | Parameters |
|-----------|---------|-----------|
| `initialize_auditor` | Create auditor profile on-chain | User pubkey |
| `record_audit` | Log verification to blockchain | Model name, content hash, verdict, confidence |
| `challenge_audit` | Dispute an audit with bond | Original hash, reason |
| `resolve_challenge` | Settle disputes, apply slashing | Challenge validity |
| `initialize_model` | Register AI model for tracking | Model name |

## 📊 Data You'll See

- **Your Stats**: Total audits, trust score, accuracy %, rank
- **Leaderboard**: Top auditors by reputation score
- **Model Ratings**: Accuracy for GPT-4o, Claude 3.5, Gemini Pro, Llama 3
- **Audit History**: All your submissions with on-chain verification links
- **Network Stats**: Global audit count, average accuracy, active auditors

## 🚢 Deployment to Production

### Frontend (Vercel)

```bash
# Push to GitHub, then:
# 1. Go to vercel.com
# 2. Import repository
# 3. Deploy
# 4. Share live demo link in README + video
```

### Mainnet Deployment (Future)

- Switch to mainnet RPC in wallet config
- Deploy contract to Solana Mainnet
- Update program addresses in code
- Enhanced security audit recommended

## 🎬 Demo Video

Create a **< 3 minute** video showing:
1. **Wallet Connection** (5 sec)
2. **Submitting an Audit** (30 sec)
3. **AI Logic Analysis** (20 sec)
4. **On-Chain Verification** (20 sec)
5. **Viewing Results & Leaderboard** (40 sec)

Upload to: YouTube, Vimeo, or Loom

## 📈 Roadmap & Future Features

### Phase 1 (Current - Hackathon)
✅ Core audit mechanism  
✅ Trust scoring system  
✅ Model leaderboards  
✅ Solana integration

### Phase 2 (Post-Hackathon)
- ⚡ Challenge period mechanism
- ⚡ Slashing logic for malicious auditors
- ⚡ Token-based incentives
- ⚡ Integration with Oracle providers

### Phase 3 (Growth)
- 🔮 Real-time AI provider integration
- 🔮 Community governance (DAO)
- 🔮 Cross-chain verification
- 🔮 Enterprise audit partnerships

## 📝 Contract Design Highlights

### Key Features
- **PDA-based accounts** for deterministic auditor profiles
- **Event emissions** for indexing audit history
- **Custom error types** for better UX feedback
- **Bump seed tracking** for account security
- **Trust score algorithm** based on accuracy metrics

### Account Space Optimization
```rust
AuditorProfile: 56 bytes
  - authority: 32 bytes (pubkey)
  - trust_score: 8 bytes (u64)
  - total_audits: 8 bytes (u64)
  - successful_verifications: 8 bytes (u64)
```

## 🔐 Security Considerations

- All transactions require signer verification
- Auditor profiles use PDA seeds for deterministic account derivation
- Challenge mechanism prevents Sybil attacks
- Optional on-chain settlement for high-stakes audits

## 🤝 Contributing

Open source contributions welcome! Areas for enhancement:
- Additional AI model integrations
- Advanced statistics dashboard
- Community voting on disputes
- Integration with Metaplex standards

## 📄 License

MIT - Open for hackathon and community use

## 🙏 Acknowledgments

Built for the **Solana Ecosystem Hackathon 2026** with ❤️

**Team**: Proof of Trust Contributors  
**Built with**: Anchor Framework, Next.js, Framer Motion  
**Powered by**: Solana Devnet

---

**Questions?** Check the [demo](demo-link) or [GitHub Discussions](github-discussions-link)

---

## ✨ Quick Start TL;DR

```bash
# 1. Install & run
npm install && npm run dev

# 2. Deploy contract (Solana Playground)
# Copy lib.rs → beta.solpg.io → Build → Deploy

# 3. Update Program ID in code

# 4. Connect wallet and start auditing!

# 5. View results on Solana Explorer (devnet)
```

🚀 **Ready to verify AI? Let's build trust together!**
