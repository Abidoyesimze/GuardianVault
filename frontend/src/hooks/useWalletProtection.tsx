import { useAccount } from '@starknet-react/core'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

interface UseWalletProtectionOptions {
  redirectTo?: string
  showToast?: boolean
  customMessage?: string
}

export function useWalletProtection(options: UseWalletProtectionOptions = {}) {
  const { isConnected } = useAccount()
  const router = useRouter()
  
  const {
    redirectTo = '/',
    showToast = true,
    customMessage
  } = options

  const requireWallet = (action: () => void, actionName?: string) => {
    if (!isConnected) {
      if (showToast) {
        const message = customMessage || `🔐 Connect your wallet to ${actionName || 'continue'}`
        toast.warning(message, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
      return false
    }
    
    action()
    return true
  }

  const requireWalletForNavigation = (path: string, actionName?: string) => {
    return requireWallet(() => router.push(path), actionName)
  }

  const requireWalletOrRedirect = (action: () => void, actionName?: string) => {
    if (!isConnected) {
      if (showToast) {
        const message = customMessage || `🔐 Connect your wallet to ${actionName || 'continue'}`
        toast.warning(message, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
      
      // Redirect after a short delay to allow toast to show
      setTimeout(() => {
        router.push(redirectTo)
      }, 1000)
      
      return false
    }
    
    action()
    return true
  }

  const checkWalletConnection = () => isConnected

  return {
    isConnected,
    requireWallet,
    requireWalletForNavigation,
    requireWalletOrRedirect,
    checkWalletConnection,
  }
}