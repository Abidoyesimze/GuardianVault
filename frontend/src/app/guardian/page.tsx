'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useAccount } from '@starknet-react/core'
import { useSearchParams } from 'next/navigation'
import { Account } from 'starknet'
import { 
  Shield,  
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  Wallet,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { 
  useRecoveryRequest, 
  useGuardianRoot, 
  useThreshold, 
  useApproveRecovery 
} from '../../../lib/hooks/useRecoveryContract'
import { RecoveryStatus } from '../../../types/recovery'
import { generateMerkleProof } from '../../../lib/utils/merkle'
import { getGuardianSignature, validateSignature } from '../../../lib/utils/signatures'
import { RECOVERY_MANAGER_ADDRESS } from '../../../lib/contracts/recovery-manager'
import { getGuardianAddresses, isGuardianForWallet } from '../../../lib/utils/guardianStorage'
import { toast } from 'react-toastify'

type GuardianStep = 'connect' | 'verify-guardian' | 'no-requests' | 'review-request' | 'confirm-approval' | 'completed' | 'error' | 'invalid-wallet'

function GuardianPortalContent() {
  const { address, isConnected, account } = useAccount()
  const searchParams = useSearchParams()
  const walletToRecover = searchParams.get('wallet')
  
  const [currentStep, setCurrentStep] = useState<GuardianStep>('connect')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [approvalReason, setApprovalReason] = useState('')
  const [isVerifyingGuardian, setIsVerifyingGuardian] = useState(false)
  const [guardianAddresses, setGuardianAddresses] = useState<string[]>([])
  const [hasVerified, setHasVerified] = useState(false)
  
  // Use ref to prevent multiple verification attempts
  const verificationAttempted = useRef(false)

  // Contract hooks
  const { recoveryRequest, isLoading: loadingRequest, error: requestError, refetch: refetchRequest } = useRecoveryRequest(walletToRecover || undefined)
  const { guardianRoot, isLoading: loadingRoot } = useGuardianRoot(walletToRecover || undefined)
  const { threshold, isLoading: loadingThreshold } = useThreshold(walletToRecover || undefined)
  const { approveRecovery, isPending: isApproving, error: approvalError } = useApproveRecovery()

  // Check if wallet parameter is valid - only run once
  useEffect(() => {
    if (!walletToRecover) {
      setCurrentStep('invalid-wallet')
      setError('No wallet address provided in the URL')
      return
    }

    if (!walletToRecover.startsWith('0x') || walletToRecover.length < 10) {
      setCurrentStep('invalid-wallet')
      setError('Invalid wallet address format')
      return
    }
  }, [walletToRecover])

  // Check if connected user is a valid guardian
  const verifyGuardianAccess = useCallback(async () => {
    if (!address || !walletToRecover || !guardianRoot) return
    if (verificationAttempted.current) return // Prevent multiple attempts
    
    verificationAttempted.current = true
    setIsVerifyingGuardian(true)
    setError(null)

    try {
      // Get guardian addresses from storage
      const storedGuardianAddresses = getGuardianAddresses(walletToRecover)
      
      if (storedGuardianAddresses.length > 0) {
        setGuardianAddresses(storedGuardianAddresses)
        
        // Check if connected address is a guardian
        const isAuthorizedGuardian = isGuardianForWallet(address, walletToRecover)
        
        if (!isAuthorizedGuardian) {
          setError('You are not authorized as a guardian for this wallet.')
          setCurrentStep('error')
          setHasVerified(true)
          return
        }
      }

      // Check for active recovery requests
      if (recoveryRequest && recoveryRequest.status === RecoveryStatus.Pending) {
        setCurrentStep('review-request')
      } else if (recoveryRequest && recoveryRequest.status === RecoveryStatus.None) {
        setCurrentStep('no-requests')
      } else {
        setCurrentStep('no-requests')
      }
      
      setHasVerified(true)

    } catch {
      setError('Failed to verify guardian access. Please try again.')
      setCurrentStep('error')
      setHasVerified(true)
    } finally {
      setIsVerifyingGuardian(false)
    }
  }, [address, walletToRecover, guardianRoot, recoveryRequest])

  // Reset verification when wallet changes
  useEffect(() => {
    verificationAttempted.current = false
    setHasVerified(false)
  }, [address, walletToRecover])

  // Handle connection state changes
  useEffect(() => {
    if (currentStep === 'invalid-wallet') {
      return
    }

    if (!isConnected) {
      setCurrentStep('connect')
      setHasVerified(false)
      verificationAttempted.current = false
    } else if (isConnected && address && walletToRecover && currentStep === 'connect') {
      // Only proceed to verification if we're currently on connect step
      if (!loadingRoot && !loadingThreshold && !loadingRequest && !hasVerified) {
        verifyGuardianAccess()
      }
    }
  }, [isConnected, address, walletToRecover, loadingRoot, loadingThreshold, loadingRequest, hasVerified, verifyGuardianAccess, currentStep])

  // Handle contract errors
  useEffect(() => {
    if (requestError) {
      setError('Failed to load recovery request data')
    }
    if (approvalError) {
      setError(approvalError.message || 'Failed to approve recovery')
    }
  }, [requestError, approvalError])

  const handleApproveRecovery = async () => {
    if (!recoveryRequest || !address || !walletToRecover || !account) {
      setError('Missing required data for approval')
      return
    }

    setError(null)
    
    try {
      // Generate signature using connected wallet
      let signature: { r: string; s: string }
      try {
        const signatureResult = await getGuardianSignature(
          account as Account,
          RECOVERY_MANAGER_ADDRESS,
          walletToRecover,
          recoveryRequest.new_wallet
        )
        signature = signatureResult
        
        // Validate signature format
        if (!validateSignature(signature)) {
          throw new Error('Generated signature is invalid')
        }
        
      } catch {
        throw new Error('Failed to generate signature. Please try again.')
      }

      // Generate merkle proof using stored guardian addresses
      let merkleProof: string[] = []
      
      if (guardianAddresses.length > 0) {
        try {
          merkleProof = generateMerkleProof(guardianAddresses, address)
        } catch {
          throw new Error('Failed to generate guardian proof. You may not be authorized as a guardian.')
        }
      } else {
        // Try to get addresses from storage as fallback
        const storedAddresses = getGuardianAddresses(walletToRecover)
        if (storedAddresses.length > 0) {
          try {
            merkleProof = generateMerkleProof(storedAddresses, address)
          } catch {
            throw new Error('Failed to generate guardian proof.')
          }
        } else {
          // For older setups without stored data, try empty proof
          merkleProof = []
        }
      }

      const result = await approveRecovery(
        walletToRecover,
        address,
        signature.r,
        signature.s,
        merkleProof
      )

      if (result.success) {
        setCurrentStep('completed')
        toast.success('Recovery approved successfully! 🎉', {
          position: "top-right",
          autoClose: 5000,
        })
        
        // Refetch the recovery request to get updated data
        setTimeout(() => {
          refetchRequest()
        }, 2000)
        
      } else {
        throw new Error(result.error || 'Failed to approve recovery')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve recovery'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const copyRequestLink = async () => {
    if (!walletToRecover) return
    
    const link = `${window.location.origin}/guardian?wallet=${walletToRecover}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast.success('Guardian link copied to clipboard!', {
      position: "top-right",
      autoClose: 2000,
    })
  }

  const formatTimeRemaining = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    
    const expirationTime = timestamp + (24 * 60 * 60) // 24 hours from creation
    const now = Math.floor(Date.now() / 1000)
    const diff = expirationTime - now
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    
    return `${hours}h ${minutes}m remaining`
  }

  const getStatusText = (status: RecoveryStatus) => {
    switch (status) {
      case RecoveryStatus.None: return 'No Request'
      case RecoveryStatus.Pending: return 'Pending'
      case RecoveryStatus.Approved: return 'Approved'
      case RecoveryStatus.Completed: return 'Completed'
      case RecoveryStatus.Expired: return 'Expired'
      default: return 'Unknown'
    }
  }

  const getStatusColor = (status: RecoveryStatus) => {
    switch (status) {
      case RecoveryStatus.Pending: return 'text-warning-400'
      case RecoveryStatus.Approved: return 'text-success-400'
      case RecoveryStatus.Completed: return 'text-success-400'
      case RecoveryStatus.Expired: return 'text-error-400'
      default: return 'text-neutral-400'
    }
  }

  const getStatusIcon = (status: RecoveryStatus) => {
    switch (status) {
      case RecoveryStatus.Pending: return <Clock className="h-4 w-4" />
      case RecoveryStatus.Approved: return <CheckCircle className="h-4 w-4" />
      case RecoveryStatus.Completed: return <CheckCircle className="h-4 w-4" />
      case RecoveryStatus.Expired: return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Show loading while data is being fetched and we haven't verified yet
  const isLoading = (loadingRequest || loadingRoot || loadingThreshold || isVerifyingGuardian) && !hasVerified

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-4xl lg:text-5xl font-bold text-white">
          Guardian Portal
        </h1>
        <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
          Review and approve wallet recovery requests from your trusted network
        </p>
        {walletToRecover && currentStep !== 'invalid-wallet' && (
          <div className="text-center">
            <p className="text-neutral-400 text-sm">Guardian request for wallet:</p>
            <p className="text-primary-400 font-mono text-sm">
              {walletToRecover.slice(0, 10)}...{walletToRecover.slice(-10)}
            </p>
          </div>
        )}
      </div>

      {/* Invalid Wallet Step */}
      {currentStep === 'invalid-wallet' && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="card p-12 text-center space-y-8">
            <div className="space-y-4">
              <AlertTriangle className="h-16 w-16 text-error-500 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Invalid Guardian Link</h2>
              <p className="text-neutral-300 max-w-md mx-auto">
                The guardian link you followed is invalid or missing required information.
              </p>
            </div>
            <div className="status-error p-4 rounded-lg">
              <p className="text-error-400">{error}</p>
            </div>
            <div className="space-y-3">
              <p className="text-neutral-400 text-sm">
                A valid guardian link should look like:
              </p>
              <p className="text-neutral-500 font-mono text-xs bg-neutral-900 p-2 rounded">
                {window.location.origin}/guardian?wallet=0x...
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Wallet Step */}
      {!isConnected && currentStep !== 'invalid-wallet' && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="card p-12 text-center space-y-8">
            <div className="space-y-4">
              <Wallet className="h-16 w-16 text-primary-500 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Connect as Guardian</h2>
              <p className="text-neutral-300 max-w-md mx-auto">
                Connect your guardian wallet to view and approve recovery requests
              </p>
            </div>
            <div className="status-warning p-4 rounded-lg">
              <p className="text-warning-400">Please connect your wallet using the button in the top navigation</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isConnected && currentStep !== 'invalid-wallet' && isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-300">
            {isVerifyingGuardian ? 'Verifying guardian access...' : 'Loading recovery data...'}
          </p>
        </div>
      )}

      {/* No Active Requests */}
      {currentStep === 'no-requests' && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="card p-12 text-center space-y-6">
            <Shield className="h-16 w-16 text-neutral-600 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No Active Recovery Requests</h3>
              <p className="text-neutral-400">
                There are currently no pending recovery requests for this wallet.
              </p>
            </div>
            
            {walletToRecover && (
              <div className="space-y-4">
                <div className="status-success p-4 rounded-lg">
                  <p className="text-success-400 text-sm">
                    ✅ You are verified as a guardian for this wallet
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={copyRequestLink}
                    className={`btn-secondary flex-1 ${copied ? 'text-success-400' : ''}`}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Guardian Link'}
                  </button>
                  <button
                    onClick={() => refetchRequest()}
                    className="btn-ghost p-3"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Request Step */}
      {currentStep === 'review-request' && recoveryRequest && (
        <div className="space-y-8 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Recovery Request Details</h2>
            <button
              onClick={() => refetchRequest()}
              className="btn-ghost flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Request Details */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Request Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-neutral-400 text-sm">Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(recoveryRequest.status)}
                      <span className={`font-medium ${getStatusColor(recoveryRequest.status)}`}>
                        {getStatusText(recoveryRequest.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-sm">Old Wallet Address</label>
                    <p className="text-white font-mono text-sm break-all mt-1">
                      {recoveryRequest.old_wallet}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-sm">New Wallet Address</label>
                    <p className="text-white font-mono text-sm break-all mt-1">
                      {recoveryRequest.new_wallet}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-sm">Current Approvals</label>
                    <p className="text-white mt-1">
                      {recoveryRequest.approvals} of {threshold || 'Loading...'} required
                    </p>
                    {threshold && (
                      <div className="w-full bg-neutral-800 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-primary-600 to-success-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((recoveryRequest.approvals / threshold) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-sm">Request Created</label>
                    <p className="text-white mt-1">
                      {recoveryRequest.timestamp ? new Date(recoveryRequest.timestamp * 1000).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-sm">Time Remaining</label>
                    <p className="text-warning-400 font-medium mt-1">
                      {formatTimeRemaining(recoveryRequest.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guardian Actions */}
            <div className="space-y-6">
              {/* Security Check */}
              <div className="card p-6 bg-yellow-500/5 border-yellow-500/20">
                <h3 className="text-yellow-400 font-bold mb-3 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Security Verification</span>
                </h3>
                <div className="space-y-3 text-yellow-300 text-sm">
                  <p>• Verify you know the person requesting recovery</p>
                  <p>• Confirm they have lost access to their original wallet</p>
                  <p>• Check that the new wallet address belongs to them</p>
                  <p>• Only approve if you trust this recovery request</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentStep('confirm-approval')}
                  disabled={recoveryRequest.status !== RecoveryStatus.Pending}
                  className="btn-primary w-full text-lg py-4 disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {recoveryRequest.status === RecoveryStatus.Pending ? 'Approve Recovery' : 'Cannot Approve'}
                </button>
                
                <button
                  onClick={copyRequestLink}
                  className={`btn-secondary w-full ${copied ? 'text-success-400' : ''}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Share Guardian Link'}
                </button>
              </div>

              {/* Guardian Info */}
              <div className="card p-4 bg-blue-500/5 border-blue-500/20">
                <h4 className="text-blue-400 font-medium mb-2">Your Guardian Role</h4>
                <div className="text-blue-300 text-sm space-y-1">
                  <p>• Connected as: {address?.slice(0, 10)}...{address?.slice(-8)}</p>
                  <p>• Required threshold: {threshold} approvals</p>
                  <p>• Current approvals: {recoveryRequest.approvals}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Approval Step */}
      {currentStep === 'confirm-approval' && recoveryRequest && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Confirm Approval</h2>
            <p className="text-neutral-300">
              You&apos;re about to approve this wallet recovery request. This action will be recorded on the blockchain.
            </p>
          </div>

          <div className="card p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Final Confirmation</h3>
              <div className="bg-neutral-900/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-neutral-400">Approving recovery from:</p>
                <p className="text-white font-mono text-sm">
                  {recoveryRequest.old_wallet}
                </p>
                <p className="text-sm text-neutral-400 mt-2">To new wallet:</p>
                <p className="text-white font-mono text-sm">
                  {recoveryRequest.new_wallet}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Why are you approving this recovery? (optional)"
                className="input-field w-full h-24 resize-none"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentStep('review-request')}
                className="btn-secondary flex-1"
                disabled={isApproving}
              >
                Go Back
              </button>
              <button
                onClick={handleApproveRecovery}
                disabled={isApproving}
                className="btn-primary flex-1"
              >
                {isApproving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Approving...
                  </>
                ) : (
                  'Confirm Approval'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Step */}
      {currentStep === 'completed' && (
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-scale-in">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Approval Submitted! 🎉</h2>
            <p className="text-neutral-300 text-lg">
              Your approval has been recorded on the StarkNet blockchain
            </p>
          </div>

          <div className="card p-8 space-y-4">
            <h3 className="text-white font-bold">What happens next?</h3>
            <ul className="text-neutral-300 text-sm space-y-2 text-left">
              <li>• Your approval has been added to the recovery request</li>
              <li>• The wallet owner will be notified of your approval</li>
              <li>• Once {threshold || 'enough'} guardians approve, the recovery will be ready</li>
              <li>• The owner can then finalize the recovery process</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                setCurrentStep('review-request')
                refetchRequest()
              }}
              className="btn-secondary"
            >
              View Request Again
            </button>
            <button
              onClick={copyRequestLink}
              className="btn-primary"
            >
              Share Guardian Link
            </button>
          </div>
        </div>
      )}

      {/* Error Step */}
      {currentStep === 'error' && (
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="card p-8 text-center space-y-6">
            <XCircle className="h-16 w-16 text-error-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Access Error</h3>
              <p className="text-neutral-400">
                There was an issue verifying your guardian access.
              </p>
            </div>
            
            {error && (
              <div className="status-error p-4 rounded-lg">
                <p className="text-error-400 text-sm">{error}</p>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* General Error Display */}
      {error && currentStep !== 'error' && currentStep !== 'invalid-wallet' && (
        <div className="max-w-2xl mx-auto">
          <div className="status-error p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-error-400" />
              <p className="text-error-400">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-4xl lg:text-5xl font-bold text-white">
          Guardian Portal
        </h1>
        <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
          Loading...
        </p>
      </div>
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-neutral-300">Loading guardian portal...</p>
      </div>
    </div>
  )
}

export default function GuardianPortalPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GuardianPortalContent />
    </Suspense>
  )
}