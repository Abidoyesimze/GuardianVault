'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core'
import { Shield, Menu, X, Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'

// Use Connector type directly from the library
import type { Connector } from '@starknet-react/core';

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConnectors, setShowConnectors] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Define which routes require wallet connection
  const protectedRoutes = ['/setup', '/recovery', '/guardian', '/dashboard']
  
  const navLinks = [
    { href: '/', label: 'Home', protected: false },
    { href: '/setup', label: 'Setup', protected: true },
    { href: '/recovery', label: 'Recovery', protected: true },
    { href: '/guardian', label: 'Guardian', protected: true },
    { href: '/dashboard', label: 'Dashboard', protected: true },
  ]

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle protected navigation
  const handleNavigation = (href: string, label: string, isProtected: boolean) => {
    if (isProtected && !isConnected) {
      toast.warning(`🔐 Connect your wallet to access ${label}`, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
      return
    }
    
    // Close mobile menu if open
    setIsMenuOpen(false)
    
    // Navigate to the route
    router.push(href)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowConnectors(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Handle successful wallet connection
  const handleConnect = (connector: Connector) => {
    connect({ connector })
    setShowConnectors(false)
    toast.success(`🎉 Successfully connected with ${connector.id === 'argentX' ? 'Argent X' : 'Braavos'}!`, {
      position: "top-right",
      autoClose: 3000,
    })
  }

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect()
    setShowAccountMenu(false)
    toast.info('👋 Wallet disconnected', {
      position: "top-right",
      autoClose: 2000,
    })
    
    // Redirect to home if on a protected route
    if (protectedRoutes.includes(pathname)) {
      router.push('/')
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 group"
          >
            <div className="relative">
              <Shield className="h-8 w-8 text-primary-500 group-hover:text-primary-400 transition-colors duration-200" />
              <div className="absolute inset-0 h-8 w-8 bg-primary-500/20 rounded-full blur-lg group-hover:bg-primary-400/30 transition-all duration-200"></div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-primary-100 transition-colors duration-200">
              GuardianVault
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <div key={link.href}>
                {link.protected ? (
                  <button
                    onClick={() => handleNavigation(link.href, link.label, link.protected)}
                    className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActiveLink(link.href)
                        ? 'text-primary-400 bg-primary-500/10'
                        : 'text-neutral-300 hover:text-white hover:bg-white/5'
                    } ${!isConnected ? 'cursor-pointer' : ''}`}
                  >
                    {link.label}
                    {!isConnected && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                    )}
                    {isActiveLink(link.href) && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"></div>
                    )}
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActiveLink(link.href)
                        ? 'text-primary-400 bg-primary-500/10'
                        : 'text-neutral-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                    {isActiveLink(link.href) && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"></div>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="flex items-center space-x-3 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-700/50 hover:border-neutral-600/50 rounded-xl px-4 py-2.5 transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-neutral-200">
                      {formatAddress(address!)}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Account Dropdown */}
                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-xl shadow-2xl animate-scale-in overflow-hidden">
                    <div className="p-4 border-b border-neutral-700/50">
                      <p className="text-xs text-neutral-400 mb-1">Connected Wallet</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-neutral-200">{formatAddress(address!)}</code>
                        <button
                          onClick={copyAddress}
                          className="p-1.5 hover:bg-neutral-700/50 rounded-md transition-colors duration-200"
                          title="Copy address"
                        >
                          <Copy className="h-4 w-4 text-neutral-400" />
                        </button>
                      </div>
                      {copied && (
                        <p className="text-xs text-success-400 mt-1">Address copied!</p>
                      )}
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-error-400 hover:bg-error-500/10 rounded-lg transition-colors duration-200"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowConnectors(!showConnectors)}
                  className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showConnectors ? 'rotate-180' : ''}`} />
                </button>
                
                {showConnectors && (
                  <div className="absolute right-0 mt-2 w-56 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-xl shadow-2xl animate-scale-in overflow-hidden">
                    <div className="p-2">
                      {connectors.map((connector) => (
                        <button
                          key={connector.id}
                          onClick={() => handleConnect(connector)}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-700/50 rounded-lg transition-all duration-200 group"
                        >
                          <span className="font-medium">
                            {connector.id === 'argentX' ? 'Argent X' : 'Braavos'}
                          </span>
                          <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-neutral-800/50 animate-slide-up">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.protected ? (
                    <button
                      onClick={() => handleNavigation(link.href, link.label, link.protected)}
                      className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isActiveLink(link.href)
                          ? 'text-primary-400 bg-primary-500/10'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{link.label}</span>
                        {!isConnected && (
                          <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </button>
                  ) : (
                    <Link
                      href={link.href}
                      className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isActiveLink(link.href)
                          ? 'text-primary-400 bg-primary-500/10'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}