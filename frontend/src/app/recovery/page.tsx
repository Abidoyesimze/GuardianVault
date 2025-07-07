'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from '@starknet-react/core';
import { toast } from 'react-toastify';
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
  Wallet,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Upload,
  QrCode,
  Link,
  Edit
} from 'lucide-react';
import { 
  useInitiateRecovery, 
  useRecoveryRequest, 
  useApprovalCount, 
  useGuardianRoot, 
  useThreshold,
  useFinalizeRecovery 
} from '../../../lib/hooks/useRecoveryContract';
import { RecoveryStatus } from '../../../types/recovery';
import { 
  getGuardianInfo, 
  importGuardianBackup, 
  parseRecoveryLink,
  validateBackupData,
  type BackupData,
  type WalletGuardians
} from '../../../lib/utils/guardianStorage';

type PageStep = 'connect' | 'search' | 'restore-options' | 'manual-entry' | 'initiate' | 'progress' | 'complete' | 'no-setup'

type Guardian = {
  name?: string
  address: string
  hasApproved: boolean
  approvedAt?: Date
}

type Recovery = {
  oldWalletAddress: string
  newWalletAddress: string
  requiredApprovals: number
  currentApprovals: number
  status: RecoveryStatus
  createdAt: Date
  guardians: Guardian[]
  timeRemaining?: string
}

// Type for guardian data in the proceedWithGuardianInfo function
interface GuardianData {
  guardians: Array<{ name?: string; address: string }>
  threshold: number
}

export default function RecoveryPage() {
  const { address, isConnected } = useAccount()
  const [oldWalletAddress, setOldWalletAddress] = useState('')
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const [currentStep, setCurrentStep] = useState<PageStep>('connect')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  
  // Restore-related state
  const [isProcessing, setIsProcessing] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Manual entry state
  const [manualGuardians, setManualGuardians] = useState<Array<{ name: string; address: string }>>([
    { name: '', address: '' }
  ])

  // Contract hooks for the old wallet we're trying to recover
  const { recoveryRequest, isLoading: recoveryLoading, refetch: refetchRecovery } = useRecoveryRequest(oldWalletAddress || undefined)
  const { guardianRoot, isLoading: guardianRootLoading } = useGuardianRoot(oldWalletAddress || undefined)
  const { threshold, isLoading: thresholdLoading } = useThreshold(oldWalletAddress || undefined)
  const { approvalCount } = useApprovalCount(oldWalletAddress || undefined)

  // Action hooks
  const { initiateRecovery, isPending: isInitiating } = useInitiateRecovery()
  const { finalizeRecovery, isPending: isFinalizing } = useFinalizeRecovery()

  useEffect(() => {
    if (isConnected && currentStep === 'connect') {
      setCurrentStep('search')
    }
  }, [isConnected, currentStep])

  // Monitor recovery progress when we have a recovery in progress
  useEffect(() => {
    if (recovery && currentStep === 'progress' && approvalCount !== undefined) {
      const updatedRecovery = { 
        ...recovery, 
        currentApprovals: approvalCount,
        status: recoveryRequest?.status || recovery.status
      }
      
      // Check if threshold is met
      if (approvalCount >= recovery.requiredApprovals && recoveryRequest?.status === RecoveryStatus.Approved) {
        updatedRecovery.status = RecoveryStatus.Approved
        toast.success('🎉 Recovery approved! You can now finalize the recovery.', {
          position: "top-right",
          autoClose: 5000,
        })
      }
      
      setRecovery(updatedRecovery)
    }
  }, [approvalCount, recoveryRequest, recovery, currentStep])

  const validateStarkNetAddress = (addr: string): boolean => {
    return addr.startsWith('0x') && addr.length >= 60 && addr.length <= 66
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

  const proceedWithGuardianInfo = (guardianInfo: WalletGuardians | BackupData | GuardianData) => {
    const guardians: Guardian[] = guardianInfo.guardians.map((g: { name?: string; address: string }) => ({
      name: g.name,
      address: g.address,
      hasApproved: false,
      approvedAt: undefined
    }))

    // Check for existing recovery request
    if (recoveryRequest && recoveryRequest.status !== RecoveryStatus.None) {
      const recoveryData: Recovery = {
        oldWalletAddress,
        newWalletAddress: recoveryRequest.new_wallet,
        requiredApprovals: threshold || guardianInfo.threshold,
        currentApprovals: recoveryRequest.approvals,
        status: recoveryRequest.status,
        createdAt: new Date(recoveryRequest.timestamp * 1000),
        guardians,
        timeRemaining: formatTimeRemaining(recoveryRequest.timestamp)
      }
      
      setRecovery(recoveryData)
      setCurrentStep('progress')
    } else {
      // No existing recovery request
      const recoveryData: Recovery = {
        oldWalletAddress,
        newWalletAddress: address!,
        requiredApprovals: threshold || guardianInfo.threshold,
        currentApprovals: 0,
        status: RecoveryStatus.None,
        createdAt: new Date(),
        guardians
      }
      
      setRecovery(recoveryData)
      setCurrentStep('initiate')
    }
    
    toast.success('✅ Guardian configuration loaded successfully!')
  }

  const searchForRecovery = async () => {
    if (!oldWalletAddress || !isConnected || !address) return

    setIsLoading(true)
    setError(null)
    
    try {
      // Wait for contract data to load
      let retries = 0
      while ((guardianRootLoading || thresholdLoading) && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        retries++
      }

      // Check if guardian root exists (wallet has guardian setup)
      if (!guardianRoot || guardianRoot === '0' || guardianRoot === '0x0') {
        setCurrentStep('no-setup')
        setError('No guardian setup found for this wallet address.')
        return
      }

      if (!threshold || threshold === 0) {
        setCurrentStep('no-setup')
        setError('Guardian configuration incomplete for this wallet.')
        return
      }

      // First try local storage
      const guardianInfo = getGuardianInfo(oldWalletAddress)
      
      if (guardianInfo && guardianInfo.guardians.length >= threshold) {
        // Local storage success - proceed normally
        proceedWithGuardianInfo(guardianInfo)
        return
      }

      // Local storage failed - show restore options
      setCurrentStep('restore-options')
      toast.info('💾 Local guardian data not found. Please restore from backup.', {
        position: "top-right",
        autoClose: 5000,
      })

    } catch {
      const errorMessage = 'Failed to find recovery setup. Please check the wallet address.'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // File restore
  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    
    try {
      const content = await file.text()
      const guardianData = JSON.parse(content) as BackupData
      
      // Validate backup file format
      const validation = validateBackupData(guardianData)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid backup file format')
      }

      // Verify against on-chain data
      if (guardianData.merkleRoot !== guardianRoot) {
        throw new Error('Backup file does not match on-chain guardian configuration')
      }

      // Import and proceed
      const success = importGuardianBackup(guardianData)
      if (success) {
        proceedWithGuardianInfo(guardianData)
        toast.success('🎉 Guardian data restored from file!')
      } else {
        throw new Error('Failed to import backup data')
      }
    } catch (error) {
      toast.error(`Failed to restore from file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // QR code restore (simplified - in production use a proper QR scanner)
  const handleQRRestore = async () => {
    setIsProcessing(true)
    
    try {
      // In production, use a QR scanner library
      const qrData = prompt('Paste the QR code data or recovery link:')
      if (!qrData) return

      await handleLinkRestore(qrData)
    } finally {
      setIsProcessing(false)
    }
  }

  // Recovery link restore
  const handleLinkRestore = async (linkData?: string) => {
    const data = linkData || linkInput
    if (!data) return

    setIsProcessing(true)
    
    try {
      let guardianData: BackupData | null = null

      if (data.includes('/recovery/restore?data=')) {
        // Parse from URL
        guardianData = parseRecoveryLink(data)
        if (!guardianData) throw new Error('Invalid recovery link format')
      } else {
        // Direct encrypted data
        try {
          const decodedData = atob(data)
          guardianData = JSON.parse(decodedData) as BackupData
        } catch {
          throw new Error('Invalid recovery data format')
        }
      }
      
      // Validate and verify
      const validation = validateBackupData(guardianData)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid recovery data')
      }

      if (guardianData.merkleRoot !== guardianRoot) {
        throw new Error('Recovery data does not match on-chain configuration')
      }

      // Import and proceed
      const success = importGuardianBackup(guardianData)
      if (success) {
        proceedWithGuardianInfo(guardianData)
        toast.success('🎉 Guardian data restored from recovery link!')
      } else {
        throw new Error('Failed to import recovery data')
      }
    } catch (error) {
      toast.error(`Failed to restore from link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      setLinkInput('')
    }
  }

  // Manual guardian entry
  const addManualGuardian = () => {
    setManualGuardians([...manualGuardians, { name: '', address: '' }])
  }

  const removeManualGuardian = (index: number) => {
    if (manualGuardians.length > 1) {
      setManualGuardians(manualGuardians.filter((_, i) => i !== index))
    }
  }

  const updateManualGuardian = (index: number, field: 'name' | 'address', value: string) => {
    const updated = manualGuardians.map((guardian, i) => 
      i === index ? { ...guardian, [field]: value } : guardian
    )
    setManualGuardians(updated)
  }

  const confirmManualEntry = () => {
    const validGuardians = manualGuardians.filter(g => 
      g.address && validateStarkNetAddress(g.address)
    )

    if (validGuardians.length < (threshold || 1)) {
      toast.error(`Need at least ${threshold} valid guardian addresses`)
      return
    }

    // Create guardian data structure - exactly matching BackupData interface
    const guardianData: BackupData = {
      version: '1.0',
      type: 'guardian-backup' as const,  // Ensure exact type match
      walletAddress: oldWalletAddress,
      guardians: validGuardians.map(g => ({
        address: g.address,
        name: g.name || 'Unnamed Guardian'
      })),
      merkleRoot: guardianRoot!,
      threshold: threshold || validGuardians.length,
      createdAt: new Date().toISOString()
    }

    // Debug logging
    console.log('Manual guardian data being imported:', guardianData)
    console.log('Guardian data type:', guardianData.type)
    console.log('Guardian data structure:', JSON.stringify(guardianData, null, 2))

    // Import and proceed
    const success = importGuardianBackup(guardianData)
    if (success) {
      proceedWithGuardianInfo(guardianData)
      toast.success('Guardian information saved and verified!')
    } else {
      toast.error('Failed to save guardian information')
    }
  }

  const handleInitiateRecovery = async () => {
    if (!recovery || !oldWalletAddress || !address) return

    try {
      const result = await initiateRecovery(oldWalletAddress, address)
      
      if (result.success) {
        const updatedRecovery = {
          ...recovery,
          status: RecoveryStatus.Pending,
          timeRemaining: formatTimeRemaining(Math.floor(Date.now() / 1000))
        }
        setRecovery(updatedRecovery)
        setCurrentStep('progress')
        
        toast.success('🚀 Recovery initiated successfully! Guardians can now approve your request.', {
          position: "top-right",
          autoClose: 5000,
        })

        // Refresh contract data after a delay
        setTimeout(() => {
          refetchRecovery()
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to initiate recovery')
      }
    } catch (_error) {
      const errorMessage = _error instanceof Error ? _error.message : 'Failed to initiate recovery. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const handleFinalizeRecovery = async () => {
    if (!recovery || !oldWalletAddress) return

    try {
      const result = await finalizeRecovery(oldWalletAddress)
      
      if (result.success) {
        const updatedRecovery = {
          ...recovery,
          status: RecoveryStatus.Completed
        }
        setRecovery(updatedRecovery)
        setCurrentStep('complete')
        
        toast.success('🎉 Recovery finalized successfully! Your wallet has been recovered.', {
          position: "top-right",
          autoClose: 5000,
        })
      } else {
        throw new Error(result.error || 'Failed to finalize recovery')
      }
    } catch (_error) {
      const errorMessage = _error instanceof Error ? _error.message : 'Failed to finalize recovery. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const copyGuardianLink = async () => {
    if (!oldWalletAddress) return
    
    const guardianLink = `${window.location.origin}/guardian?wallet=${oldWalletAddress}`
    await navigator.clipboard.writeText(guardianLink)
    setCopied(true)
    toast.success('📋 Guardian link copied to clipboard!', {
      position: "top-right",
      autoClose: 2000,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshStatus = async () => {
    if (recovery && oldWalletAddress) {
      toast.info('🔄 Refreshing recovery status...', {
        position: "top-right",
        autoClose: 2000,
      })
      
      try {
        await refetchRecovery()
      } catch {
        // Silent fail for refresh
      }
    }
  }

  const getStatusIcon = (status: RecoveryStatus) => {
    switch (status) {
      case RecoveryStatus.Pending: return <Clock className="h-5 w-5 text-warning-400" />
      case RecoveryStatus.Approved: return <CheckCircle className="h-5 w-5 text-success-400" />
      case RecoveryStatus.Completed: return <CheckCircle className="h-5 w-5 text-success-400" />
      case RecoveryStatus.Expired: return <AlertCircle className="h-5 w-5 text-error-400" />
      default: return <RefreshCw className="h-5 w-5" />
    }
  }

  // Privacy Info Component
  const PrivacyExplanation = () => (
    <div className="card p-6 bg-blue-500/5 border-blue-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Lock className="h-5 w-5 text-blue-400" />
          <h3 className="text-blue-400 font-semibold">🔒 Privacy-First Design</h3>
        </div>
        <button 
          onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
          className="text-blue-400 hover:text-blue-300"
        >
          {showPrivacyDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      
      {showPrivacyDetails ? (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-white font-medium mb-2">What&apos;s Stored On-Chain</h4>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Cryptographic hash (Merkle root) of guardian addresses</li>
                <li>• Recovery threshold (number of approvals needed)</li>
                <li>• Recovery request status and timing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-2">What&apos;s NOT Stored On-Chain</h4>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Individual guardian addresses</li>
                <li>• Guardian names or identities</li>
                <li>• Personal information</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              <strong>How recovery works:</strong> Guardian information is stored locally in your browser 
              and can be backed up using multiple methods. When you lose access, you can restore your 
              guardian information and initiate recovery.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-blue-300 text-sm">
          Guardian addresses are not stored on-chain for privacy protection. 
          Use backup methods to restore guardian information for recovery.
        </p>
      )}
    </div>
  )

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

      {/* Error Banner */}
      {error && (
        <div className="card p-4 bg-error-500/10 border border-error-500/20 animate-slide-down">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-error-400" />
            <p className="text-error-400 flex-1 whitespace-pre-line">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-error-400 hover:text-error-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

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

          {/* Privacy Info */}
          <PrivacyExplanation />

          {/* Info Card */}
          <div className="card p-6 bg-green-500/5 border-green-500/20">
            <h3 className="text-green-400 font-semibold mb-3">What We&apos;re Looking For</h3>
            <ul className="text-green-300 text-sm space-y-2">
              <li>• Existing guardian configuration (Merkle root) for this wallet</li>
              <li>• Recovery threshold settings (how many approvals needed)</li>
              <li>• Any existing recovery requests in progress</li>
            </ul>
          </div>
        </div>
      )}

      {/* Restore Options Step */}
      {currentStep === 'restore-options' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <RefreshCw className="h-16 w-16 text-primary-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Restore Guardian Data</h2>
            <p className="text-neutral-300">
              Choose how you&apos;d like to restore your guardian information
            </p>
          </div>

          {/* Contract Info */}
          <div className="card p-6 bg-blue-500/5 border-blue-500/20">
            <h3 className="text-blue-400 font-semibold mb-3">✅ Found On-Chain Setup</h3>
            <div className="text-blue-300 text-sm space-y-1">
              <p>• Guardian Merkle Root: {guardianRoot?.slice(0, 20)}...</p>
              <p>• Required Approvals: {threshold}</p>
              <p>• Wallet: {oldWalletAddress.slice(0, 10)}...{oldWalletAddress.slice(-10)}</p>
            </div>
          </div>

          {/* Restore Methods */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* File Upload */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Upload className="h-6 w-6 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Upload Backup File</h3>
              </div>
              <p className="text-neutral-300 text-sm">
                Upload your guardian backup JSON file to restore your configuration.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn-primary w-full"
              >
                {isProcessing ? 'Processing...' : 'Choose File'}
              </button>
            </div>

            {/* QR Code Scanner */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <QrCode className="h-6 w-6 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Scan QR Code</h3>
              </div>
              <p className="text-neutral-300 text-sm">
                Scan the QR code from your guardian backup to restore access.
              </p>
              <button
                onClick={handleQRRestore}
                disabled={isProcessing}
                className="btn-primary w-full"
              >
                {isProcessing ? 'Processing...' : 'Scan QR Code'}
              </button>
            </div>

            {/* Recovery Link */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Link className="h-6 w-6 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Recovery Link</h3>
              </div>
              <p className="text-neutral-300 text-sm">
                Paste your recovery link or encrypted guardian data.
              </p>
              <div className="space-y-2">
                <textarea
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="Paste recovery link or encrypted data here..."
                  className="input-field w-full h-20 resize-none"
                />
                <button
                  onClick={() => handleLinkRestore()}
                  disabled={!linkInput || isProcessing}
                  className="btn-primary w-full"
                >
                  {isProcessing ? 'Processing...' : 'Restore from Link'}
                </button>
              </div>
            </div>

            {/* Manual Entry (Last Resort) */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Edit className="h-6 w-6 text-warning-400" />
                <h3 className="text-lg font-semibold text-white">Manual Entry</h3>
              </div>
              <p className="text-neutral-300 text-sm">
                Enter guardian addresses manually if you don&apos;t have backup files.
              </p>
              <button
                onClick={() => setCurrentStep('manual-entry')}
                className="btn-secondary w-full"
              >
                Enter Manually
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div className="card p-6 bg-purple-500/5 border-purple-500/20">
            <h3 className="text-purple-400 font-semibold mb-3">💡 Don&apos;t Have Backup Data?</h3>
            <ul className="text-purple-300 text-sm space-y-2">
              <li>• Check your downloads folder for guardian backup files</li>
              <li>• Look for saved QR codes or recovery links in your notes</li>
              <li>• Contact your guardians - they might have recovery information</li>
              <li>• Check if you saved backup data in cloud storage or password manager</li>
            </ul>
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={() => {
                setCurrentStep('search')
                setOldWalletAddress('')
                setError(null)
              }}
              className="btn-ghost"
            >
              ← Try Different Wallet
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Step */}
      {currentStep === 'manual-entry' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <Edit className="h-16 w-16 text-warning-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Enter Guardian Addresses</h2>
            <p className="text-neutral-300">
              Enter your guardian addresses manually. You need at least {threshold} guardians.
            </p>
          </div>

          <div className="card p-6 space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Manual Entry</h4>
              <p className="text-yellow-300 text-sm">
                Only use this method if you don&apos;t have backup files. Make sure the addresses are correct 
                as they need to match your original guardian setup exactly.
              </p>
            </div>

            <div className="space-y-4">
              {manualGuardians.map((guardian, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-white font-medium">Guardian {index + 1}</label>
                    {manualGuardians.length > 1 && (
                      <button
                        onClick={() => removeManualGuardian(index)}
                        className="text-error-400 hover:text-error-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Guardian name (optional)"
                    value={guardian.name}
                    onChange={(e) => updateManualGuardian(index, 'name', e.target.value)}
                    className="input-field w-full"
                  />
                  <input
                    type="text"
                    placeholder="0x... Guardian address"
                    value={guardian.address}
                    onChange={(e) => updateManualGuardian(index, 'address', e.target.value)}
                    className="input-field w-full"
                  />
                  {guardian.address && !validateStarkNetAddress(guardian.address) && (
                    <p className="text-error-400 text-sm">Invalid StarkNet address format</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={addManualGuardian}
                className="btn-secondary"
              >
                Add Guardian
              </button>
              <span className="text-neutral-400 text-sm self-center">
                {manualGuardians.filter(g => g.address && validateStarkNetAddress(g.address)).length} / {threshold} minimum
              </span>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentStep('restore-options')}
                className="btn-ghost flex-1"
              >
                ← Back
              </button>
              <button
                onClick={confirmManualEntry}
                disabled={manualGuardians.filter(g => g.address && validateStarkNetAddress(g.address)).length < (threshold || 1)}
                className="btn-primary flex-1"
              >
                Confirm Guardians
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Setup Found */}
      {currentStep === 'no-setup' && (
        <div className="max-w-2xl mx-auto animate-scale-in space-y-6">
          <div className="card p-12 text-center space-y-8">
            <div className="space-y-4">
              <AlertTriangle className="h-16 w-16 text-warning-500 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Guardian Setup Issue</h2>
              <p className="text-neutral-300 max-w-md mx-auto">
                Unable to find guardian recovery setup for this wallet.
              </p>
            </div>
            <div className="space-y-4">
              <div className="status-warning p-4 rounded-lg">
                <p className="text-warning-400 whitespace-pre-line">
                  {error}
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentStep('search')
                  setOldWalletAddress('')
                  setError(null)
                }}
                className="btn-secondary"
              >
                Try Another Wallet
              </button>
            </div>
          </div>
          
          {/* Privacy Info */}
          <PrivacyExplanation />
        </div>
      )}

      {/* Initiate Recovery Step */}
      {currentStep === 'initiate' && recovery && (
        <div className="max-w-2xl mx-auto space-y-8 animate-scale-in">
          <div className="text-center space-y-4">
            <Shield className="h-16 w-16 text-success-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Recovery Setup Found!</h2>
            <p className="text-neutral-300">
              Guardian information restored successfully. Review and initiate recovery.
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
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <span className="text-success-400 text-sm">Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="card p-6 bg-yellow-500/5 border-yellow-500/20">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-400 font-medium">Recovery Process</p>
                  <p className="text-yellow-300 text-sm">
                    This will start a 24-hour recovery window. Your guardians will need to approve this request.
                  </p>
                </div>
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

      {/* Progress Step - keeping existing implementation */}
      {currentStep === 'progress' && recovery && (
        <div className="space-y-8 animate-scale-in">
          {/* Status Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon(recovery.status)}
              <h2 className="text-2xl font-bold text-white">
                {recovery.status === RecoveryStatus.Approved ? 'Recovery Approved!' : 'Recovery In Progress'}
              </h2>
            </div>
            <p className="text-neutral-300">
              {recovery.status === RecoveryStatus.Approved 
                ? 'Your recovery has been approved by guardians. You can now finalize it.'
                : 'Waiting for guardian approvals to complete your wallet recovery'
              }
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
                      style={{ width: `${Math.min((recovery.currentApprovals / recovery.requiredApprovals) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <span className="text-success-400">Recovery Initiated</span>
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    recovery.status === RecoveryStatus.Approved 
                      ? 'bg-success-500/10 border border-success-500/20' 
                      : 'bg-warning-500/10 border border-warning-500/20'
                  }`}>
                    <span className={recovery.status === RecoveryStatus.Approved ? 'text-success-400' : 'text-warning-400'}>
                      Guardian Approvals
                    </span>
                    {recovery.status === RecoveryStatus.Approved ? (
                      <CheckCircle className="h-5 w-5 text-success-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-warning-500" />
                    )}
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    recovery.status === RecoveryStatus.Completed 
                      ? 'bg-success-500/10 border border-success-500/20' 
                      : 'bg-neutral-800/50 border border-neutral-700/50'
                  }`}>
                    <span className={recovery.status === RecoveryStatus.Completed ? 'text-success-400' : 'text-neutral-400'}>
                      Wallet Transfer
                    </span>
                    {recovery.status === RecoveryStatus.Completed ? (
                      <CheckCircle className="h-5 w-5 text-success-500" />
                    ) : (
                      <div className="w-2 h-2 bg-neutral-600 rounded-full"></div>
                    )}
                  </div>
                </div>

                {recovery.timeRemaining && recovery.status === RecoveryStatus.Pending && (
                  <div className="mt-6 pt-4 border-t border-neutral-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Time remaining</span>
                      <span className="text-primary-400">{recovery.timeRemaining}</span>
                    </div>
                  </div>
                )}

                {/* Finalize Button */}
                {recovery.status === RecoveryStatus.Approved && (
                  <button
                    onClick={handleFinalizeRecovery}
                    disabled={isFinalizing}
                    className="btn-success w-full mt-6"
                  >
                    {isFinalizing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Finalizing...
                      </>
                    ) : (
                      'Finalize Recovery'
                    )}
                  </button>
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
                    onClick={copyGuardianLink}
                    className={`btn-secondary flex-1 flex items-center justify-center space-x-2 ${
                      copied ? 'text-success-400' : ''
                    }`}
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copied ? 'Copied!' : 'Copy Guardian Link'}</span>
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
                        {index < recovery.currentApprovals ? (
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
                  <li>• Once {recovery.requiredApprovals} guardians approve, you can finalize recovery</li>
                  <li>• Your old wallet access will be transferred to your new wallet</li>
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
              disabled={recoveryLoading}
            >
              <RefreshCw className={`h-4 w-4 ${recoveryLoading ? 'animate-spin' : ''}`} />
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