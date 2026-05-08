"use client";

import dynamic from "next/dynamic";

// Dynamic import the ENTIRE client app (wallet provider + app) to avoid SSR
// Wallet adapter requires browser APIs (window, localStorage, etc.)
const ClientApp = dynamic(() => import("./components/ClientApp"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0b0f",
        color: "#8b8fa8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        gap: "12px",
      }}
    >
      <span
        style={{
          width: "20px",
          height: "20px",
          border: "2px solid #2a2d3e",
          borderTopColor: "#7c5cfc",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
      Loading Proof of Trust…
    </div>
  ),
});

export default function Home() {
  return <ClientApp />;
}
