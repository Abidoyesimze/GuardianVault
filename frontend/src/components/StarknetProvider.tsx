'use client'

import { StarknetConfig, argent, braavos, jsonRpcProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';

// Primary provider using your Alchemy RPC endpoint
const provider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd',
  }),
});

/* 
// Optional fallback providers - uncomment if you need retry logic in the future
const fallbackProvider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: 'https://free-rpc.nethermind.io/sepolia-juno',
  }),
});

const robustProvider = jsonRpcProvider({
  rpc: (_chain) => {
    // Primary: Use Alchemy
    const alchemyUrl = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd';
    
    // Fallbacks in case Alchemy fails
    const fallbackUrls = [
      'https://free-rpc.nethermind.io/sepolia-juno',
      'https://rpc.starknet-testnet.lava.build',
    ];
    
    return {
      nodeUrl: alchemyUrl,
      // Note: jsonRpcProvider doesn't support multiple URLs natively,
      // but you can implement retry logic in your hooks if needed
    };
  },
});
*/

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

export function StarknetProviderWithEnv({ children }: { children: React.ReactNode }) {
  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'FIQ1qwifmra7ZqdkVHnZ2lHQAKG8j4Yd';
  
  const envProvider = jsonRpcProvider({
    rpc: () => ({
      nodeUrl: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/${alchemyApiKey}`,
    }),
  });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={envProvider}
      connectors={[braavos(), argent()]}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}