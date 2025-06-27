'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@starknet-react/core'
import { 
  Shield, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  RefreshCw,
  History,
  Activity,
  TrendingUp,
  Wallet,
  Eye,
  EyeOff
} from 'lucide-react'

type Guardian = {
  id: string
  name: string
  address: string
  status: 'active' | 'pending' | 'inactive'
  addedAt: Date
  lastActive?: Date
}

type RecoveryRequest = {
  id: string
  type: 'incoming' | 'outgoing'
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired'
  requesterName?: string
  targetWallet?: string
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
}

type TabType = 'overview' | 'guardians' | 'recovery' | 'history'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalGuardians: 0,
    activeRecoveries: 0,
    completedRecoveries: 0,
    guardiansHelped: 0
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [showAddressDetails, setShowAddressDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [threshold, setThreshold] = useState(2)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isConnected) {
      loadDashboardData()
    }
  }, [isConnected])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // TODO: Load data from smart contracts
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock data
      const mockGuardians: Guardian[] = [
        {
          id: '1',
          name: 'Alice Smith',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'active',
          addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2', 
          name: 'Bob Johnson',
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          status: 'active',
          addedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: '3',
          name: 'Charlie Wilson',
          address: '0x9876543210fedcba9876543210fedcba98765432',
          status: 'active',
          addedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]

      const mockRecoveryRequests: RecoveryRequest[] = [
        {
          id: '1',
          type: 'outgoing',
          status: 'pending',
          targetWallet: '0xnewwallet...',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          currentApprovals: 1,
          requiredApprovals: 2
        },
        {
          id: '2',
          type: 'incoming',
          status: 'completed',
          requesterName: 'Sarah Chen',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          currentApprovals: 2,
          requiredApprovals: 2
        }
      ]

      setGuardians(mockGuardians)
      setRecoveryRequests(mockRecoveryRequests)
      setStats({
        totalGuardians: mockGuardians.length,
        activeRecoveries: mockRecoveryRequests.filter(r => r.status === 'pending').length,
        completedRecoveries: mockRecoveryRequests.filter(r => r.status === 'completed').length,
        guardiansHelped: 5
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      default: return 'text-neutral-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'inactive': return <AlertTriangle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-neutral-300 mt-2">Manage your guardian recovery setup</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadDashboardData}
            className="btn-ghost flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
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
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-success-400 text-sm font-medium">Protected</span>
            <button
              onClick={copyAddress}
              className={`btn-ghost p-2 ${copied ? 'text-success-400' : ''}`}
              title={copied ? 'Copied!' : 'Copy address'}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalGuardians}</p>
          <p className="text-neutral-400 text-sm">Active Guardians</p>
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
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="h-6 w-6 text-blue-400" />
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
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                  <span className="text-success-400">Guardians Configured</span>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
                
                <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                  <span className="text-success-400">Threshold Set ({threshold} of {guardians.length})</span>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
                
                <div className="flex justify-between items-center p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                  <span className="text-success-400">Smart Contract Deployed</span>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-700">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Recovery Security Level</span>
                  <span className="text-success-400 font-medium">High</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary-500" />
                <span>Recent Activity</span>
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-success-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm">Helped Sarah Chen recover wallet</p>
                    <p className="text-neutral-400 text-xs">2 days ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                  <Users className="h-4 w-4 text-primary-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm">Guardian Charlie Wilson added</p>
                    <p className="text-neutral-400 text-xs">1 week ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-neutral-900/50 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm">Recovery setup completed</p>
                    <p className="text-neutral-400 text-xs">3 weeks ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guardians Tab */}
        {activeTab === 'guardians' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Your Guardians</h3>
              <button className="btn-primary flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Guardian</span>
              </button>
            </div>

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
                    
                    <div className="flex items-center space-x-2">
                      <button className="btn-ghost p-2" title="Edit guardian">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost p-2 text-error-400 hover:text-error-300" title="Remove guardian">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-neutral-700 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-400">Added:</span>
                      <p className="text-white">{guardian.addedAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400">Last Active:</span>
                      <p className="text-white">
                        {guardian.lastActive ? guardian.lastActive.toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recovery Threshold Setting */}
            <div className="card p-6">
              <h4 className="text-lg font-bold text-white mb-4">Recovery Threshold</h4>
              <p className="text-neutral-300 text-sm mb-4">
                Choose how many guardians must approve a recovery request
              </p>
              
              <div className="space-y-3">
                {Array.from({ length: guardians.length - 1 }, (_, i) => i + 2).map(num => (
                  <button
                    key={num}
                    onClick={() => setThreshold(num)}
                    className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                      threshold === num
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{num} of {guardians.length} guardians</span>
                      <span className="text-sm">
                        {num === 2 ? 'More convenient' : num === guardians.length ? 'Most secure' : 'Balanced'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recovery Tab */}
        {activeTab === 'recovery' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Recovery Requests</h3>
              <button className="btn-primary">
                Initiate Recovery
              </button>
            </div>

            {recoveryRequests.length === 0 ? (
              <div className="card p-12 text-center space-y-4">
                <Shield className="h-16 w-16 text-neutral-600 mx-auto" />
                <h4 className="text-xl font-bold text-white">No Recovery Requests</h4>
                <p className="text-neutral-400">
                  You don&apos;t have any active recovery requests at the moment.
                </p>
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
                      </div>
                      
                      <button className="btn-ghost flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </div>

                    <div className="space-y-3">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Recovery History</h3>
            
            <div className="space-y-4">
              {[
                {
                  type: 'guardian_help',
                  title: 'Helped Sarah Chen recover wallet',
                  date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                  status: 'completed'
                },
                {
                  type: 'guardian_added',
                  title: 'Charlie Wilson added as guardian',
                  date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  status: 'completed'
                },
                {
                  type: 'setup_completed',
                  title: 'Guardian recovery setup completed',
                  date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
                  status: 'completed'
                }
              ].map((event, index) => (
                <div key={index} className="card p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    {event.type === 'guardian_help' && <Shield className="h-5 w-5 text-primary-400" />}
                    {event.type === 'guardian_added' && <Users className="h-5 w-5 text-primary-400" />}
                    {event.type === 'setup_completed' && <CheckCircle className="h-5 w-5 text-primary-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{event.title}</p>
                    <p className="text-neutral-400 text-sm">{event.date.toLocaleDateString()}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-success-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}