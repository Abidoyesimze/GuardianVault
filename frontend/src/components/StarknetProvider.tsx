'use client'

import { StarknetConfig, argent, braavos, publicProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={[braavos(), argent()]}
      
    >
      {children}
    </StarknetConfig>
  );
}