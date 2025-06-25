'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount } from '@starknet-react/core'
import { Shield, Users, Lock, Zap, ArrowRight, CheckCircle, Star, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'

export default function HomePage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Social Recovery Network",
      description: "Distribute trust across your network of friends and family members",
      details: "Choose 3-5 trusted guardians who can collectively help you regain wallet access"
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Zero-Knowledge Privacy",
      description: "Guardian identities remain private through advanced cryptographic proofs",
      details: "Merkle tree proofs ensure guardian privacy while maintaining security"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Fully Decentralized",
      description: "No centralized servers or single points of failure",
      details: "Smart contracts on StarkNet handle all recovery logic transparently"
    }
  ]

  const stats = [
    { value: "99.9%", label: "Uptime Guarantee" },
    { value: "< 5min", label: "Setup Time" },
    { value: "Zero", label: "Monthly Fees" },
    { value: "24/7", label: "Recovery Access" }
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "DeFi Trader",
      content: "GuardianVault gave me peace of mind. No more anxiety about losing seed phrases.",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Crypto Entrepreneur", 
      content: "The most elegant wallet recovery solution I've seen. Professional grade security.",
      rating: 5
    }
  ]

  // Handle protected navigation from home page
  const handleProtectedNavigation = (path: string, actionName: string) => {
    if (!isConnected) {
      toast.warning(`🔐 Connect your wallet to ${actionName}`, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
      return
    }
    
    router.push(path)
  }

  return (
    <div className="space-y-24 overflow-hidden">
      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-6xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 text-sm font-medium text-primary-400">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span>Built on StarkNet</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Recover Your Wallet
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400">
                Without Seed Phrases
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-300 max-w-4xl mx-auto leading-relaxed">
              Professional-grade wallet recovery using social consensus and zero-knowledge proofs.
              Never lose access to your crypto again.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => handleProtectedNavigation('/setup', 'set up guardian recovery')}
              className="group bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-glow flex items-center space-x-2"
            >
              <span>Start Setup</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
              {!isConnected && (
                <div className="w-2 h-2 bg-warning-400 rounded-full animate-pulse ml-1"></div>
              )}
            </button>
            <button
              onClick={() => handleProtectedNavigation('/recovery', 'recover your wallet')}
              className="group bg-neutral-800/50 hover:bg-neutral-700/50 text-white font-semibold px-8 py-4 rounded-xl border border-neutral-700/50 hover:border-neutral-600/50 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Recover Wallet</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
              {!isConnected && (
                <div className="w-2 h-2 bg-warning-400 rounded-full animate-pulse ml-1"></div>
              )}
            </button>
          </div>

          {/* Connection Status Message */}
          {!isConnected && (
            <div className="inline-flex items-center space-x-2 bg-warning-500/10 border border-warning-500/20 rounded-full px-4 py-2 text-sm font-medium text-warning-400 animate-fade-in">
              <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
              <span>Connect your wallet to get started</span>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 pt-8 text-neutral-400">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-success-500" />
              <span className="text-sm font-medium">Audited Smart Contracts</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-success-500" />
              <span className="text-sm font-medium">Non-Custodial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-success-500" />
              <span className="text-sm font-medium">Zero Fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center space-y-2 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl lg:text-4xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-neutral-400 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-bold text-white">
            Enterprise-Grade Security
          </h2>
          <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
            Advanced cryptographic techniques combined with social consensus for unmatched security and usability.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`card group p-8 cursor-pointer transition-all duration-300 ${
                hoveredFeature === index ? 'shadow-glow border-primary-500/30' : ''
              }`}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="space-y-6">
                <div className={`inline-flex p-3 rounded-xl transition-all duration-300 ${
                  hoveredFeature === index 
                    ? 'bg-primary-500/20 text-primary-400' 
                    : 'bg-neutral-800/50 text-neutral-400'
                }`}>
                  {feature.icon}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-primary-100 transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-400 leading-relaxed">
                    {feature.description}
                  </p>
                  {hoveredFeature === index && (
                    <p className="text-primary-400 text-sm font-medium animate-fade-in">
                      {feature.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-bold text-white">
            Simple. Secure. Reliable.
          </h2>
          <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
            Get started in minutes with our intuitive setup process.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Choose Your Guardians",
                description: "Select 3-5 trusted people who can help you recover your wallet."
              },
              {
                step: "02", 
                title: "Secure On-Chain Setup",
                description: "Guardian addresses are hashed and stored securely on StarkNet."
              },
              {
                step: "03",
                title: "Recovery When Needed",
                description: "If you lose access, guardians can approve your recovery request."
              },
              {
                step: "04",
                title: "Instant Access Restoration",
                description: "Regain control of your wallet without any seed phrases."
              }
            ].map((item, index) => (
              <div key={index} className="flex space-x-6 group">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center font-bold text-white text-sm">
                    {item.step}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-primary-100 transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="card p-8 bg-gradient-to-br from-primary-500/10 to-purple-500/10 border-primary-500/20">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Guardian Setup</h4>
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: "Alice (Sister)", status: "Confirmed" },
                    { name: "Bob (Best Friend)", status: "Confirmed" }, 
                    { name: "Charlie (Colleague)", status: "Pending" }
                  ].map((guardian, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg">
                      <span className="text-neutral-200 text-sm">{guardian.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        guardian.status === 'Confirmed' 
                          ? 'status-success' 
                          : 'status-warning'
                      }`}>
                        {guardian.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-bold text-white">
            Trusted by Crypto Professionals
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card p-8 space-y-6">
              <div className="flex space-x-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-neutral-200 text-lg leading-relaxed">
                "{testimonial.content}"
              </blockquote>
              <div>
                <div className="font-bold text-white">{testimonial.name}</div>
                <div className="text-neutral-400 text-sm">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto">
        <div className="card p-12 text-center space-y-8 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-primary-500/20">
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-5xl font-bold text-white">
              Ready to Secure Your Future?
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Join thousands of users who trust GuardianVault for professional wallet recovery.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleProtectedNavigation('/setup', 'get started')}
              className="btn-primary text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => handleProtectedNavigation('/dashboard', 'view dashboard')}
              className="btn-ghost text-lg"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}