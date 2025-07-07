'use client';

import { useContract, useAccount } from '@starknet-react/core';
import { RECOVERY_MANAGER_ABI, RECOVERY_MANAGER_ADDRESS } from '../contracts/recovery-manager';
import { RecoveryRequest, RecoveryStatus, TransactionResult } from '../../types/recovery';
import { parseCairoError } from '../utils/errors';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Type definitions for contract responses
interface ContractError {
  message: string;
  code?: string | number;
}

interface ContractInvokeResult {
  transaction_hash: string;
}

interface ContractCallResult {
  [key: string]: unknown;
}

// Main contract hook
export function useRecoveryContract() {
  const { contract } = useContract({
    abi: RECOVERY_MANAGER_ABI,
    address: RECOVERY_MANAGER_ADDRESS,
  });

  return contract;
}

// Hook for setting up guardians
export function useSetupGuardians() {
  const contract = useRecoveryContract();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);
  const [data, setData] = useState<ContractInvokeResult | null>(null);

  const setupGuardians = useCallback(async (merkleRoot: string, threshold: number): Promise<TransactionResult> => {
    console.log('setupGuardians called with:', { merkleRoot, threshold });
    console.log('Contract available:', !!contract);
    console.log('Account available:', !!account);
    
    setIsPending(true);
    setError(null);
    
    try {
      if (!contract) {
        throw new Error('Contract not available');
      }
      
      if (!account) {
        throw new Error('Account not available - please ensure wallet is connected');
      }

      // Validate inputs
      if (!merkleRoot || merkleRoot === '0x0' || merkleRoot === '000') {
        throw new Error('Invalid merkle root provided');
      }

      if (threshold < 1 || threshold > 5) {
        throw new Error('Threshold must be between 1 and 5');
      }
      
      console.log('Executing setup_guardians with:', {
        contractAddress: RECOVERY_MANAGER_ADDRESS,
        merkleRoot,
        threshold
      });
      
      const result = await account.execute({
        contractAddress: RECOVERY_MANAGER_ADDRESS,
        entrypoint: 'setup_guardians',
        calldata: [merkleRoot, threshold.toString()]
      });
      
      console.log('Setup guardians result:', result);
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      console.error('Setup guardians error:', err);
      const error = err as ContractError;
      const userFriendlyError = parseCairoError(error);
      setError({ message: userFriendlyError });
      setIsPending(false);
      
      return { 
        success: false, 
        error: userFriendlyError
      };
    }
  }, [contract, account]);

  return {
    setupGuardians,
    isPending,
    error,
    data
  };
}

// Hook for initiating recovery
export function useInitiateRecovery() {
  const contract = useRecoveryContract();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);
  const [data, setData] = useState<ContractInvokeResult | null>(null);

  const initiateRecovery = useCallback(async (oldWallet: string, newWallet: string): Promise<TransactionResult> => {
    setIsPending(true);
    setError(null);
    
    try {
      if (!contract || !account) throw new Error('Contract or account not available');
      
      const result = await account.execute({
        contractAddress: RECOVERY_MANAGER_ADDRESS,
        entrypoint: 'initiate_recovery',
        calldata: [oldWallet, newWallet]
      });
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Initiate recovery error:', error);
      const userFriendlyError = parseCairoError(error);
      setError({ message: userFriendlyError });
      setIsPending(false);
      
      return { 
        success: false, 
        error: userFriendlyError
      };
    }
  }, [contract, account]);

  return {
    initiateRecovery,
    isPending,
    error,
    data
  };
}

// Hook for approving recovery
export function useApproveRecovery() {
  const contract = useRecoveryContract();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);
  const [data, setData] = useState<ContractInvokeResult | null>(null);

  const approveRecovery = useCallback(async (
    oldWallet: string,
    guardianAddress: string,
    signatureR: string,
    signatureS: string,
    merkleProof: string[]
  ): Promise<TransactionResult> => {
    setIsPending(true);
    setError(null);
    
    try {
      if (!contract || !account) throw new Error('Contract or account not available');
      
      const result = await account.execute({
        contractAddress: RECOVERY_MANAGER_ADDRESS,
        entrypoint: 'approve_recovery',
        calldata: [
          oldWallet,
          guardianAddress,
          signatureR,
          signatureS,
          merkleProof.length.toString(),
          ...merkleProof
        ]
      });
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Approve recovery error:', error);
      const userFriendlyError = parseCairoError(error);
      setError({ message: userFriendlyError });
      setIsPending(false);
      
      return { 
        success: false, 
        error: userFriendlyError
      };
    }
  }, [contract, account]);

  return {
    approveRecovery,
    isPending,
    error,
    data
  };
}

// Hook for finalizing recovery
export function useFinalizeRecovery() {
  const contract = useRecoveryContract();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);
  const [data, setData] = useState<ContractInvokeResult | null>(null);

  const finalizeRecovery = useCallback(async (oldWallet: string): Promise<TransactionResult> => {
    setIsPending(true);
    setError(null);
    
    try {
      if (!contract || !account) throw new Error('Contract or account not available');
      
      const result = await account.execute({
        contractAddress: RECOVERY_MANAGER_ADDRESS,
        entrypoint: 'finalize_recovery',
        calldata: [oldWallet]
      });
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Finalize recovery error:', error);
      const userFriendlyError = parseCairoError(error);
      setError({ message: userFriendlyError });
      setIsPending(false);
      
      return { 
        success: false, 
        error: userFriendlyError
      };
    }
  }, [contract, account]);

  return {
    finalizeRecovery,
    isPending,
    error,
    data
  };
}

// FIXED: Generic hook for contract read calls
function useContractRead(methodName: string, args?: string[]) {
  const contract = useRecoveryContract();
  const [data, setData] = useState<ContractCallResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);
  
  // Use ref to track if we've made a call for these args to prevent duplicates
  const lastCallArgs = useRef<string>('');
  
  // Stable args key for comparison
  const argsKey = useMemo(() => {
    if (!args || args.length === 0) return '';
    return args.filter(arg => arg !== undefined && arg !== null).join(',');
  }, [args]);
  
  // Only create fetchData when we actually need it
  const fetchData = useCallback(async () => {
    if (!contract || !argsKey) return;
    
    // Prevent duplicate calls
    if (lastCallArgs.current === argsKey) return;
    
    setIsLoading(true);
    setError(null);
    lastCallArgs.current = argsKey;
    
    try {
      const result = await (contract as unknown as { 
        call: (method: string, args: string[]) => Promise<ContractCallResult> 
      }).call(methodName, argsKey.split(','));
      
      setData(result);
    } catch (err) {
      const error = err as ContractError;
      const userFriendlyError = parseCairoError(error);
      setError({ message: userFriendlyError });
      console.error(`Error calling ${methodName}:`, userFriendlyError);
      
      // Reset lastCallArgs on error so it can be retried
      lastCallArgs.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [contract, methodName, argsKey]);

  // Only fetch when we have valid args and haven't already called
  useEffect(() => {
    if (argsKey && lastCallArgs.current !== argsKey) {
      fetchData();
    }
  }, [argsKey, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// FIXED: Hook for reading recovery request
export function useRecoveryRequest(oldWallet?: string) {
  // Memoize args to prevent recreation
  const args = useMemo(() => 
    oldWallet ? [oldWallet] : undefined, 
    [oldWallet]
  );
  
  const { data, isLoading, error, refetch } = useContractRead(
    'get_recovery_request',
    args
  );

  const recoveryRequest = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    
    try {
      return {
        old_wallet: data[0]?.toString() || '',
        new_wallet: data[1]?.toString() || '',
        approvals: Number(data[2]) || 0,
        status: Number(data[3]) as RecoveryStatus || RecoveryStatus.None,
        timestamp: Number(data[4]) || 0,
      } as RecoveryRequest;
    } catch {
      return null;
    }
  }, [data]);

  return {
    recoveryRequest,
    isLoading,
    error,
    refetch
  };
}

// FIXED: Hook for checking if recovery is approved
export function useIsRecoveryApproved(oldWallet?: string) {
  const args = useMemo(() => 
    oldWallet ? [oldWallet] : undefined, 
    [oldWallet]
  );
  
  const { data, isLoading, error } = useContractRead(
    'is_recovery_approved',
    args
  );

  const isApproved = useMemo(() => Boolean(data), [data]);

  return {
    isApproved,
    isLoading,
    error
  };
}

// FIXED: Hook for getting guardian root
export function useGuardianRoot(wallet?: string) {
  const args = useMemo(() => 
    wallet ? [wallet] : undefined, 
    [wallet]
  );
  
  const { data, isLoading, error } = useContractRead(
    'get_guardian_root',
    args
  );

  const guardianRoot = useMemo(() => data?.toString() || '', [data]);

  return {
    guardianRoot,
    isLoading,
    error
  };
}

// FIXED: Hook for getting threshold
export function useThreshold(wallet?: string) {
  const args = useMemo(() => 
    wallet ? [wallet] : undefined, 
    [wallet]
  );
  
  const { data, isLoading, error } = useContractRead(
    'get_threshold',
    args
  );

  const threshold = useMemo(() => Number(data) || 0, [data]);

  return {
    threshold,
    isLoading,
    error
  };
}

// FIXED: Hook for getting approval count
export function useApprovalCount(oldWallet?: string) {
  const args = useMemo(() => 
    oldWallet ? [oldWallet] : undefined, 
    [oldWallet]
  );
  
  const { data, isLoading, error } = useContractRead(
    'get_approval_count',
    args
  );

  const approvalCount = useMemo(() => Number(data) || 0, [data]);

  return {
    approvalCount,
    isLoading,
    error
  };
}