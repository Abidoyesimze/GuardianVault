'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@starknet-react/core'
import { Wallet } from 'lucide-react'
import { toast } from 'react-toastify'

interface RouteProtectionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  showToast?: boolean
  customMessage?: string
}

export function RouteProtection({ 
  children, 
  fallback,
  redirectTo = '/',
  showToast = true,
  customMessage = "🔐 Please connect your wallet to access this page"
}: RouteProtectionProps) {
  const { isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnected) {
      if (showToast) {
        toast.warning(customMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
      
      // Redirect after a short delay to allow toast to show
      const timer = setTimeout(() => {
        router.push(redirectTo)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isConnected, router, redirectTo, showToast, customMessage])

  if (!isConnected) {
    return fallback || (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="card p-12 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-warning-500/20 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="h-10 w-10 text-warning-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Wallet Required</h2>
            <p className="text-neutral-300 max-w-md mx-auto">
              This page requires a connected wallet. You&apos;ll be redirected to the home page.
            </p>
          </div>
          <div className="status-warning p-4 rounded-lg">
            <p className="text-warning-400">Redirecting in a moment...</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component version
export function withWalletProtection<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RouteProtectionProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteProtection {...options}>
        <Component {...props} />
      </RouteProtection>
    )
  }
}