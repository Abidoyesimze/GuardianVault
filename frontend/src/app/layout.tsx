import './globals.css'
import { StarknetProvider } from '@/components/StarknetProvider'
import { Navbar } from '@/components/Navbar'
import { NetworkIndicator } from '@/components/NetworkIndicator'
import { ContractStatus } from '@/components/ContractStatus'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import type { Metadata, Viewport } from 'next'

// Use system font instead of Google Fonts to avoid network issues
const systemFont = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  variable: '--font-system',
  display: 'swap',
}

export const metadata: Metadata = {
  title: {
    template: '%s - GuardianVault',
    default: 'GuardianVault - Professional Wallet Recovery',
  },
  description: 'Professional-grade wallet recovery system built on StarkNet using social recovery and zero-knowledge proofs. Secure, private, and user-friendly.',
  keywords: ['wallet recovery', 'StarkNet', 'social recovery', 'zero-knowledge', 'crypto', 'blockchain', 'security'],
  authors: [{ name: 'GuardianVault Team' }],
  creator: 'GuardianVault',
  publisher: 'GuardianVault',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://guardianvault.app',
    title: 'GuardianVault - Professional Wallet Recovery',
    description: 'Professional-grade wallet recovery system built on StarkNet using social recovery and zero-knowledge proofs',
    siteName: 'GuardianVault',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GuardianVault - Professional Wallet Recovery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GuardianVault - Professional Wallet Recovery',
    description: 'Professional-grade wallet recovery system built on StarkNet using social recovery and zero-knowledge proofs',
    images: ['/og-image.png'],
    creator: '@guardianvault',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={systemFont.variable}>
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
            <NetworkIndicator />
            <ContractStatus />
          </div>
          
          {/* Toast Container */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </StarknetProvider>
      </body>
    </html>
  )
}