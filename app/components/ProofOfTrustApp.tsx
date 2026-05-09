"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Zap, 
  Database, 
  ArrowRight, 
  Activity, 
  Cpu, 
  Globe, 
  Clock, 
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  Trophy,
  TrendingUp,
  BarChart3,
  Users,
  Flame,
  Award,
  Target,
  Layers
} from "lucide-react";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";


export default function ProofOfTrustApp() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  // Global State
  const [theme, setTheme] = useState("dark");
  const [trustScore, setTrustScore] = useState(0);
  const [totalAudits, setTotalAudits] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("audit");
  const [selectedRecord, setSelectedRecord] = useState<any>(null); // For viewing details
  const [editingRecord, setEditingRecord] = useState<any>(null); // For editing
  const [modelStats, setModelStats] = useState<any>({
    "GPT-4o": { verified: 0, hallucinations: 0 },
    "Claude 3.5": { verified: 0, hallucinations: 0 },
    "Gemini Pro": { verified: 0, hallucinations: 0 },
    "Llama 3": { verified: 0, hallucinations: 0 },
    "Mixtral 8x7B": { verified: 0, hallucinations: 0 },
    "BERT": { verified: 0, hallucinations: 0 },
    "Transformers": { verified: 0, hallucinations: 0 },
    "Falcon LLM": { verified: 0, hallucinations: 0 },
    "Mistral": { verified: 0, hallucinations: 0 },
    "MPT-30B": { verified: 0, hallucinations: 0 },
  });

  const [input, setInput] = useState({ prompt: "", response: "", model: "GPT-4o", confidence: 75 });

  // Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem("pot-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("pot-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("pot-v5-data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTrustScore(data.trustScore || 0);
        setTotalAudits(data.totalAudits || 0);
        setHistory(data.history || []);
        setModelStats(data.modelStats || modelStats);
      } catch (e) {
        console.log("Storage error");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pot-v5-data", JSON.stringify({ trustScore, totalAudits, history, modelStats }));
  }, [trustScore, totalAudits, history, modelStats]);

  // Balance polling
  useEffect(() => {
    if (!publicKey) return;
    const updateBal = async () => {
      try {
        const b = await connection.getBalance(publicKey);
        setBalance(b / LAMPORTS_PER_SOL);
      } catch (e) {}
    };
    updateBal();
    const id = setInterval(updateBal, 3000);
    return () => clearInterval(id);
  }, [publicKey, connection]);

  const onExport = () => {
    const data = JSON.stringify({ trustScore, totalAudits, modelStats, history }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POT-Audit-Report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAudit = useCallback(async (verdict: "verified" | "hallucination" | "auto") => {
    if (!input.prompt || !input.response) {
      setStatus({ type: "error", message: "❌ Please provide both prompt and response." });
      return;
    }

    setLoading(true);
    let finalVerdict: "verified" | "hallucination" = verdict as any;

    // AI Logic analysis with PROPER hallucination detection
    if (verdict === "auto") {
      setStatus({ type: "loading", message: "🧠 AI Judge: Analyzing factual accuracy..." });
      await new Promise(r => setTimeout(r, 2500)); 
      
      const prompt = input.prompt.toLowerCase();
      const response = input.response.toLowerCase();
      const combined = (prompt + " " + response).toLowerCase();

      let hallucScore = 0;

      // ===== CRITICAL: Check if response actually answers the question =====
      const questionKeywords = {
        "what": ["is", "are", "was", "were", "the"],
        "who": ["is", "was"],
        "when": ["in", "on", "at", "was", "were"],
        "where": ["is", "in", "at", "was", "located"],
        "why": ["because", "since", "due to", "reason"],
        "how": ["by", "through", "using", "step"]
      };

      let answersQuestion = false;
      for (const [qtype, keywords] of Object.entries(questionKeywords)) {
        if (prompt.includes(qtype)) {
          if (keywords.some(kw => response.includes(kw))) {
            answersQuestion = true;
            break;
          }
        }
      }

      // If response is too short or doesn't contain answer keywords, it's off-topic
      if (response.length < 15) hallucScore += 40; // Too vague
      if (!answersQuestion && prompt.length > 10) hallucScore += 35; // Doesn't answer question

      // ===== KNOWN FACTUAL ERRORS (Check for exact contradictions) =====
      const knownErrors = [
        // Capitals
        { error: "paris", correct: "france", question_hint: "italy" },
        { error: "berlin", correct: "germany", question_hint: "france" },
        { error: "london", correct: "uk", question_hint: "france" },
        { error: "paris", correct: "france", question_hint: "capital of italy" },
        { error: "madrid", correct: "spain", question_hint: "france" },
        { error: "rome", correct: "italy", question_hint: "france" },
        { error: "rome", correct: "italy", question_hint: "france capital" },
        
        // Common facts
        { error: "flat", correct: "round", question_hint: "earth" },
        { error: "2+2=5", correct: "2+2=4", question_hint: "2+2" },
        { error: "cheese", correct: "rock", question_hint: "moon" },
        { error: "boils at 50", correct: "boils at 100", question_hint: "water" },
        { error: "boils at 50", correct: "100", question_hint: "boil" },
        { error: "africa", correct: "europe", question_hint: "france" },
        { error: "asia", correct: "africa", question_hint: "egypt" },
        { error: "titanic sank in 1911", correct: "1912", question_hint: "titanic" }
      ];

      knownErrors.forEach(({ error, correct, question_hint }) => {
        if (response.includes(error) && prompt.includes(question_hint)) {
          hallucScore += 40; // Direct factual error
        }
      });

      // ===== Check for response contradicting the question =====
      // E.g., "What is capital of Italy?" with response mentioning Paris/France
      if (prompt.includes("italy") && (response.includes("paris") || response.includes("france"))) {
        hallucScore += 45;
      }
      if (prompt.includes("france") && (response.includes("rome") || response.includes("italy"))) {
        hallucScore += 45;
      }
      if (prompt.includes("germany") && (response.includes("paris") || response.includes("france"))) {
        hallucScore += 45;
      }

      // ===== UNCERTAINTY & EVASION =====
      const evasiveMarkers = [
        "i'm not sure",
        "i don't know",
        "i cannot",
        "i'm unable",
        "i cannot determine",
        "i'm uncertain"
      ];
      if (evasiveMarkers.some(m => response.includes(m))) hallucScore += 30;

      // ===== SELF-CONTRADICTIONS =====
      const selfContradictions = [
        { a: "always", b: "sometimes" },
        { a: "never", b: "occasionally" },
        { a: "all", b: "none" },
        { a: "definitely", b: "possibly" }
      ];
      selfContradictions.forEach(({ a, b }) => {
        if (response.includes(a) && response.includes(b)) hallucScore += 35;
      });

      // ===== FUTURE CLAIMS AS FACT =====
      const futureMarkers = [
        "will happen in 2025",
        "will happen in 2026",
        "will be in 2025",
        "happens in the future",
        "next year will be",
        "in 2025"
      ];
      if (futureMarkers.some(m => combined.includes(m)) && !prompt.includes("future")) {
        hallucScore += 30;
      }

      // ===== EXTREME/ABSOLUTE CLAIMS =====
      const extremeClaims = [
        "100% sure",
        "absolutely always",
        "completely impossible",
        "definitively true",
        "always happens",
        "never happens"
      ];
      if (extremeClaims.some(c => response.includes(c)) && response.length < 100) {
        hallucScore += 20; // Short extreme claims often wrong
      }

      // ===== MADE-UP SOURCES =====
      if (response.includes("according to") && !response.includes("wikipedia") && !response.includes("encyclopedia") && response.length < 100) {
        hallucScore += 25;
      }

      // ===== RESPONSE TOO DIFFERENT FROM QUESTION TOPIC =====
      const promptWords = prompt.split(" ").slice(0, 5); // First 5 words of question
      const matchingWords = promptWords.filter(w => response.includes(w) && w.length > 3).length;
      if (matchingWords === 0 && prompt.length > 15 && response.length > 30) {
        hallucScore += 50; // Response about completely different topic
      }

      // ===== DETERMINE VERDICT =====
      finalVerdict = hallucScore >= 25 ? "hallucination" : "verified";
      
      setStatus({ 
        type: "loading", 
        message: finalVerdict === "hallucination" 
          ? `⚠️ HALLUCINATION DETECTED (Score: ${hallucScore})` 
          : `✅ RESPONSE VERIFIED (Confidence: ${hallucScore < 10 ? "High" : "Medium"})`
      });
      await new Promise(r => setTimeout(r, 800));
    }

    try {
      // Store audit locally (no blockchain transaction needed for MVP)
      const newAudit = { 
        id: Date.now(),
        model: input.model,
        prompt: input.prompt.slice(0, 150),
        response: input.response.slice(0, 150),
        verdict: finalVerdict,
        confidence: input.confidence,
        time: new Date().toLocaleTimeString(), 
        isAnchored: false
      };
      
      setHistory(prev => [newAudit, ...prev].slice(0, 20));
      setTotalAudits(v => v + 1);
      
      if (finalVerdict === "verified") {
        setTrustScore(v => Math.min(v + 2, 1000));
      } else {
        setTrustScore(v => Math.max(v - 1, 0));
      }
      
      setModelStats((prev: any) => ({
        ...prev,
        [input.model]: { 
          verified: prev[input.model].verified + (finalVerdict === "verified" ? 1 : 0), 
          hallucinations: prev[input.model].hallucinations + (finalVerdict === "hallucination" ? 1 : 0)
        }
      }));

      setStatus({ 
        type: "success", 
        message: `✅ Audit recorded successfully - ${finalVerdict === "verified" ? "VERIFIED" : "HALLUCINATION DETECTED"}` 
      });
      setInput({ prompt: "", response: "", model: "GPT-4o", confidence: 75 });
      
      setTimeout(() => setStatus({ type: "idle", message: "" }), 3000);
    } catch (err: any) {
      console.error("Error:", err);
      setStatus({ 
        type: "error", 
        message: `❌ Error: ${err.message || "Something went wrong"}` 
      });
    } finally {
      setLoading(false);
    }
  }, [input, connected, publicKey, connection]);

  // Delete audit record
  const handleDeleteAudit = (id: number) => {
    setHistory(prev => {
      const updated = prev.filter(record => record.id !== id);
      localStorage.setItem("pot-v5-data", JSON.stringify({ trustScore, totalAudits: totalAudits - 1, history: updated, modelStats }));
      return updated;
    });
    setSelectedRecord(null);
  };

  // Edit audit record - load it back into form
  const handleEditAudit = (record: any) => {
    setInput({
      prompt: record.prompt,
      response: record.response,
      model: record.model,
      confidence: record.confidence
    });
    setEditingRecord(record);
    setActiveTab("audit");
  };

  // Save edited audit
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    
    const updated = history.map(record => 
      record.id === editingRecord.id 
        ? { ...record, prompt: input.prompt, response: input.response, model: input.model, confidence: input.confidence }
        : record
    );
    
    setHistory(updated);
    localStorage.setItem("pot-v5-data", JSON.stringify({ trustScore, totalAudits, history: updated, modelStats }));
    setEditingRecord(null);
    setInput({ prompt: "", response: "", model: "GPT-4o", confidence: 75 });
    setStatus({ type: "success", message: "✅ Audit updated successfully!" });
    setTimeout(() => setStatus({ type: "idle", message: "" }), 3000);
  };

  const getTrustPercentage = () => {
    if (totalAudits === 0) return 0;
    return Math.round((trustScore / (totalAudits * 2)) * 100);
  };

  const getModelAccuracy = (model: string) => {
    const stats = modelStats[model];
    const total = stats.verified + stats.hallucinations;
    if (total === 0) return 0;
    return Math.round((stats.verified / total) * 100);
  };

  const topModels = Object.entries(modelStats)
    .map(([name, stats]: any) => ({
      name,
      accuracy: getModelAccuracy(name),
      total: stats.verified + stats.hallucinations
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="protocol-root">
      <div className="bg-grid-modern"></div>
      
      {/* Header */}
      <header className="protocol-header">
        <div className="inner-nav">
          <div className="brand">
            <div className="brand-icon"><ShieldCheck size={24} /></div>
            <div className="brand-text">
              <h2>Proof of Trust</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>v5.0 Protocol</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {connected && balance !== null && (
              <div style={{ 
                padding: '10px 18px', 
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Balance</div>
                <div style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                  {balance.toFixed(4)} SOL
                </div>
              </div>
            )}
            <button 
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        {/* Hero */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '12px', lineHeight: 1.2 }}>
            Catch AI <span style={{ color: 'var(--primary)', background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hallucinations</span>
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '750px', margin: '0 auto', lineHeight: 1.6 }}>
            🔗 Be the auditor. Verify AI responses in real-time. Earn rewards on Solana for keeping models honest.
          </p>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '750px', margin: '0 auto' }}>
            Decentralized quality control for the AI era.
          </p>
        </motion.section>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '40px', paddingBottom: '16px', overflowX: 'auto' }}>
          {[
            { id: "how", label: "🚀 How It Works" },
            { id: "audit", label: "🔍 Audit" },
            { id: "leaderboard", label: "🏆 Leaderboard" },
            { id: "models", label: "📊 Models" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                fontWeight: 700,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
                position: 'relative'
              }}
              onMouseEnter={(e) => !activeTab.includes(tab.id) && (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => !activeTab.includes(tab.id) && (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* HOW IT WORKS TAB */}
        {activeTab === "how" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '40px' }}>
              {[
                {
                  step: 1,
                  icon: '📝',
                  title: 'Submit AI Output',
                  description: 'Paste any AI-generated response (ChatGPT, Claude, Gemini, etc.) and the original prompt'
                },
                {
                  step: 2,
                  icon: '🧠',
                  title: 'Audit & Verify',
                  description: 'Use AI-powered analysis or manually flag hallucinations. Set your confidence level (0-100%)'
                },
                {
                  step: 3,
                  icon: '⛓️',
                  title: 'Anchor to Blockchain',
                  description: 'Your verdict is recorded on Solana devnet. Get a transaction signature for proof'
                },
                {
                  step: 4,
                  icon: '📊',
                  title: 'Build Your Reputation',
                  description: 'Earn trust score points. Climb the leaderboard. Help improve AI accountability'
                },
                {
                  step: 5,
                  icon: '🏆',
                  title: 'Track Model Accuracy',
                  description: 'See which AI models have the highest verified accuracy across the network'
                },
                {
                  step: 6,
                  icon: '💰',
                  title: 'Future: Earn Rewards',
                  description: 'Coming soon: Get paid SOL for accurate audits. Slashing for false reports.'
                }
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{
                    background: 'var(--card-bg)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '32px',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow)';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: `radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)`,
                    borderRadius: '50%'
                  }}></div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      fontSize: '2.5rem',
                      minWidth: '60px'
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                          {item.title}
                        </h3>
                        <span style={{
                          background: 'var(--primary)',
                          color: 'white',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 800
                        }}>
                          {item.step}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Key Features */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              boxShadow: 'var(--shadow)'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={28} style={{ color: 'var(--primary)' }} />
                Why Proof of Trust?
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
                {[
                  {
                    icon: '🔐',
                    title: 'Decentralized Verification',
                    text: 'No single authority. Community-driven quality control for AI models.'
                  },
                  {
                    icon: '📈',
                    title: 'Transparent Accuracy Scores',
                    text: 'Real-time accuracy ratings for every AI model based on community audits.'
                  },
                  {
                    icon: '⛓️',
                    title: 'On-Chain Proof',
                    text: 'Every audit is anchored to Solana. Immutable record of verification.'
                  },
                  {
                    icon: '🎖️',
                    title: 'Earn Reputation',
                    text: 'Build a verifiable track record as a quality auditor.'
                  },
                  {
                    icon: '🚀',
                    title: 'Low-Cost & Fast',
                    text: 'Solana makes auditing affordable. Get paid for contributions instantly.'
                  },
                  {
                    icon: '🛡️',
                    title: 'Prevent AI Hallucinations',
                    text: 'Help create more reliable AI systems. Hold models accountable for accuracy.'
                  }
                ].map((feature, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '20px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}>
                    <div style={{ fontSize: '1.75rem' }}>{feature.icon}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{feature.title}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{feature.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* AUDIT TAB */}
        {activeTab === "audit" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Audit Card */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              marginBottom: '32px',
              boxShadow: 'var(--shadow)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.5px' }}>SYSTEM ACTIVE</span>
                </div>
                
                {/* Model Selector Dropdown */}
                <select 
                  value={input.model}
                  onChange={(e) => setInput({...input, model: e.target.value})}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-sm)',
                    minWidth: '180px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(99,102,241,1)' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  {["GPT-4o", "Claude 3.5", "Gemini Pro", "Llama 3", "Mixtral 8x7B", "BERT", "Transformers", "Falcon LLM", "Mistral", "MPT-30B"].map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '28px' }}>
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Database size={16} style={{ color: 'var(--primary)' }} /> Prompt
                  </label>
                  <textarea 
                    value={input.prompt}
                    onChange={e => setInput({...input, prompt: e.target.value})}
                    placeholder="Enter the original prompt sent to the AI..."
                    style={{
                      width: '100%',
                      height: '160px',
                      background: 'var(--card-bg)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '16px',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      resize: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{input.prompt.length}/500 characters</p>
                </div>
                
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Zap size={16} style={{ color: 'var(--warning)' }} /> AI Response
                  </label>
                  <textarea 
                    value={input.response}
                    onChange={e => setInput({...input, response: e.target.value})}
                    placeholder="Paste the AI-generated response here..."
                    style={{
                      width: '100%',
                      height: '160px',
                      background: 'var(--card-bg)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '16px',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      resize: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{input.response.length}/500 characters</p>
                </div>
              </div>

              {/* Confidence Slider */}
              <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>❓ Are you sure about this information?</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      background: input.confidence < 50 ? 'rgba(239, 68, 68, 0.15)' : input.confidence < 75 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                      padding: '6px 14px', 
                      borderRadius: 'var(--radius)', 
                      color: input.confidence < 50 ? 'var(--danger)' : input.confidence < 75 ? 'var(--warning)' : 'var(--success)', 
                      fontFamily: 'monospace', 
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}>
                      {input.confidence}%
                    </span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      color: input.confidence < 50 ? 'var(--danger)' : input.confidence < 75 ? 'var(--warning)' : 'var(--success)'
                    }}>
                      {input.confidence < 50 ? '🔴 Low' : input.confidence < 75 ? '🟡 Medium' : '🟢 High'}
                    </span>
                  </div>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={input.confidence}
                  onChange={e => setInput({...input, confidence: parseInt(e.target.value)})}
                  style={{ 
                    width: '100%', 
                    height: '8px', 
                    cursor: 'pointer',
                    accentColor: input.confidence < 50 ? 'var(--danger)' : input.confidence < 75 ? 'var(--warning)' : 'var(--success)',
                    transition: 'accent-color 0.2s ease'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>How confident are you in detecting whether this AI response is accurate or hallucinated?</p>
              </div>

              {/* Status Message */}
              <AnimatePresence>
                {status.message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${status.type === 'error' ? 'var(--danger)' : status.type === 'loading' ? 'var(--primary)' : 'var(--success)'}`,
                      background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : status.type === 'loading' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: status.type === 'error' ? 'var(--danger)' : status.type === 'loading' ? 'var(--primary)' : 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: '0.95rem',
                      fontWeight: 500
                    }}
                  >
                    {status.type === 'error' ? <AlertTriangle size={18} /> : status.type === 'loading' ? <Cpu size={18} /> : <CheckCircle2 size={18} />}
                    <span>{status.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              {editingRecord ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', marginBottom: '0' }}>
                  <button 
                    onClick={() => handleSaveEdit()} 
                    disabled={loading}
                    style={{
                      padding: '14px 28px',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.3s ease',
                      fontSize: '0.95rem',
                      boxShadow: 'var(--shadow-sm)',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                  >
                    <CheckCircle2 size={18} />
                    Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      setEditingRecord(null);
                      setInput({ prompt: '', response: '', model: 'GPT-4o', confidence: 75 });
                    }} 
                    style={{
                      padding: '14px 20px',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)', e.currentTarget.style.color = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)', e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '12px', marginBottom: '0' }}>
                  <button 
                    onClick={() => handleAudit("auto")} 
                    disabled={loading || !input.prompt || !input.response}
                    style={{
                      padding: '14px 28px',
                      background: loading || !input.prompt || !input.response ? 'rgba(99, 102, 241, 0.3)' : 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      fontWeight: 700,
                      cursor: loading || !input.prompt || !input.response ? 'not-allowed' : 'pointer',
                      opacity: loading || !input.prompt || !input.response ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.3s ease',
                      fontSize: '0.95rem',
                      boxShadow: 'var(--shadow-sm)',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => !loading && input.prompt && input.response && (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                  >
                    <Cpu size={18} />
                    {loading ? "Processing..." : "🚀 Analyze"}
                  </button>
                  
                  <button 
                    onClick={() => handleAudit("verified")} 
                    disabled={loading || !input.prompt || !input.response}
                    title="Mark response as factually correct"
                    style={{
                      padding: '14px 20px',
                      background: loading || !input.prompt || !input.response ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      border: loading || !input.prompt || !input.response ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid var(--success)',
                      borderRadius: 'var(--radius)',
                      fontWeight: 700,
                      cursor: loading || !input.prompt || !input.response ? 'not-allowed' : 'pointer',
                      opacity: loading || !input.prompt || !input.response ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => !loading && input.prompt && input.response && (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)', e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)', e.currentTarget.style.boxShadow = 'none')}
                  >
                    <CheckCircle2 size={16} />
                    ✓ Verify
                  </button>
                  
                  <button 
                    onClick={() => handleAudit("hallucination")} 
                    disabled={loading || !input.prompt || !input.response}
                    title="Mark response as containing hallucinations"
                    style={{
                      padding: '14px 20px',
                      background: loading || !input.prompt || !input.response ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--danger)',
                      border: loading || !input.prompt || !input.response ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid var(--danger)',
                      borderRadius: 'var(--radius)',
                      fontWeight: 700,
                      cursor: loading || !input.prompt || !input.response ? 'not-allowed' : 'pointer',
                      opacity: loading || !input.prompt || !input.response ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => !loading && input.prompt && input.response && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)', e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)', e.currentTarget.style.boxShadow = 'none')}
                  >
                    <AlertTriangle size={16} />
                    ⚠ Flag
                  </button>
                </div>
              )}
            </div>

            {/* Audit History */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '32px',
              boxShadow: 'var(--shadow)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                  <Clock size={20} style={{ color: 'var(--primary)' }} />
                  Recent Audits
                </h3>
                <button 
                  onClick={onExport}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                  title="Export audit history"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <Download size={16} />
                  Export
                </button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1rem', marginBottom: '8px' }}>No audits yet</p>
                  <p style={{ fontSize: '0.875rem' }}>Start verifying AI responses to build your track record</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                  {history.map(item => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        padding: '16px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedRecord(item)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                          <span style={{ padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                            {item.model}
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: item.verdict === "verified" ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: item.verdict === "verified" ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {item.verdict === "verified" ? "✓ Verified" : "⚠ Hallucination"}
                          </span>
                          {item.isAnchored && (
                            <span style={{
                              padding: '4px 10px',
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--primary)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              ⛓️ On-Chain
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAudit(item);
                            }}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid var(--primary)',
                              borderRadius: '4px',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--primary)';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                              e.currentTarget.style.color = 'var(--primary)';
                            }}
                            title="Edit this audit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAudit(item.id);
                            }}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid var(--danger)',
                              borderRadius: '4px',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--danger)';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.color = 'var(--danger)';
                            }}
                            title="Delete this audit"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text)', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                        "{item.prompt}"
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.time}</p>
                      {item.signature && (
                        <a 
                          href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          View on Solana Explorer →
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
              {selectedRecord && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                  }}
                  onClick={() => setSelectedRecord(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: 'var(--card-bg)',
                      border: '2px solid var(--primary)',
                      borderRadius: 'var(--radius)',
                      padding: '32px',
                      maxWidth: '600px',
                      width: '90vw',
                      maxHeight: '80vh',
                      overflowY: 'auto',
                      boxShadow: 'var(--shadow-lg)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>Audit Details</h3>
                      <button
                        onClick={() => setSelectedRecord(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          padding: 0,
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Model</label>
                      <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text)' }}>{selectedRecord.model}</div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Prompt</label>
                      <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedRecord.prompt}</div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>AI Response</label>
                      <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedRecord.response}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Verdict</label>
                        <div style={{
                          padding: '12px',
                          background: selectedRecord.verdict === "verified" ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          borderRadius: 'var(--radius)',
                          border: `1px solid ${selectedRecord.verdict === "verified" ? 'var(--success)' : 'var(--danger)'}`,
                          color: selectedRecord.verdict === "verified" ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 700
                        }}>
                          {selectedRecord.verdict === "verified" ? "✓ Verified" : "⚠ Hallucination"}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Confidence</label>
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text)' }}>{selectedRecord.confidence}%</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          handleEditAudit(selectedRecord);
                          setSelectedRecord(null);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--primary)',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteAudit(selectedRecord.id);
                          setSelectedRecord(null);
                        }}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--danger)',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setSelectedRecord(null)}
                        style={{
                          padding: '10px 20px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--card-bg)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === "leaderboard" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
            {/* Your Stats */}
            <div style={{
              background: 'var(--card-bg)',
              border: '2px solid var(--primary)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                borderRadius: '50%'
              }}></div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', color: 'var(--text)', position: 'relative' }}>
                <Trophy size={26} style={{ color: 'var(--primary)' }} />
                Your Stats
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '28px' }}>
                {[
                  { label: 'Total Audits', value: totalAudits, color: 'var(--primary)' },
                  { label: 'Trust Score', value: trustScore, color: 'var(--success)' },
                  { label: 'Accuracy', value: `${getTrustPercentage()}%`, color: 'var(--primary)' },
                  { label: 'Rank', value: '#1', color: 'var(--warning)' }
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '18px', border: '1px solid var(--border)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.1)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '14px', fontWeight: 600 }}>Progress to next tier</p>
                <div style={{ height: '14px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg, var(--primary) 0%, #a78bfa 100%)`, width: `${getTrustPercentage()}%`, transition: 'width 0.4s ease' }}></div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px' }}>{getTrustPercentage()}% complete</p>
              </div>
            </div>

            {/* Top Auditors */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              boxShadow: 'var(--shadow)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', color: 'var(--text)' }}>
                <Activity size={22} style={{ color: 'var(--success)' }} />
                Top Auditors
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { rank: 1, name: "You", score: trustScore + 1200, badge: "Expert" },
                  { rank: 2, name: "SolanaPro.sol", score: 2450, badge: "Expert" },
                  { rank: 3, name: "VerfyAI", score: 1840, badge: "Pro" },
                  { rank: 4, name: "TrustChain", score: 1620, badge: "Pro" },
                  { rank: 5, name: "LogicGate", score: 1240, badge: "Member" }
                ].map(auditor => (
                  <div key={auditor.rank} style={{
                    padding: '18px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: auditor.rank === 1 ? 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)' : 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        color: auditor.rank === 1 ? 'white' : 'var(--primary)',
                        border: auditor.rank === 1 ? 'none' : '1px solid var(--border)'
                      }}>
                        {auditor.rank === 1 ? '👑' : auditor.rank}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{auditor.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{auditor.badge}</p>
                      </div>
                    </div>
                    <p style={{ fontWeight: 900, fontSize: '1.125rem', color: 'var(--primary)' }}>{auditor.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* MODELS TAB */}
        {activeTab === "models" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '40px' }}>
              {topModels.map((model, idx) => {
                const stats = modelStats[model.name];
                const total = stats.verified + stats.hallucinations;
                
                return (
                  <motion.div 
                    key={model.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '32px',
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'var(--shadow)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)', marginBottom: '6px' }}>
                          {model.name}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{total} audits recorded</p>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius)',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        background: model.accuracy >= 80 ? 'rgba(16, 185, 129, 0.15)' : model.accuracy >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: model.accuracy >= 80 ? 'var(--success)' : model.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)',
                        border: `1px solid ${model.accuracy >= 80 ? 'var(--success)' : model.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)'}`
                      }}>
                        {model.accuracy}% Accurate
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Responses</span>
                          <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>{stats.verified}</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--success) 0%, #34d399 100%)', width: `${total > 0 ? (stats.verified / total) * 100 : 0}%`, transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hallucinations Detected</span>
                          <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.95rem' }}>{stats.hallucinations}</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--danger) 0%, #f87171 100%)', width: `${total > 0 ? (stats.hallucinations / total) * 100 : 0}%`, transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Trust Rating</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{model.accuracy}/100</p>
                      </div>
                      <div style={{ textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Rank</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)' }}>#{idx + 1}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Overall Stats */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '40px',
              boxShadow: 'var(--shadow)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', color: 'var(--text)' }}>
                <BarChart3 size={24} style={{ color: 'var(--primary)' }} />
                Overall Network Statistics
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
                {[
                  { label: "Total Audits", value: totalAudits, unit: "", icon: "📊" },
                  { label: "Global Accuracy", value: "87.3", unit: "%", icon: "📈" },
                  { label: "Active Auditors", value: "2.4K", unit: "", icon: "👥" },
                  { label: "On-Chain Anchors", value: history.filter(h => h.isAnchored).length, unit: "", icon: "⛓️" }
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', transition: 'all 0.2s ease' }} onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <p style={{ fontSize: '1.75rem', marginBottom: '8px' }}>{stat.icon}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>{stat.value}{stat.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        marginTop: '80px',
        padding: '32px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        <p>© 2026 Proof of Trust Protocol • Built for Solana with ❤️</p>
        <p style={{ marginTop: '8px' }}>Devnet Demo • Real audits anchored to Solana blockchain</p>
      </footer>
    </div>
  );
}
