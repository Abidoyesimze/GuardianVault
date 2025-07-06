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
  }
  
  // Storage key prefix
  const STORAGE_PREFIX = 'zk_guardians_'
  
  /**
   * Store guardian information for a wallet (used during setup)
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
        setupAt: Date.now()
      }
      
      const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
      localStorage.setItem(key, JSON.stringify(guardianInfo))
    } catch {
      // Silent fail for storage operations
    }
  }
  
  /**
   * Retrieve guardian information for a wallet
   */
  export function getGuardianInfo(walletAddress: string): WalletGuardians | null {
    try {
      const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      
      if (!stored) {
        return null
      }
      
      const guardianInfo: WalletGuardians = JSON.parse(stored)
      return guardianInfo
    } catch {
      return null
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
      const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`
      localStorage.removeItem(key)
    } catch {
      // Silent fail for storage operations
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