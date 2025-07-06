// lib/utils/merkle-simple.ts
// Zero-dependency merkle tree implementation

/**
 * Simple hash function that creates deterministic felt252-compatible values
 */
function simpleHash(input: string): string {
  // Remove 0x prefix if present
  const cleanInput = input.startsWith('0x') ? input.slice(2) : input;
  
  // Convert to number array for processing
  const bytes: number[] = [];
  for (let i = 0; i < cleanInput.length; i += 2) {
    const byte = parseInt(cleanInput.slice(i, i + 2), 16);
    bytes.push(byte);
  }
  
  // Simple hash algorithm
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (const byte of bytes) {
    hash ^= byte;
    hash = (hash * 0x01000193) >>> 0; // FNV-1a 32-bit prime
  }
  
  // Create a longer hash by repeating and modifying
  let longHash = '';
  for (let i = 0; i < 8; i++) {
    const modified = ((hash + i * 0x12345678) >>> 0).toString(16).padStart(8, '0');
    longHash += modified;
  }
  
  // Take first 64 characters and ensure it's a valid felt252
  return '0x' + longHash.slice(0, 62); // 62 chars to stay under 252 bits
}

/**
 * Hash two values together
 */
function hashPair(a: string, b: string): string {
  // Ensure consistent ordering
  const first = a <= b ? a : b;
  const second = a <= b ? b : a;
  
  // Combine the values
  const combined = first.slice(2) + second.slice(2); // Remove 0x prefixes
  return simpleHash(combined);
}

/**
 * Validate StarkNet address format
 */
function isValidStarkNetAddress(address: string): boolean {
  return (
    typeof address === 'string' &&
    address.startsWith('0x') &&
    address.length >= 60 &&
    address.length <= 66 &&
    /^0x[0-9a-fA-F]+$/.test(address)
  );
}

/**
 * Normalize address to standard format
 */
function normalizeAddress(address: string): string {
  if (!isValidStarkNetAddress(address)) {
    throw new Error(`Invalid StarkNet address format: ${address}`);
  }
  
  // Remove 0x and pad to 64 characters
  const clean = address.slice(2);
  const padded = clean.padStart(64, '0');
  return '0x' + padded;
}

/**
 * Generate merkle root from array of addresses
 */
export function generateMerkleRoot(addresses: string[]): string {
  if (!addresses || addresses.length === 0) {
    throw new Error('Address list cannot be empty');
  }
  
  if (addresses.length > 5) {
    throw new Error('Maximum 5 addresses allowed');
  }
  
  // Validate all addresses first
  for (let i = 0; i < addresses.length; i++) {
    if (!addresses[i]) {
      throw new Error(`Address at index ${i} is null or undefined`);
    }
    
    if (!isValidStarkNetAddress(addresses[i])) {
      throw new Error(`Invalid address at index ${i}: ${addresses[i]}`);
    }
  }
  
  // Normalize and sort for deterministic results
  const normalizedAddresses = addresses.map(addr => normalizeAddress(addr));
  normalizedAddresses.sort();
  
  // Handle single address
  if (normalizedAddresses.length === 1) {
    return normalizedAddresses[0];
  }
  
  // Build merkle tree
  let currentLevel = [...normalizedAddresses];
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    // Process pairs
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Hash the pair
        const hash = hashPair(currentLevel[i], currentLevel[i + 1]);
        nextLevel.push(hash);
      } else {
        // Odd number, promote the last element
        nextLevel.push(currentLevel[i]);
      }
    }
    
    currentLevel = nextLevel;
  }
  
  const root = currentLevel[0];
  
  // Validate the root
  if (!root || root === '0x0') {
    throw new Error('Generated invalid root');
  }
  
  return root;
}

/**
 * Generate merkle proof for a specific address
 */
export function generateMerkleProof(addresses: string[], targetAddress: string): string[] {
  if (!addresses || addresses.length === 0) {
    throw new Error('Address list cannot be empty');
  }
  
  // Normalize addresses
  const normalizedAddresses = addresses.map(addr => normalizeAddress(addr));
  const normalizedTarget = normalizeAddress(targetAddress);
  
  // Sort for consistency
  normalizedAddresses.sort();
  
  // Find target index
  const targetIndex = normalizedAddresses.indexOf(normalizedTarget);
  if (targetIndex === -1) {
    throw new Error('Target address not found in list');
  }
  
  // Single address needs no proof
  if (normalizedAddresses.length === 1) {
    return [];
  }
  
  const proof: string[] = [];
  let currentLevel = [...normalizedAddresses];
  let currentIndex = targetIndex;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    // Process pairs and collect proof elements
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        
        // If target is in this pair, add sibling to proof
        if (i === currentIndex) {
          proof.push(right);
        } else if (i + 1 === currentIndex) {
          proof.push(left);
        }
        
        // Hash the pair
        const hash = hashPair(left, right);
        nextLevel.push(hash);
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return proof;
}

/**
 * Verify a merkle proof
 */
export function verifyMerkleProof(leaf: string, root: string, proof: string[]): boolean {
  try {
    let currentHash = normalizeAddress(leaf);
    
    for (const proofElement of proof) {
      currentHash = hashPair(currentHash, proofElement);
    }
    
    return currentHash === root;
  } catch {
    return false;
  }
}