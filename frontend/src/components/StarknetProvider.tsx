'use client'

import { StarknetConfig, publicProvider } from '@starknet-react/core'
import { sepolia } from '@starknet-react/chains'
import { InjectedConnector } from '@starknet-react/core'

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const chains = [sepolia]
  const providers = publicProvider()
  
  const connectors = [
    new InjectedConnector({ options: { id: 'argentX' } }),
    new InjectedConnector({ options: { id: 'braavos' } }),
  ]

  return (
    <StarknetConfig
      chains={chains}
      provider={providers}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  )
}