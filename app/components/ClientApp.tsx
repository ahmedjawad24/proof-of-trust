"use client";

import WalletContextProvider from "./WalletContextProvider";
import ProofOfTrustApp from "./ProofOfTrustApp";

export default function ClientApp() {
  return (
    <WalletContextProvider>
      <ProofOfTrustApp />
    </WalletContextProvider>
  );
}
