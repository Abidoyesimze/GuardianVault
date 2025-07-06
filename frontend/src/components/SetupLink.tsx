// components/ShareableLinks.tsx
'use client';

import { useState } from 'react';
import { Copy, Share2, CheckCircle, ExternalLink, Users, Send } from 'lucide-react';
import { toast } from 'react-toastify';

interface ShareableLinksProps {
  walletAddress: string;
  guardianCount: number;
  threshold: number;
}

export default function ShareableLinks({ walletAddress, guardianCount, threshold }: ShareableLinksProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate the guardian acceptance link - Fixed to match actual route
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  // Change from /guardian/accept to /guardian (or whatever your actual route is)
  const guardianLink = `${baseUrl}/guardian?wallet=${walletAddress}`;
  
  // Short display version for mobile
  const shortLink = `${baseUrl}/guardian?wallet=${walletAddress.slice(0, 8)}...`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      
      toast.success('Guardian link copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast.success('Guardian link copied!', {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Guardian Invitation - ZK Guardians Recovery');
    const body = encodeURIComponent(
      `Hi!\n\nYou've been invited to be a guardian for my crypto wallet recovery system.\n\n` +
      `What this means:\n` +
      `• You'll help me recover my wallet if I ever lose access\n` +
      `• ${threshold} out of ${guardianCount} guardians need to approve any recovery\n` +
      `• This is completely secure - you cannot access my funds\n` +
      `• You keep full control of your own wallet\n\n` +
      `To accept your guardian role:\n` +
      `1. Click this link: ${guardianLink}\n` +
      `2. Connect your crypto wallet (the same address I gave you)\n` +
      `3. Accept the guardian invitation\n\n` +
      `Thanks for helping keep my wallet secure!\n\n` +
      `Learn more: ZK Guardians Recovery System`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Guardian Invitation - ZK Guardians',
          text: `You've been invited to be a guardian for my wallet recovery. Click to accept:`,
          url: guardianLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copy
      copyToClipboard(guardianLink);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Share2 className="h-6 w-6 text-primary-500" />
          <h3 className="text-xl font-bold text-white">Share Guardian Link</h3>
        </div>
        <p className="text-neutral-300 text-sm">
          Send this link to all {guardianCount} guardians so they can accept their role
        </p>
      </div>

      {/* Guardian Link Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary-500" />
            <h4 className="font-semibold text-white">Guardian Invitation Link</h4>
          </div>
          <div className="status-success px-3 py-1 rounded-full text-xs">
            Ready to Share
          </div>
        </div>

        {/* Link Display */}
        <div className="bg-neutral-900/50 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Shareable Link</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-neutral-800 rounded-lg px-3 py-2 font-mono text-sm text-neutral-300 overflow-hidden">
                <span className="hidden sm:inline break-all">{guardianLink}</span>
                <span className="sm:hidden">{shortLink}</span>
              </div>
              <button
                onClick={() => copyToClipboard(guardianLink)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  copiedLink 
                    ? 'bg-success-500 text-white' 
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
                title="Copy link"
              >
                {copiedLink ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Recovery Configuration Summary */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h5 className="text-blue-400 font-medium mb-2">Recovery Configuration</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-300">Total Guardians:</span>
              <span className="text-white ml-2 font-medium">{guardianCount}</span>
            </div>
            <div>
              <span className="text-blue-300">Required Approvals:</span>
              <span className="text-white ml-2 font-medium">{threshold}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-300">
            The same link works for all guardians - they&apos;ll be identified by their wallet address
          </div>
        </div>
      </div>

      {/* Sharing Options */}
      <div className="space-y-4">
        <h4 className="font-semibold text-white text-center">Sharing Options</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Copy Link */}
          <button
            onClick={() => copyToClipboard(guardianLink)}
            className="btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Link</span>
          </button>

          {/* Email Template */}
          <button
            onClick={shareViaEmail}
            className="btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            <Send className="h-4 w-4" />
            <span>Email Template</span>
          </button>

          {/* Native Share */}
          <button
            onClick={shareViaNative}
            className="btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Guardian Instructions */}
      <div className="card p-4 bg-green-500/5 border-green-500/20">
        <h5 className="text-green-400 font-medium mb-3 flex items-center space-x-2">
          <ExternalLink className="h-4 w-4" />
          <span>What Your Guardians Need to Do</span>
        </h5>
        <ol className="text-green-300 text-sm space-y-2 list-decimal list-inside">
          <li>Click the guardian invitation link you send them</li>
          <li>Connect their crypto wallet (must be the address you specified)</li>
          <li>Accept their guardian role on the platform</li>
          <li>Keep their wallet secure for future recovery approvals</li>
        </ol>
        
        <div className="mt-3 pt-3 border-t border-green-500/20">
          <p className="text-green-300 text-xs">
            💡 <strong>Important:</strong> Each guardian must use the specific wallet address you added during setup. 
            The system will verify their identity automatically.
          </p>
        </div>
      </div>
    </div>
  );
}