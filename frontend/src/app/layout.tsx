import './globals.css'
import { Inter } from 'next/font/google'
import { StarknetProvider } from '@/components/StarknetProvider'
import { Navbar } from '@/components/Navbar'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'GuardianVault - Professional Wallet Recovery',
  description: 'Professional-grade wallet recovery system built on StarkNet using social recovery and zero-knowledge proofs. Secure, private, and user-friendly.',
  keywords: 'wallet recovery, StarkNet, social recovery, zero-knowledge, crypto, blockchain, security',
  authors: [{ name: 'GuardianVault Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <StarknetProvider>
          {/* Background */}
          <div className="fixed inset-0 bg-gradient-professional">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.1),rgba(255,255,255,0))]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(168,85,247,0.1),rgba(255,255,255,0))]"></div>
          </div>
          
          {/* Content */}
          <div className="relative min-h-screen">
            <Navbar />
            <main className="pt-16">
              <div className="container mx-auto px-4 lg:px-6 py-8 lg:py-12">
                {children}
              </div>
            </main>
          </div>
        </StarknetProvider>
      </body>
    </html>
  )
}