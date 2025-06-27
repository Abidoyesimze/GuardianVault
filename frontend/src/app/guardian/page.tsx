'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useAccount } from '@starknet-react/core'
import { useSearchParams } from 'next/navigation'
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  Eye,
  Wallet,
  ArrowRight,
  RefreshCw
} from 'lucide-react'

type RecoveryRequest = {
  id: string
  requesterName?: string
  oldWalletAddress: string
  newWalletAddress: string
  requiredApprovals: number
  currentApprovals: number
  createdAt: Date
  expiresAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  description?: string
  guardians: Array<{
    address: string
    name?: string
    hasApproved: boolean
    approvedAt?: Date
  }>
}

type GuardianStep = 'connect' | 'view-requests' | 'review-request' | 'confirm-approval' | 'completed'

function GuardianPortalContent() {
  const { address, isConnected } = useAccount()
  const searchParams = useSearchParams()
  const recoveryId = searchParams.get('recovery')
  
  const [currentStep, setCurrentStep] = useState<GuardianStep>('connect')
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [approvalReason, setApprovalReason] = useState('')

  const loadGuardianRequests = useCallback(async () => {
    if (!isConnected) return
    
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Call smart contract to get recovery requests for this guardian
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock data - replace with actual smart contract calls
      const mockRequests: RecoveryRequest[] = [
        {
          id: '1',
          requesterName: 'Sarah Chen',
          oldWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          newWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
          requiredApprovals: 2,
          currentApprovals: 0,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
          status: 'pending',
          description: 'Lost access to my wallet after phone was stolen. Need to recover to my new device.',
          guardians: [
            { address: address!, name: 'You', hasApproved: false },
            { address: '0x789...def', name: 'Alice', hasApproved: false },
            { address: '0xabc...123', name: 'Bob', hasApproved: false },
          ]
        },
        {
          id: '2',
          requesterName: 'Marcus Johnson',
          oldWalletAddress: '0x9876543210fedcba9876543210fedcba98765432',
          newWalletAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
          requiredApprovals: 3,
          currentApprovals: 2,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          expiresAt: new Date(Date.now() + 19 * 60 * 60 * 1000), // 19 hours from now
          status: 'pending',
          description: 'Hardware wallet was damaged in a flood. Moving to a new wallet.',
          guardians: [
            { address: address!, name: 'You', hasApproved: false },
            { address: '0x456...789', name: 'Charlie', hasApproved: true, approvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
            { address: '0x123...456', name: 'Diana', hasApproved: true, approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
          ]
        }
      ]
      
      setRecoveryRequests(mockRequests)
      setCurrentStep('view-requests')
    } catch (err) {
      setError('Failed to load recovery requests')
      console.error('Failed to load requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address])

  const loadSpecificRequest = useCallback(async (requestId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Load specific recovery request
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockRequest: RecoveryRequest = {
        id: requestId,
        requesterName: 'Sarah Chen',
        oldWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        newWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        requiredApprovals: 2,
        currentApprovals: 0,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
        status: 'pending',
        description: 'Lost access to my wallet after phone was stolen. Need to recover to my new device.',
        guardians: [
          { address: address!, name: 'You', hasApproved: false },
          { address: '0x789...def', name: 'Alice', hasApproved: false },
          { address: '0xabc...123', name: 'Bob', hasApproved: false },
        ]
      }
      
      setSelectedRequest(mockRequest)
      setCurrentStep('review-request')
    } catch (err) {
      setError('Failed to load recovery request')
      console.error('Failed to load specific request:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected) {
      if (recoveryId) {
        loadSpecificRequest(recoveryId)
      } else {
        loadGuardianRequests()
      }
    }
  }, [isConnected, recoveryId, loadGuardianRequests, loadSpecificRequest])

  const approveRecovery = async (request: RecoveryRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Call smart contract to approve recovery
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update request status
      const updatedRequest = {
        ...request,
        currentApprovals: request.currentApprovals + 1,
        guardians: request.guardians.map(g => 
          g.address === address 
            ? { ...g, hasApproved: true, approvedAt: new Date() }
            : g
        )
      }
      
      setSelectedRequest(updatedRequest)
      setCurrentStep('completed')
    } catch (err) {
      setError('Failed to approve recovery')
      console.error('Failed to approve recovery:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const rejectRecovery = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Call smart contract to reject recovery
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setCurrentStep('completed')
    } catch (err) {
      setError('Failed to reject recovery')
      console.error('Failed to reject recovery:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const copyRequestLink = async (requestId: string) => {
    const link = `${window.location.origin}/guardian?recovery=${requestId}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours < 0) return 'Expired'
    return `${hours}h ${minutes}m remaining`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning-400'
      case 'approved': return 'text-success-400' 
      case 'rejected': return 'text-error-400'
      case 'expired': return 'text-neutral-400'
      default: return 'text-neutral-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'expired': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

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
      </div>

      {/* Connect Wallet Step */}
      {!isConnected && (
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
      {isConnected && isLoading && currentStep !== 'confirm-approval' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-300">Loading recovery requests...</p>
        </div>
      )}

      {/* View Requests Step */}
      {currentStep === 'view-requests' && !isLoading && (
        <div className="space-y-8 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary-500" />
              <span>Recovery Requests</span>
            </h2>
            <button
              onClick={loadGuardianRequests}
              className="btn-ghost flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {recoveryRequests.length === 0 ? (
            <div className="card p-12 text-center space-y-4">
              <Shield className="h-16 w-16 text-neutral-600 mx-auto" />
              <h3 className="text-xl font-bold text-white">No Recovery Requests</h3>
              <p className="text-neutral-400">
                You don&apos;t have any pending recovery requests at the moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {recoveryRequests.map((request) => (
                <div key={request.id} className="card p-6 hover:shadow-glow transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {request.requesterName || 'Recovery Request'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className={`text-sm font-medium capitalize ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-warning-400 text-sm font-medium">
                        {formatTimeRemaining(request.expiresAt)}
                      </p>
                      <p className="text-neutral-400 text-xs">
                        Created {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Progress</span>
                      <span className="text-white">{request.currentApprovals}/{request.requiredApprovals} approvals</span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary-600 to-success-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(request.currentApprovals / request.requiredApprovals) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-neutral-300 text-sm mb-4 italic">
                      &ldquo;{request.description}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-neutral-400">
                      <span>From: </span>
                      <code className="text-neutral-300">
                        {request.oldWalletAddress.slice(0, 10)}...{request.oldWalletAddress.slice(-8)}
                      </code>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyRequestLink(request.id)}
                        className={`btn-ghost p-2 ${copied ? 'text-success-400' : ''}`}
                        title={copied ? 'Copied!' : 'Copy link'}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request)
                          setCurrentStep('review-request')
                        }}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Request Step */}
      {currentStep === 'review-request' && selectedRequest && (
        <div className="space-y-8 animate-scale-in">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentStep('view-requests')}
              className="btn-ghost p-2"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
            <h2 className="text-2xl font-bold text-white">Review Recovery Request</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Request Details */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Request Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-neutral-400 text-sm">Requester</label>
                    <p className="text-white font-medium">
                      {selectedRequest.requesterName || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Old Wallet Address</label>
                    <p className="text-white font-mono text-sm break-all">
                      {selectedRequest.oldWalletAddress}
                    </p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">New Wallet Address</label>
                    <p className="text-white font-mono text-sm break-all">
                      {selectedRequest.newWalletAddress}
                    </p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Required Approvals</label>
                    <p className="text-white">
                      {selectedRequest.requiredApprovals} of {selectedRequest.guardians.length} guardians
                    </p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Expires</label>
                    <p className="text-warning-400 font-medium">
                      {formatTimeRemaining(selectedRequest.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="card p-6">
                  <h3 className="text-xl font-bold text-white mb-3">Recovery Reason</h3>
                  <p className="text-neutral-300 italic">&ldquo;{selectedRequest.description}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Guardian Status & Actions */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Guardian Status</h3>
                <div className="space-y-3">
                  {selectedRequest.guardians.map((guardian, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">
                          {guardian.name || `Guardian ${index + 1}`}
                          {guardian.address === address && ' (You)'}
                        </p>
                        <p className="text-neutral-400 text-sm font-mono">
                          {guardian.address.slice(0, 10)}...{guardian.address.slice(-8)}
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
                  className="btn-primary w-full text-lg py-4"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve Recovery
                </button>
                <button
                  onClick={() => rejectRecovery()}
                  className="btn-secondary w-full text-lg py-4 border-error-500/50 text-error-400 hover:bg-error-500/10"
                  disabled={isLoading}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject Recovery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Approval Step */}
      {currentStep === 'confirm-approval' && selectedRequest && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Confirm Approval</h2>
            <p className="text-neutral-300">
              You&apos;re about to approve this wallet recovery request. This action cannot be undone.
            </p>
          </div>

          <div className="card p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Final Confirmation</h3>
              <div className="bg-neutral-900/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-neutral-400">Approving recovery for:</p>
                <p className="text-white font-medium">{selectedRequest.requesterName}</p>
                <p className="text-neutral-400 font-mono text-sm">
                  {selectedRequest.oldWalletAddress.slice(0, 20)}...{selectedRequest.oldWalletAddress.slice(-20)}
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
              >
                Go Back
              </button>
              <button
                onClick={() => approveRecovery(selectedRequest)}
                disabled={isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? (
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
              Your approval has been recorded on the blockchain
            </p>
          </div>

          <div className="card p-8 space-y-4">
            <h3 className="text-white font-bold">What happens next?</h3>
            <ul className="text-neutral-300 text-sm space-y-2 text-left">
              <li>• Your approval has been added to the recovery request</li>
              <li>• The requester will be notified of your approval</li>
              <li>• Once enough guardians approve, the recovery will complete</li>
              <li>• Assets will be transferred to the new wallet</li>
            </ul>
          </div>

          <button
            onClick={() => setCurrentStep('view-requests')}
            className="btn-primary"
          >
            View More Requests
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="max-w-2xl mx-auto">
          <div className="status-error p-4 rounded-lg">
            <p className="text-error-400">{error}</p>
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
        <p className="text-neutral-300">Loading recovery requests...</p>
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