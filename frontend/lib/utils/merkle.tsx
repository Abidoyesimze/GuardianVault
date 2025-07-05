// lib/utils/merkle.ts

/**
 * Simple hash function for demo purposes
 * In production, use proper cryptographic hash
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generates a Merkle root from an array of addresses
 * This is a simplified implementation for demo purposes
 */
export function generateMerkleRoot(addresses: string[]): string {
  if (addresses.length === 0) {
    return '0x0';
  }

  if (addresses.length === 1) {
    return addresses[0];
  }

  // Sort addresses for consistent ordering
  const sortedAddresses = [...addresses].sort();
  
  // For demo purposes, create a simple hash of all addresses
  const combined = sortedAddresses.join('');
  return simpleHash(combined);
}