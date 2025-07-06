'use client'

import { StarknetConfig, argent, braavos, jsonRpcProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';

// For version 2.8.3, use jsonRpcProvider instead of publicProvider
const provider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
  }),
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={provider}
      connectors={[braavos(), argent()]}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}