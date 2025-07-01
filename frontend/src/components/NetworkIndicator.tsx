'use client'

import { useAccount, useNetwork } from '@starknet-react/core'

export function NetworkIndicator() {
  const { isConnected } = useAccount()
  const { chain } = useNetwork()

  if (!isConnected) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-neutral-300">Network:</span>
        <span className="text-white font-medium">
          {chain?.name || 'Unknown'}
        </span>
      </div>
    </div>
  )
} 