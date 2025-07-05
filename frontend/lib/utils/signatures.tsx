// lib/utils/signatures.ts
import { hash } from 'starknet'

/**
 * Generate a signature for guardian approval
 * This is a simplified implementation for demo purposes
 */
export function generateGuardianSignature(
  guardianAddress: string,
  oldWalletAddress: string,
  newWalletAddress: string,
  privateKey: string
): { r: string; s: string } {
  // Create message to sign
  const message = `${guardianAddress}:${oldWalletAddress}:${newWalletAddress}`;
  
  // For demo purposes, create a simple signature
  // In production, use proper cryptographic signing
  const messageHash = hash.computeHashOnElements([message]);
  
  // Simple signature generation (not cryptographically secure)
  const r = BigInt(messageHash) % BigInt(2 ** 251);
  const s = (BigInt(privateKey) * r) % BigInt(2 ** 251);
  
  return {
    r: r.toString(),
    s: s.toString()
  };
}

/**
 * Verify a guardian signature
 * This is a simplified implementation for demo purposes
 */
export function verifyGuardianSignature(
  guardianAddress: string,
  oldWalletAddress: string,
  newWalletAddress: string,
  signature: { r: string; s: string },
  publicKey: string
): boolean {
  // Simple verification (not cryptographically secure)
  const r = BigInt(signature.r);
  const s = BigInt(signature.s);
  const pubKey = BigInt(publicKey);
  
  // Check if signature is valid (simplified)
  return (r * pubKey) % BigInt(2 ** 251) === s;
}