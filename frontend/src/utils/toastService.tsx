import { toast, ToastOptions } from 'react-toastify'

// Type for error objects that can occur in promises
type ToastError = Error | string | { message: string } | unknown

// Default toast configuration
const defaultToastOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
}

// GuardianVault specific toast messages
export const toastService = {
  // Wallet connection related
  walletRequired: (action?: string) => {
    toast.warning(`🔐 Connect your wallet${action ? ` to ${action}` : ''}`, {
      ...defaultToastOptions,
      autoClose: 5000,
    })
  },

  walletConnected: (walletName?: string) => {
    toast.success(`🎉 Successfully connected${walletName ? ` with ${walletName}` : ''}!`, {
      ...defaultToastOptions,
      autoClose: 3000,
    })
  },

  walletDisconnected: () => {
    toast.info('👋 Wallet disconnected', {
      ...defaultToastOptions,
      autoClose: 2000,
    })
  },

  // Guardian setup related
  guardianAdded: (name?: string) => {
    toast.success(`✅ Guardian${name ? ` ${name}` : ''} added successfully`, {
      ...defaultToastOptions,
    })
  },

  guardianRemoved: (name?: string) => {
    toast.info(`🗑️ Guardian${name ? ` ${name}` : ''} removed`, {
      ...defaultToastOptions,
    })
  },

  setupComplete: () => {
    toast.success('🎉 Guardian setup completed! Your wallet is now protected.', {
      ...defaultToastOptions,
      autoClose: 5000,
    })
  },

  // Recovery related
  recoveryInitiated: () => {
    toast.info('🔄 Recovery request initiated. Notifying your guardians...', {
      ...defaultToastOptions,
      autoClose: 5000,
    })
  },

  recoveryApproved: (guardianName?: string) => {
    toast.success(`✅ Recovery approved${guardianName ? ` by ${guardianName}` : ''}`, {
      ...defaultToastOptions,
    })
  },

  recoveryComplete: () => {
    toast.success('🎉 Wallet recovery completed! You now have access to your funds.', {
      ...defaultToastOptions,
      autoClose: 6000,
    })
  },

  // Error messages
  addressInvalid: () => {
    toast.error('❌ Invalid StarkNet address format', {
      ...defaultToastOptions,
    })
  },

  transactionFailed: (reason?: string) => {
    toast.error(`❌ Transaction failed${reason ? `: ${reason}` : ''}`, {
      ...defaultToastOptions,
      autoClose: 6000,
    })
  },

  networkError: () => {
    toast.error('🌐 Network error. Please check your connection and try again.', {
      ...defaultToastOptions,
      autoClose: 5000,
    })
  },

  // Success messages
  addressCopied: () => {
    toast.success('📋 Address copied to clipboard', {
      ...defaultToastOptions,
      autoClose: 2000,
    })
  },

  linkCopied: () => {
    toast.success('🔗 Link copied to clipboard', {
      ...defaultToastOptions,
      autoClose: 2000,
    })
  },

  // Custom toast with custom options
  custom: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options?: Partial<ToastOptions>) => {
    const toastMethod = toast[type]
    toastMethod(message, {
      ...defaultToastOptions,
      ...options,
    })
  },

  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      pending: string
      success: string | { render: (data: T) => string }
      error: string | { render: (error: ToastError) => string }
    }
  ) => {
    const formattedMessages = {
      pending: messages.pending,
      success: typeof messages.success === 'string' 
        ? messages.success 
        : { render: (data: unknown) => (messages.success as { render: (data: T) => string }).render(data as T) },
      error: typeof messages.error === 'string' 
        ? messages.error 
        : { render: (error: unknown) => (messages.error as { render: (error: ToastError) => string }).render(error as ToastError) },
    }
    return toast.promise(promise, formattedMessages, {
      ...defaultToastOptions,
    })
  },
}


export function useToast() {
  return toastService
}