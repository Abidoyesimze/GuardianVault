// lib/utils/guardianStorage.ts

export interface GuardianInfo {
  address: string
  name?: string
  addedAt: number
}

export interface WalletGuardians {
  walletAddress: string
  guardians: GuardianInfo[]
  threshold: number
  merkleRoot: string
  setupAt: number
  version: string
  backupMethods?: {
    file?: boolean
    qr?: boolean
    link?: boolean
    completedAt?: number
  }
}

export interface BackupData {
  version: string
  type: 'guardian-backup'
  walletAddress: string
  guardians: Array<{ address: string; name?: string }>
  merkleRoot: string
  threshold: number
  createdAt: string
  exportedAt?: string
}

// Additional type definitions for better type safety
interface RawGuardianData {
  address: string
  name?: string
  addedAt?: number
}

interface LegacyGuardianData {
  guardians?: RawGuardianData[]
  threshold?: number
  merkleRoot?: string
  setupAt?: number
  version?: string
  walletAddress?: string
}

type GuardianDataInput = BackupData | WalletGuardians | LegacyGuardianData

// Storage key prefix - using consistent prefix
const STORAGE_PREFIX = 'zk_guardians_'

/**
 * Store guardian information for a wallet (primary setup function)
 */
export function storeGuardianInfo(
  walletAddress: string,
  guardians: Array<{ address: string; name?: string }>,
  threshold: number,
  merkleRoot: string
): void {
  try {
    const guardianInfo: WalletGuardians = {
      walletAddress,
      guardians: guardians.map(g => ({
        address: g.address,
        name: g.name,
        addedAt: Date.now()
      })),
      threshold,
      merkleRoot,
      setupAt: Date.now(),
      version: '1.0'
    }
    
    const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(guardianInfo))
  } catch (error) {
    console.error('Failed to store guardian info:', error)
  }
}

/**
 * Enhanced save function with backup tracking
 */
export function saveGuardianInfo(
  walletAddress: string, 
  guardianData: GuardianDataInput
): void {
  try {
    let normalizedData: WalletGuardians

    // Handle different data formats for backward compatibility
    if ('type' in guardianData && guardianData.type === 'guardian-backup') {
      // Converting from backup format
      const backupData = guardianData as BackupData
      normalizedData = {
        walletAddress: backupData.walletAddress,
        guardians: backupData.guardians.map((g: { address: string; name?: string }) => ({
          address: g.address,
          name: g.name,
          addedAt: Date.now()
        })),
        threshold: backupData.threshold,
        merkleRoot: backupData.merkleRoot,
        setupAt: new Date(backupData.createdAt).getTime(),
        version: backupData.version || '1.0'
      }
    } else if ('walletAddress' in guardianData && guardianData.walletAddress) {
      // Already in WalletGuardians format
      const walletData = guardianData as WalletGuardians
      normalizedData = {
        ...walletData,
        version: walletData.version || '1.0'
      }
    } else {
      // Legacy format conversion
      const legacyData = guardianData as LegacyGuardianData
      normalizedData = {
        walletAddress,
        guardians: (legacyData.guardians || []).map((g: RawGuardianData) => ({
          address: g.address,
          name: g.name,
          addedAt: g.addedAt || Date.now()
        })),
        threshold: legacyData.threshold || 0,
        merkleRoot: legacyData.merkleRoot || '',
        setupAt: legacyData.setupAt || Date.now(),
        version: legacyData.version || '1.0'
      }
    }
    
    const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(normalizedData))
  } catch (error) {
    console.error('Failed to save guardian info:', error)
  }
}

/**
 * Retrieve guardian information for a wallet
 */
export function getGuardianInfo(walletAddress: string): WalletGuardians | null {
  try {
    // Try new storage key first
    let key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
    let stored = localStorage.getItem(key)
    
    // Fallback to old storage key for backward compatibility
    if (!stored) {
      key = `guardians_${walletAddress.toLowerCase()}`
      stored = localStorage.getItem(key)
      
      if (stored) {
        // Migrate old data to new format
        const oldData = JSON.parse(stored) as LegacyGuardianData
        const migratedData: WalletGuardians = {
          walletAddress,
          guardians: (oldData.guardians || []).map((g: RawGuardianData) => ({
            address: g.address,
            name: g.name,
            addedAt: g.addedAt || Date.now()
          })),
          threshold: oldData.threshold || 0,
          merkleRoot: oldData.merkleRoot || '',
          setupAt: oldData.setupAt || Date.now(),
          version: '1.0'
        }
        
        // Save in new format and remove old key
        saveGuardianInfo(walletAddress, migratedData)
        localStorage.removeItem(key)
        
        return migratedData
      }
    }
    
    if (!stored) return null
    
    const guardianInfo: WalletGuardians = JSON.parse(stored)
    
    // Ensure version field exists
    if (!guardianInfo.version) {
      guardianInfo.version = '1.0'
      saveGuardianInfo(walletAddress, guardianInfo)
    }
    
    return guardianInfo
  } catch (error) {
    console.error('Failed to get guardian info:', error)
    return null
  }
}

/**
 * Update backup method completion status
 */
export function updateBackupStatus(
  walletAddress: string,
  method: 'file' | 'qr' | 'link',
  completed: boolean = true
): void {
  try {
    const guardianInfo = getGuardianInfo(walletAddress)
    if (!guardianInfo) return
    
    if (!guardianInfo.backupMethods) {
      guardianInfo.backupMethods = {}
    }
    
    guardianInfo.backupMethods[method] = completed
    
    if (completed && !guardianInfo.backupMethods.completedAt) {
      guardianInfo.backupMethods.completedAt = Date.now()
    }
    
    saveGuardianInfo(walletAddress, guardianInfo)
  } catch (error) {
    console.error('Failed to update backup status:', error)
  }
}

/**
 * Get backup completion status
 */
export function getBackupStatus(walletAddress: string): {
  file: boolean
  qr: boolean
  link: boolean
  completedCount: number
  hasMinimumBackups: boolean
} {
  try {
    const guardianInfo = getGuardianInfo(walletAddress)
    
    const status = {
      file: guardianInfo?.backupMethods?.file || false,
      qr: guardianInfo?.backupMethods?.qr || false,
      link: guardianInfo?.backupMethods?.link || false
    }
    
    const completedCount = Object.values(status).filter(Boolean).length
    
    return {
      ...status,
      completedCount,
      hasMinimumBackups: completedCount >= 2
    }
  } catch (error) {
    console.error('Failed to get backup status:', error)
    return {
      file: false,
      qr: false,
      link: false,
      completedCount: 0,
      hasMinimumBackups: false
    }
  }
}

/**
 * Get just the guardian addresses for merkle proof generation
 */
export function getGuardianAddresses(walletAddress: string): string[] {
  const guardianInfo = getGuardianInfo(walletAddress)
  if (!guardianInfo) return []
  
  return guardianInfo.guardians.map(g => g.address).sort()
}

/**
 * Check if a connected wallet is a guardian for the given wallet
 */
export function isGuardianForWallet(guardianAddress: string, walletAddress: string): boolean {
  const guardianInfo = getGuardianInfo(walletAddress)
  if (!guardianInfo) return false
  
  return guardianInfo.guardians.some(g => 
    g.address.toLowerCase() === guardianAddress.toLowerCase()
  )
}

/**
 * Get guardian name if available
 */
export function getGuardianName(guardianAddress: string, walletAddress: string): string | null {
  const guardianInfo = getGuardianInfo(walletAddress)
  if (!guardianInfo) return null
  
  const guardian = guardianInfo.guardians.find(g => 
    g.address.toLowerCase() === guardianAddress.toLowerCase()
  )
  
  return guardian?.name || null
}

/**
 * Clear guardian info for a wallet
 */
export function clearGuardianInfo(walletAddress: string): void {
  try {
    const newKey = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
    const oldKey = `guardians_${walletAddress.toLowerCase()}`
    
    localStorage.removeItem(newKey)
    localStorage.removeItem(oldKey) // Also remove legacy key
  } catch (error) {
    console.error('Failed to clear guardian info:', error)
  }
}

/**
 * List all stored wallet guardian info
 */
export function getAllStoredWallets(): WalletGuardians[] {
  const wallets: WalletGuardians[] = []
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key)
        if (stored) {
          try {
            wallets.push(JSON.parse(stored))
          } catch {
            // Skip invalid entries
            continue
          }
        }
      }
    }
  } catch {
    // Return empty array if localStorage access fails
    return []
  }
  
  return wallets
}

/**
 * Export guardian backup data
 */
export function exportGuardianBackup(walletAddress: string): BackupData | null {
  try {
    const guardianInfo = getGuardianInfo(walletAddress)
    if (!guardianInfo) return null
    
    const backupData: BackupData = {
      version: '1.0',
      type: 'guardian-backup',
      walletAddress: guardianInfo.walletAddress,
      guardians: guardianInfo.guardians.map(g => ({
        address: g.address,
        name: g.name
      })),
      merkleRoot: guardianInfo.merkleRoot,
      threshold: guardianInfo.threshold,
      createdAt: new Date(guardianInfo.setupAt).toISOString(),
      exportedAt: new Date().toISOString()
    }
    
    return backupData
  } catch (error) {
    console.error('Failed to export guardian backup:', error)
    return null
  }
}

/**
 * Import guardian backup data
 */
export function importGuardianBackup(backupData: string | BackupData): boolean {
  try {
    let data: BackupData
    
    if (typeof backupData === 'string') {
      data = JSON.parse(backupData)
    } else {
      data = backupData
    }
    
    // Validate backup data
    if (!data.version || !data.walletAddress || !data.guardians || !data.merkleRoot) {
      throw new Error('Invalid backup format')
    }
    
    if (data.type !== 'guardian-backup') {
      throw new Error('Invalid backup type')
    }
    
    // Save the imported data
    saveGuardianInfo(data.walletAddress, data)
    
    return true
  } catch (error) {
    console.error('Failed to import guardian backup:', error)
    return false
  }
}

/**
 * Validate guardian backup data
 */
export function validateBackupData(data: unknown): { isValid: boolean; error?: string } {
  try {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Invalid data format' }
    }
    
    const dataObj = data as Record<string, unknown>
    
    if (!dataObj.version) {
      return { isValid: false, error: 'Missing version information' }
    }
    
    if (!dataObj.walletAddress || typeof dataObj.walletAddress !== 'string') {
      return { isValid: false, error: 'Invalid wallet address' }
    }
    
    if (!Array.isArray(dataObj.guardians) || dataObj.guardians.length === 0) {
      return { isValid: false, error: 'Invalid guardians data' }
    }
    
    if (!dataObj.merkleRoot || typeof dataObj.merkleRoot !== 'string') {
      return { isValid: false, error: 'Invalid merkle root' }
    }
    
    if (!dataObj.threshold || typeof dataObj.threshold !== 'number') {
      return { isValid: false, error: 'Invalid threshold' }
    }
    
    // Validate guardian addresses
    for (const guardian of dataObj.guardians) {
      if (!guardian || typeof guardian !== 'object') {
        return { isValid: false, error: 'Invalid guardian data structure' }
      }
      
      const guardianObj = guardian as Record<string, unknown>
      
      if (!guardianObj.address || typeof guardianObj.address !== 'string') {
        return { isValid: false, error: 'Invalid guardian address format' }
      }
      
      if (!guardianObj.address.startsWith('0x') || guardianObj.address.length < 60) {
        return { isValid: false, error: `Invalid StarkNet address: ${guardianObj.address}` }
      }
    }
    
    return { isValid: true }
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    }
  }
}

/**
 * Generate a shareable recovery link
 */
export function generateRecoveryLink(walletAddress: string): string | null {
  try {
    const backupData = exportGuardianBackup(walletAddress)
    if (!backupData) return null
    
    const encryptedData = btoa(JSON.stringify(backupData))
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    
    return `${baseUrl}/recovery/restore?data=${encodeURIComponent(encryptedData)}`
  } catch (error) {
    console.error('Failed to generate recovery link:', error)
    return null
  }
}

/**
 * Parse recovery link data
 */
export function parseRecoveryLink(url: string): BackupData | null {
  try {
    const urlObj = new URL(url)
    const encryptedData = urlObj.searchParams.get('data')
    
    if (!encryptedData) return null
    
    const decodedData = atob(decodeURIComponent(encryptedData))
    const backupData = JSON.parse(decodedData)
    
    const validation = validateBackupData(backupData)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }
    
    return backupData
  } catch (error) {
    console.error('Failed to parse recovery link:', error)
    return null
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  totalWallets: number
  totalGuardians: number
  storageSize: number
  oldestSetup: number | null
  newestSetup: number | null
} {
  try {
    const wallets = getAllStoredWallets()
    
    const totalGuardians = wallets.reduce((sum, wallet) => sum + wallet.guardians.length, 0)
    const setupTimes = wallets.map(w => w.setupAt).filter(Boolean)
    
    let storageSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith('guardians_')) {
        const value = localStorage.getItem(key)
        if (value) {
          storageSize += key.length + value.length
        }
      }
    }
    
    return {
      totalWallets: wallets.length,
      totalGuardians,
      storageSize,
      oldestSetup: setupTimes.length > 0 ? Math.min(...setupTimes) : null,
      newestSetup: setupTimes.length > 0 ? Math.max(...setupTimes) : null
    }
  } catch (error) {
    console.error('Failed to get storage stats:', error)
    return {
      totalWallets: 0,
      totalGuardians: 0,
      storageSize: 0,
      oldestSetup: null,
      newestSetup: null
    }
  }
}