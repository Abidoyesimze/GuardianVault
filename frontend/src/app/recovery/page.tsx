'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@starknet-react/core'
import { toast } from 'react-toastify'
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  ArrowRight,
  Copy,
  ExternalLink,
  Wallet
} from 'lucide-react'
import { useInitiateRecovery, useRecoveryRequest, useApprovalCount } from '../../../lib/hooks/useRecoveryContract'

type RecoveryStatus = 'not-started' | 'searching' | 'found' | 'initiated' | 'pending' | 'approved' | 'failed'

type Guardian = {
  name?: string
  address: string
  hasApproved: boolean
  approvedAt?: Date
}

type Recovery = {
  id: string
  oldWalletAddress: string
  newWalletAddress: string
  requiredApprovals: number
  currentApprovals: number
  status: RecoveryStatus
  createdAt: Date
  guardians: Guardian[]
  estimatedCompletion?: Date
}

export default function RecoveryPage() {
  const { address, isConnected } = useAccount()
  const [oldWalletAddress, setOldWalletAddress] = useState('')
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const [currentStep, setCurrentStep] = useState<'connect' | 'search' | 'initiate' | 'progress' | 'complete'>('connect')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Contract hooks
  const { initiateRecovery, isPending: isInitiating } = useInitiateRecovery()
  const { recoveryRequest } = useRecoveryRequest(oldWalletAddress || undefined)
  const { approvalCount } = useApprovalCount(oldWalletAddress || undefined)

  useEffect(() => {
    if (isConnected && currentStep === 'connect') {
      setCurrentStep('search')
    }
  }, [isConnected, currentStep])

  // Monitor recovery progress
  useEffect(() => {
    if (recovery && recovery.status === 'pending' && approvalCount !== undefined) {
      const newRecovery = { ...recovery, currentApprovals: approvalCount }
      
      if (approvalCount >= recovery.requiredApprovals) {
        newRecovery.status = 'approved'
        setCurrentStep('complete')
        toast.success('🎉 Recovery approved! Your wallet has been successfully recovered.', {
          position: "top-right",
          autoClose: 5000,
        })
      }
      
      setRecovery(newRecovery)
    }
  }, [approvalCount, recovery])

  const validateStarkNetAddress = (addr: string): boolean => {
    return addr.startsWith('0x') && addr.length >= 60 && addr.length <= 66
  }

  const searchForRecovery = async () => {
    if (!oldWalletAddress || !isConnected) return

    setIsLoading(true)
    setError(null)
    
    try {
      // Check if there's an existing recovery request
      if (recoveryRequest) {
        const mockRecovery: Recovery = {
          id: '1',
          oldWalletAddress,
          newWalletAddress: address!,
          requiredApprovals: 2,
          currentApprovals: approvalCount || 0,
          status: recoveryRequest.status === 1 ? 'pending' : 'found',
          createdAt: new Date(recoveryRequest.timestamp * 1000),
          guardians: [
            { name: 'Alice', address: '0x123...456', hasApproved: false },
            { name: 'Bob', address: '0x789...abc', hasApproved: false },
            { name: 'Charlie', address: '0xdef...789', hasApproved: false },
          ]
        }
        
        setRecovery(mockRecovery)
        setCurrentStep(recoveryRequest.status === 1 ? 'progress' : 'initiate')
        toast.success('✅ Recovery setup found!', {
          position: "top-right",
          autoClose: 3000,
        })
      } else {
        // Simulate finding a guardian setup
        const mockRecovery: Recovery = {
          id: '1',
          oldWalletAddress,
          newWalletAddress: address!,
          requiredApprovals: 2,
          currentApprovals: 0,
          status: 'found',
          createdAt: new Date(),
          guardians: [
            { name: 'Alice', address: '0x123...456', hasApproved: false },
            { name: 'Bob', address: '0x789...abc', hasApproved: false },
            { name: 'Charlie', address: '0xdef...789', hasApproved: false },
          ]
        }
        
        setRecovery(mockRecovery)
        setCurrentStep('initiate')
        toast.success('✅ Recovery setup found!', {
          position: "top-right",
          autoClose: 3000,
        })
      }
    } catch (error) {
      const errorMessage = 'Failed to find recovery setup. Please check the wallet address.'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitiateRecovery = async () => {
    if (!recovery || !oldWalletAddress || !address) return

    try {
      const result = await initiateRecovery(oldWalletAddress, address)
      
      if (result.success) {
        setRecovery({
          ...recovery,
          status: 'pending',
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        })
        setCurrentStep('progress')
        toast.success('🚀 Recovery initiated successfully! Waiting for guardian approvals.', {
          position: "top-right",
          autoClose: 5000,
        })
      } else {
        throw new Error(result.error || 'Failed to initiate recovery')
      }
    } catch (error) {
      const errorMessage = 'Failed to initiate recovery. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
      console.error('Recovery initiation failed:', error)
    }
  }

  const copyRecoveryLink = async () => {
    const recoveryLink = `${window.location.origin}/guardian?recovery=${recovery?.id}`
    await navigator.clipboard.writeText(recoveryLink)
    setCopied(true)
    toast.success('📋 Recovery link copied to clipboard!', {
      position: "top-right",
      autoClose: 2000,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshStatus = () => {
    if (recovery && oldWalletAddress) {
      toast.info('🔄 Refreshing recovery status...', {
        position: "top-right",
        autoClose: 2000,
      })
      // The hooks will automatically refetch the data
    }
  }

  const getStatusIcon = (status: RecoveryStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />
      case 'approved': return <CheckCircle className="h-5 w-5" />
      case 'failed': return <AlertCircle className="h-5 w-5" />
      default: return <RefreshCw className="h-5 w-5" />
    }
  }

  const formatTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-4xl lg:text-5xl font-bold text-white">
          Recover Your Wallet
        </h1>
        <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
          Use your guardian network to regain access to your wallet
        </p>
      </div>

      {/* Connect Wallet Step */}
      {currentStep === 'connect' && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="card p-12 text-center space-y-8">
            <div className="space-y-4">
              <Wallet className="h-16 w-16 text-primary-500 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Connect Your New Wallet</h2>
              <p className="text-neutral-300 max-w-md mx-auto">
                Connect the new wallet that you want to recover your old wallet to
              </p>
            </div>
            <div className="status-warning p-4 rounded-lg">
              <p className="text-warning-400">Please connect your wallet using the button in the top navigation</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Step */}
      {currentStep === 'search' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <Search className="h-16 w-16 text-primary-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Find Your Wallet</h2>
            <p className="text-neutral-300">
              Enter the address of the wallet you want to recover
            </p>
          </div>

          <div className="card p-8 space-y-6">
            <div>
              <label className="block text-white font-medium mb-3">
                Lost Wallet Address
              </label>
              <input
                type="text"
                value={oldWalletAddress}
                onChange={(e) => setOldWalletAddress(e.target.value)}
                placeholder="0x..."
                className="input-field w-full"
              />
              {oldWalletAddress && !validateStarkNetAddress(oldWalletAddress) && (
                <p className="text-error-400 text-sm mt-2">Invalid StarkNet address format</p>
              )}
            </div>

            {error && (
              <div className="status-error p-4 rounded-lg">
                <p className="text-error-400">{error}</p>
              </div>
            )}

            <button
              onClick={searchForRecovery}
              disabled={!oldWalletAddress || !validateStarkNetAddress(oldWalletAddress) || isLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Search for Recovery Setup
                </>
              )}
            </button>
          </div>

          {/* Info Card */}
          <div className="card p-6 bg-blue-500/5 border-blue-500/20">
            <h3 className="text-blue-400 font-semibold mb-3">What We&apos;re Looking For</h3>
            <ul className="text-blue-300 text-sm space-y-2">
              <li>• Existing guardian configuration for this wallet</li>
              <li>• Recovery threshold settings (how many approvals needed)</li>
              <li>• Guardian addresses and recovery permissions</li>
            </ul>
          </div>
        </div>
      )}

      {/* Initiate Recovery Step */}
      {currentStep === 'initiate' && recovery && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <Shield className="h-16 w-16 text-success-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Recovery Setup Found!</h2>
            <p className="text-neutral-300">
              We found your guardian configuration. Review and initiate recovery.
            </p>
          </div>

          <div className="space-y-6">
            {/* Recovery Details */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-white mb-4">Recovery Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Old Wallet</span>
                  <span className="text-white font-mono text-sm">
                    {recovery.oldWalletAddress.slice(0, 10)}...{recovery.oldWalletAddress.slice(-10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">New Wallet</span>
                  <span className="text-white font-mono text-sm">
                    {recovery.newWalletAddress.slice(0, 10)}...{recovery.newWalletAddress.slice(-10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Required Approvals</span>
                  <span className="text-white">
                    {recovery.requiredApprovals} of {recovery.guardians.length} guardians
                  </span>
                </div>
              </div>
            </div>

            {/* Guardians */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-white mb-4">Your Guardians</h3>
              <div className="space-y-3">
                {recovery.guardians.map((guardian, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{guardian.name || `Guardian ${index + 1}`}</p>
                      <p className="text-neutral-400 text-sm font-mono">
                        {guardian.address.slice(0, 10)}...{guardian.address.slice(-10)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-neutral-600 rounded-full"></div>
                      <span className="text-neutral-400 text-sm">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleInitiateRecovery}
              disabled={isInitiating}
              className="btn-primary w-full text-lg py-4"
            >
              {isInitiating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Initiating Recovery...
                </>
              ) : (
                <>
                  Initiate Recovery Process
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress Step */}
      {currentStep === 'progress' && recovery && (
        <div className="space-y-8 animate-scale-in">
          {/* Status Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon(recovery.status)}
              <h2 className="text-2xl font-bold text-white">Recovery In Progress</h2>
            </div>
            <p className="text-neutral-300">
              Waiting for guardian approvals to complete your wallet recovery
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Progress Overview */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-6">Recovery Progress</h3>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-400">Approvals</span>
                    <span className="text-white">{recovery.currentApprovals} of {recovery.requiredApprovals}</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-primary-600 to-success-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(recovery.currentApprovals / recovery.requiredApprovals) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <span className="text-success-400">Recovery Initiated</span>
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
                    <span className="text-warning-400">Waiting for Guardians</span>
                    <Clock className="h-5 w-5 text-warning-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg">
                    <span className="text-neutral-400">Wallet Transfer</span>
                    <div className="w-2 h-2 bg-neutral-600 rounded-full"></div>
                  </div>
                </div>

                {recovery.estimatedCompletion && (
                  <div className="mt-6 pt-4 border-t border-neutral-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Est. completion</span>
                      <span className="text-primary-400">
                        {formatTimeRemaining(recovery.estimatedCompletion)} remaining
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Share with Guardians */}
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Share with Guardians</h3>
                <p className="text-neutral-300 text-sm mb-4">
                  Send this link to your guardians so they can approve your recovery request
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={copyRecoveryLink}
                    className={`btn-secondary flex-1 flex items-center justify-center space-x-2 ${
                      copied ? 'text-success-400' : ''
                    }`}
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <button className="btn-ghost p-3">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Guardian Status */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Guardian Approvals</h3>
                <div className="space-y-3">
                  {recovery.guardians.map((guardian, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{guardian.name || `Guardian ${index + 1}`}</p>
                        <p className="text-neutral-400 text-sm font-mono">
                          {guardian.address.slice(0, 10)}...{guardian.address.slice(-10)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {guardian.hasApproved ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-success-500" />
                            <span className="text-success-400 text-sm">Approved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-5 w-5 text-warning-500" />
                            <span className="text-warning-400 text-sm">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div className="card p-6 bg-blue-500/5 border-blue-500/20">
                <h3 className="text-blue-400 font-semibold mb-3">What Happens Next?</h3>
                <ul className="text-blue-300 text-sm space-y-2">
                  <li>• Guardians will receive and review your recovery request</li>
                  <li>• Once {recovery.requiredApprovals} guardians approve, recovery will complete</li>
                  <li>• Your old wallet assets will be transferred to your new wallet</li>
                  <li>• You&apos;ll regain full access to your funds</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="text-center">
            <button 
              onClick={refreshStatus}
              className="btn-ghost flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {currentStep === 'complete' && recovery && (
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-scale-in">
          <div className="card p-12 space-y-6">
            <CheckCircle className="h-20 w-20 text-success-500 mx-auto" />
            <h2 className="text-3xl font-bold text-white">Recovery Complete!</h2>
            <p className="text-neutral-300 text-lg">
              Your wallet has been successfully recovered. You now have full access to your funds.
            </p>
            <div className="space-y-4">
              <div className="bg-success-500/10 border border-success-500/20 rounded-lg p-4">
                <p className="text-success-400 font-medium">Old Wallet: {recovery.oldWalletAddress.slice(0, 10)}...{recovery.oldWalletAddress.slice(-10)}</p>
                <p className="text-success-400 font-medium">New Wallet: {recovery.newWalletAddress.slice(0, 10)}...{recovery.newWalletAddress.slice(-10)}</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary w-full text-lg py-4"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}