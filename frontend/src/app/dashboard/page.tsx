'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from '@starknet-react/core'
import { 
  Shield, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Copy,
  ExternalLink,
  RefreshCw,
  History,
  Activity,
  TrendingUp,
  Wallet,
  Eye,
  EyeOff,
  XCircle
} from 'lucide-react'
import { 
  useRecoveryRequest, 
  useGuardianRoot, 
  useThreshold, 
  useInitiateRecovery,
  useFinalizeRecovery
} from '../../../lib/hooks/useRecoveryContract'
import { RecoveryStatus } from '../../../types/recovery'
import { 
  getGuardianInfo, 
  getAllStoredWallets,
  WalletGuardians 
} from '../../../lib/utils/guardianStorage'
import { toast } from 'react-toastify'

type Guardian = {
  id: string
  name: string
  address: string
  status: 'active' | 'pending' | 'inactive'
  addedAt: Date
  lastActive?: Date
}

type DashboardRecoveryRequest = {
  id: string
  type: 'incoming' | 'outgoing'
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired'
  requesterName?: string
  targetWallet?: string
  oldWallet: string
  newWallet: string
  createdAt: Date
  completedAt?: Date
  currentApprovals: number
  requiredApprovals: number
}

type DashboardStats = {
  totalGuardians: number
  activeRecoveries: number
  completedRecoveries: number
  guardiansHelped: number
  walletsProtecting: number
}

type TabType = 'overview' | 'guardians' | 'recovery' | 'history'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [recoveryRequests, setRecoveryRequests] = useState<DashboardRecoveryRequest[]>([])
  const [walletsProtecting, setWalletsProtecting] = useState<WalletGuardians[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalGuardians: 0,
    activeRecoveries: 0,
    completedRecoveries: 0,
    guardiansHelped: 0,
    walletsProtecting: 0
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [showAddressDetails, setShowAddressDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newWalletAddress, setNewWalletAddress] = useState('')
  const [showInitiateForm, setShowInitiateForm] = useState(false)

  // Contract hooks - only call when wallet is connected and address is available
  const walletAddress = isConnected && address ? address : undefined
  
  const { recoveryRequest, isLoading: recoveryLoading, error: recoveryError, refetch: refetchRecovery } = useRecoveryRequest(walletAddress)
  const { guardianRoot, isLoading: guardianRootLoading, error: guardianRootError } = useGuardianRoot(walletAddress)
  const { threshold: contractThreshold, isLoading: thresholdLoading, error: thresholdError } = useThreshold(walletAddress)

  // Action hooks
  const { initiateRecovery, isPending: initiatePending, error: initiateError } = useInitiateRecovery()
  const { finalizeRecovery, isPending: finalizePending, error: finalizeError } = useFinalizeRecovery()

  const mapRecoveryStatus = (status: RecoveryStatus): 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' => {
    switch (status) {
      case RecoveryStatus.Pending:
        return 'pending'
      case RecoveryStatus.Approved:
        return 'approved'
      case RecoveryStatus.Completed:
        return 'completed'
      case RecoveryStatus.Expired:
        return 'expired'
      default:
        return 'pending'
    }
  }

  const loadDashboardData = useCallback(async () => {
    if (!isConnected || !address) {
      // Reset data when disconnected
      setGuardians([])
      setRecoveryRequests([])
      setWalletsProtecting([])
      setStats({
        totalGuardians: 0,
        activeRecoveries: 0,
        completedRecoveries: 0,
        guardiansHelped: 0,
        walletsProtecting: 0
      })
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Load guardians for this wallet from storage
      const walletGuardianInfo = getGuardianInfo(address)
      
      let dashboardGuardians: Guardian[] = []
      if (walletGuardianInfo) {
        dashboardGuardians = walletGuardianInfo.guardians.map((g, index) => ({
          id: index.toString(),
          name: g.name || `Guardian ${index + 1}`,
          address: g.address,
          status: 'active' as const,
          addedAt: new Date(g.addedAt),
          lastActive: new Date(g.addedAt)
        }))
      }
      
      // 2. Find wallets where this address is a guardian
      const allStoredWallets = getAllStoredWallets()
      
      const protectingWallets = allStoredWallets.filter(wallet => 
        wallet.guardians.some(g => g.address.toLowerCase() === address.toLowerCase())
      )

      // 3. Load recovery requests
      const dashboardRecoveryRequests: DashboardRecoveryRequest[] = []
      
      // Add current wallet's recovery request if it exists
      if (recoveryRequest && recoveryRequest.status !== RecoveryStatus.None) {
        const status = mapRecoveryStatus(recoveryRequest.status)
        dashboardRecoveryRequests.push({
          id: `${address}-recovery`,
          type: 'outgoing',
          status,
          oldWallet: recoveryRequest.old_wallet,
          newWallet: recoveryRequest.new_wallet,
          targetWallet: recoveryRequest.new_wallet,
          createdAt: new Date(recoveryRequest.timestamp * 1000),
          completedAt: status === 'completed' ? new Date() : undefined,
          currentApprovals: recoveryRequest.approvals,
          requiredApprovals: contractThreshold || 2
        })
      }

      // 4. Calculate stats
      const activeRecoveries = dashboardRecoveryRequests.filter(r => r.status === 'pending').length
      const completedRecoveries = dashboardRecoveryRequests.filter(r => r.status === 'completed').length
      
      setGuardians(dashboardGuardians)
      setRecoveryRequests(dashboardRecoveryRequests)
      setWalletsProtecting(protectingWallets)
      setStats({
        totalGuardians: dashboardGuardians.length,
        activeRecoveries,
        completedRecoveries,
        guardiansHelped: completedRecoveries,
        walletsProtecting: protectingWallets.length
      })

    } catch {
      setError('Failed to load dashboard data. Please try refreshing.')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, recoveryRequest, contractThreshold])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Handle contract errors
  useEffect(() => {
    if (!isConnected) {
      setError(null)
      return
    }

    const errors = [
      recoveryError?.message,
      guardianRootError?.message,
      thresholdError?.message,
      initiateError?.message,
      finalizeError?.message
    ].filter(Boolean)

    if (errors.length > 0) {
      setError(errors[0] || 'Contract error occurred')
    }
  }, [
    isConnected,
    recoveryError, guardianRootError, thresholdError, 
    initiateError, finalizeError
  ])

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Address copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
      })
    }
  }

  const copyGuardianLink = async () => {
    if (address) {
      const link = `${window.location.origin}/guardian?wallet=${address}`
      await navigator.clipboard.writeText(link)
      toast.success('Guardian link copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success-400'
      case 'pending': return 'text-warning-400'
      case 'inactive': return 'text-neutral-400'
      case 'completed': return 'text-success-400'
      case 'rejected': return 'text-error-400'
      case 'expired': return 'text-neutral-400'
      case 'approved': return 'text-success-400'
      default: return 'text-neutral-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'inactive': return <AlertTriangle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleInitiateRecovery = async () => {
    if (!address || !newWalletAddress) {
      setError('Please enter a new wallet address')
      return
    }
    
    if (newWalletAddress === address) {
      setError('New wallet address cannot be the same as current address')
      return
    }

    // Validate new wallet address format
    if (!newWalletAddress.startsWith('0x') || newWalletAddress.length < 60) {
      setError('Please enter a valid StarkNet wallet address')
      return
    }
    
    try {
      const result = await initiateRecovery(address, newWalletAddress)
      
      if (result.success) {
        toast.success('Recovery initiated successfully!', {
          position: "top-right",
          autoClose: 5000,
        })
        setShowInitiateForm(false)
        setNewWalletAddress('')
        // Refresh data
        setTimeout(() => {
          refetchRecovery()
          loadDashboardData()
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to initiate recovery')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate recovery'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const handleFinalizeRecovery = async () => {
    if (!address || !recoveryRequest) {
      setError('No recovery request to finalize')
      return
    }
    
    try {
      const result = await finalizeRecovery(address)
      
      if (result.success) {
        toast.success('Recovery finalized successfully!', {
          position: "top-right",
          autoClose: 5000,
        })
        // Refresh data
        setTimeout(() => {
          refetchRecovery()
          loadDashboardData()
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to finalize recovery')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to finalize recovery'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const isWalletSetup = guardians.length > 0 || Boolean(guardianRoot && guardianRoot !== '0x0')

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card p-12 text-center space-y-8">
          <div className="space-y-4">
            <Wallet className="h-16 w-16 text-primary-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
            <p className="text-neutral-300 max-w-md mx-auto">
              Connect your wallet to access your GuardianVault dashboard
            </p>
          </div>
          <div className="status-warning p-4 rounded-lg">
            <p className="text-warning-400">Please connect your wallet using the button in the top navigation</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="card p-4 bg-error-500/10 border border-error-500/20 animate-slide-down">
          <div className="flex items-center space-x-3">
            <XCircle className="h-5 w-5 text-error-400" />
            <p className="text-error-400 flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-error-400 hover:text-error-300"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-neutral-300 mt-2">
            {isWalletSetup 
              ? 'Manage your guardian recovery setup' 
              : 'Set up guardian recovery for your wallet'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadDashboardData}
            className="btn-ghost flex items-center space-x-2"
            disabled={isLoading || recoveryLoading || guardianRootLoading || thresholdLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Wallet Info Card */}
      <div className="card p-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Your Wallet</h3>
              <div className="flex items-center space-x-2">
                <code className="text-neutral-300 text-sm font-mono">
                  {showAddressDetails 
                    ? address 
                    : `${address?.slice(0, 10)}...${address?.slice(-10)}`
                  }
                </code>
                <button
                  onClick={() => setShowAddressDetails(!showAddressDetails)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  {showAddressDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isWalletSetup ? (
              <>
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-success-400 text-sm font-medium">Protected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <span className="text-warning-400 text-sm font-medium">Setup Required</span>
              </>
            )}
            <button
              onClick={copyAddress}
              className={`btn-ghost p-2 ${copied ? 'text-success-400' : ''}`}
              title={copied ? 'Copied!' : 'Copy address'}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Setup Warning */}
        {!isWalletSetup && (
          <div className="mt-4 p-4 bg-warning-500/10 border border-warning-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning-400" />
              <div>
                <p className="text-warning-400 font-medium">Guardian recovery not set up</p>
                <p className="text-warning-300 text-sm">
                  Set up guardians to secure your wallet with social recovery.
                </p>
              </div>
              <a href="/setup" className="btn-primary ml-auto">
                Setup Now
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 animate-slide-up">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalGuardians}</p>
          <p className="text-neutral-400 text-sm">Your Guardians</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.walletsProtecting}</p>
          <p className="text-neutral-400 text-sm">Wallets Protecting</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-warning-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock className="h-6 w-6 text-warning-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeRecoveries}</p>
          <p className="text-neutral-400 text-sm">Active Recoveries</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-success-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-success-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.completedRecoveries}</p>
          <p className="text-neutral-400 text-sm">Completed</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.guardiansHelped}</p>
          <p className="text-neutral-400 text-sm">People Helped</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card p-2 animate-slide-up">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'guardians', label: 'Guardians', icon: Users },
            { id: 'recovery', label: 'Recovery', icon: Shield },
            { id: 'history', label: 'History', icon: History }
          ].map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-glow'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-scale-in">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Guardian Setup Status */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary-500" />
                <span>Recovery Setup</span>
              </h3>
              
              {isWalletSetup ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <span className="text-success-400">Guardians Configured</span>
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <span className="text-success-400">
                      Threshold Set ({contractThreshold || 2} of {guardians.length})
                    </span>
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <span className="text-success-400">Smart Contract Deployed</span>
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Recovery Security Level</span>
                      <span className="text-success-400 font-medium">High</span>
                    </div>
                  </div>

                  <button
                    onClick={copyGuardianLink}
                    className="btn-secondary w-full mt-4"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Share Guardian Link
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
                    <span className="text-warning-400">Setup Required</span>
                    <AlertTriangle className="h-5 w-5 text-warning-500" />
                  </div>
                  
                  <a href="/setup" className="btn-primary w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Set Up Guardian Recovery
                  </a>
                </div>
              )}
            </div>

            {/* Recent Activity / Current Status */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary-500" />
                <span>Current Status</span>
              </h3>
              
              <div className="space-y-3">
                {recoveryRequest && recoveryRequest.status !== RecoveryStatus.None ? (
                  <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                    <Shield className="h-4 w-4 text-primary-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        Recovery request {mapRecoveryStatus(recoveryRequest.status)}
                      </p>
                      <p className="text-neutral-400 text-xs">
                        {recoveryRequest.approvals}/{contractThreshold || 2} approvals received
                      </p>
                      <p className="text-neutral-400 text-xs">
                        {new Date(recoveryRequest.timestamp * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusIcon(mapRecoveryStatus(recoveryRequest.status))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm">No active recovery requests</p>
                      <p className="text-neutral-400 text-xs">Your wallet is secure</p>
                    </div>
                  </div>
                )}

                {walletsProtecting.length > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-500/10 rounded-lg">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        Guardian for {walletsProtecting.length} wallet{walletsProtecting.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-neutral-400 text-xs">Ready to help with recoveries</p>
                    </div>
                  </div>
                )}

                {isWalletSetup && (
                  <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                    <Shield className="h-4 w-4 text-success-500" />
                    <div className="flex-1">
                      <p className="text-white text-sm">Guardian setup completed</p>
                      <p className="text-neutral-400 text-xs">
                        {guardians.length} guardians protecting your wallet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guardians Tab */}
        {activeTab === 'guardians' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Your Guardians</h3>
              {isWalletSetup ? (
                <button
                  onClick={copyGuardianLink}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Share Guardian Link</span>
                </button>
              ) : (
                <a href="/setup" className="btn-primary flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Set Up Guardians</span>
                </a>
              )}
            </div>

            {guardians.length === 0 ? (
              <div className="card p-12 text-center space-y-4">
                <Users className="h-16 w-16 text-neutral-600 mx-auto" />
                <h4 className="text-xl font-bold text-white">No Guardians Set Up</h4>
                <p className="text-neutral-400 max-w-md mx-auto">
                  Set up trusted guardians to enable social recovery for your wallet.
                </p>
                <a href="/setup" className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Set Up Guardian Recovery
                </a>
              </div>
            ) : (
              <div className="grid gap-4">
                {guardians.map((guardian) => (
                  <div key={guardian.id} className="card p-6 hover:shadow-glow transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{guardian.name}</h4>
                          <p className="text-neutral-400 text-sm font-mono">
                            {guardian.address.slice(0, 16)}...{guardian.address.slice(-16)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusIcon(guardian.status)}
                            <span className={`text-sm font-medium capitalize ${getStatusColor(guardian.status)}`}>
                              {guardian.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-700 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-400">Added:</span>
                        <p className="text-white">{guardian.addedAt.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-neutral-400">Role:</span>
                        <p className="text-white">Recovery Guardian</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wallets You're Protecting */}
            {walletsProtecting.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-white">Wallets You&apos;re Protecting</h4>
                <div className="grid gap-4">
                  {walletsProtecting.map((wallet, walletIndex) => (
                    <div key={walletIndex} className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            Wallet: {wallet.walletAddress.slice(0, 10)}...{wallet.walletAddress.slice(-10)}
                          </p>
                          <p className="text-neutral-400 text-sm">
                            {wallet.guardians.length} guardians, {wallet.threshold} required
                          </p>
                        </div>
                        <a 
                          href={`/guardian?wallet=${wallet.walletAddress}`}
                          className="btn-ghost"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recovery Tab */}
        {activeTab === 'recovery' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Recovery Requests</h3>
              {isWalletSetup && !showInitiateForm && (
                <button 
                  onClick={() => setShowInitiateForm(true)}
                  className="btn-primary"
                >
                  Initiate Recovery
                </button>
              )}
            </div>

            {/* Initiate Recovery Form */}
            {showInitiateForm && (
              <div className="card p-6">
                <h4 className="text-lg font-bold text-white mb-4">Initiate Wallet Recovery</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      New Wallet Address
                    </label>
                    <input
                      type="text"
                      value={newWalletAddress}
                      onChange={(e) => setNewWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="input-field w-full"
                    />
                    <p className="text-neutral-400 text-sm mt-1">
                      Enter the address of your new wallet that will receive access
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowInitiateForm(false)
                        setNewWalletAddress('')
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInitiateRecovery}
                      disabled={initiatePending || !newWalletAddress}
                      className="btn-primary flex-1"
                    >
                      {initiatePending ? 'Initiating...' : 'Initiate Recovery'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {recoveryRequests.length === 0 ? (
              <div className="card p-12 text-center space-y-4">
                <Shield className="h-16 w-16 text-neutral-600 mx-auto" />
                <h4 className="text-xl font-bold text-white">No Recovery Requests</h4>
                <p className="text-neutral-400">
                  {!isWalletSetup 
                    ? "Set up guardian recovery first to enable wallet recovery."
                    : "You don&apos;t have any active recovery requests at the moment."
                  }
                </p>
                {!isWalletSetup && (
                  <a href="/setup" className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Set Up Guardian Recovery
                  </a>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {recoveryRequests.map((request) => (
                  <div key={request.id} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.type === 'incoming' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {request.type === 'incoming' ? 'Guardian Request' : 'Your Recovery'}
                          </span>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(request.status)}
                            <span className={`text-sm font-medium capitalize ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-white">
                          {request.type === 'incoming' 
                            ? `Recovery request from ${request.requesterName}` 
                            : 'Your wallet recovery'
                          }
                        </h4>
                        <p className="text-neutral-400 text-sm">
                          Created {request.createdAt.toLocaleDateString()}
                        </p>
                        <p className="text-neutral-400 text-sm font-mono">
                          To: {request.newWallet.slice(0, 16)}...{request.newWallet.slice(-16)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Progress</span>
                        <span className="text-white">{request.currentApprovals}/{request.requiredApprovals} approvals</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary-600 to-success-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((request.currentApprovals / request.requiredApprovals) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      {/* Show finalize button if recovery is approved */}
                      {request.status === 'approved' && request.type === 'outgoing' && (
                        <button 
                          className="btn-success w-full mt-4"
                          onClick={handleFinalizeRecovery}
                          disabled={finalizePending}
                        >
                          {finalizePending ? 'Finalizing...' : 'Finalize Recovery'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Activity History</h3>
            
            <div className="space-y-4">
              {/* Real activity from stored data */}
              {guardians.map((guardian) => (
                <div key={guardian.id} className="card p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      Guardian {guardian.name} added
                    </p>
                    <p className="text-neutral-400 text-sm">
                      {guardian.addedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
              ))}

              {/* Recovery request history */}
              {recoveryRequests.map((request) => (
                <div key={request.id} className="card p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-shield-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      Recovery request {request.status}
                    </p>
                    <p className="text-neutral-400 text-sm">
                      {request.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusIcon(request.status)}
                </div>
              ))}

              {/* Empty state */}
              {guardians.length === 0 && recoveryRequests.length === 0 && (
                <div className="card p-12 text-center space-y-4">
                  <History className="h-16 w-16 text-neutral-600 mx-auto" />
                  <h4 className="text-xl font-bold text-white">No Activity Yet</h4>
                  <p className="text-neutral-400">
                    Your guardian activity will appear here once you set up recovery.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}