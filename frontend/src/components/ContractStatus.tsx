'use client'

import { useAccount, useNetwork } from '@starknet-react/core'
import { useRecoveryContract } from '../../lib/hooks/useRecoveryContract'
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react'

export function ContractStatus() {
  const { isConnected } = useAccount()
  const { chain } = useNetwork()
  const contract = useRecoveryContract()

  if (!isConnected) {
    return null
  }

  const isSepolia = chain?.name === 'Sepolia'
  const contractAddress = '0x07361b735adfdcf23ac4c540446daed5440f9d80d70713400cdc0fe0b57ebec4'

  return (
    <div className="fixed bottom-4 left-4 bg-neutral-900/80 backdrop-blur-sm border border-neutral-700 rounded-lg px-3 py-2 text-sm max-w-xs">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-neutral-400" />
          <span className="text-neutral-300 font-medium">Contract Status</span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            {isSepolia ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
            <span className="text-neutral-300">Network:</span>
            <span className={`font-medium ${isSepolia ? 'text-green-400' : 'text-yellow-400'}`}>
              {chain?.name || 'Unknown'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {contract ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
            <span className="text-neutral-300">Contract:</span>
            <span className={`font-medium ${contract ? 'text-green-400' : 'text-red-400'}`}>
              {contract ? 'Connected' : 'Not Found'}
            </span>
          </div>
          
          <div className="text-xs text-neutral-500 font-mono">
            {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
          </div>
        </div>
      </div>
    </div>
  )
} 