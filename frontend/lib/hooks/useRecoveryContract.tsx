'use client';

import { useContract, useAccount } from '@starknet-react/core';
import { RECOVERY_MANAGER_ABI, RECOVERY_MANAGER_ADDRESS } from '../../lib/contracts/recovery-manager';
import { RecoveryRequest, RecoveryStatus, TransactionResult } from '../../types/recovery';
import { useState, useCallback, useEffect, useMemo } from 'react';


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

  // Debug logging
  console.log('useRecoveryContract:', {
    address: RECOVERY_MANAGER_ADDRESS,
    contract: !!contract
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
    setIsPending(true);
    setError(null);
    
    try {
      if (!contract || !account) throw new Error('Contract or account not available');
      
      const result = await contract.invoke('setup_guardians', [merkleRoot, threshold]) as ContractInvokeResult;
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Setup guardians error:', error);
      setError(error);
      setIsPending(false);
      
      return { 
        success: false, 
        error: error.message || 'Failed to setup guardians' 
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
      
      const result = await contract.invoke('initiate_recovery', [oldWallet, newWallet]) as ContractInvokeResult;
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Initiate recovery error:', error);
      setError(error);
      setIsPending(false);
      
      return { 
        success: false, 
        error: error.message || 'Failed to initiate recovery' 
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
      
      const result = await contract.invoke('approve_recovery', [
        oldWallet,
        guardianAddress,
        signatureR,
        signatureS,
        merkleProof
      ]) as ContractInvokeResult;
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Approve recovery error:', error);
      setError(error);
      setIsPending(false);
      
      return { 
        success: false, 
        error: error.message || 'Failed to approve recovery' 
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
      
      const result = await contract.invoke('finalize_recovery', [oldWallet]) as ContractInvokeResult;
      
      setData(result);
      setIsPending(false);
      
      return { 
        success: true, 
        hash: result.transaction_hash 
      };
    } catch (err) {
      const error = err as ContractError;
      console.error('Finalize recovery error:', error);
      setError(error);
      setIsPending(false);
      
      return { 
        success: false, 
        error: error.message || 'Failed to finalize recovery' 
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

// Generic hook for contract read calls
function useContractRead(methodName: string, args?: string[]) {
  const contract = useRecoveryContract();
  const [data, setData] = useState<ContractCallResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ContractError | null>(null);

  // Memoize args to prevent unnecessary re-renders
  const memoizedArgs = useMemo(() => args, [args?.join(',')]);
  
  const fetchData = useCallback(async () => {
    if (!contract || !methodName) {
      return;
    }
    
    // Don't call if args are undefined, null, empty array, or if any required argument is empty
    if (!memoizedArgs || memoizedArgs.length === 0 || memoizedArgs.some(arg => !arg)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ((contract as unknown) as { call: (method: string, args: string[]) => Promise<ContractCallResult> })
        .call(methodName, memoizedArgs);
      setData(result);
    } catch (err) {
      const error = err as ContractError;
      setError(error);
      console.error(`Error calling ${methodName}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [contract, methodName, memoizedArgs]);

  useEffect(() => {
    // Only call fetchData if we have valid arguments
    if (memoizedArgs && memoizedArgs.length > 0 && !memoizedArgs.some(arg => !arg)) {
      fetchData();
    }
  }, [fetchData, memoizedArgs]);

  return { data, isLoading, error, refetch: fetchData };
}

// Hook for reading recovery request
export function useRecoveryRequest(oldWallet?: string) {
  const { data, isLoading, error, refetch } = useContractRead(
    'get_recovery_request',
    oldWallet ? [oldWallet] : undefined
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

// Hook for checking if recovery is approved
export function useIsRecoveryApproved(oldWallet?: string) {
  const { data, isLoading, error } = useContractRead(
    'is_recovery_approved',
    oldWallet ? [oldWallet] : undefined
  );

  const isApproved = useMemo(() => Boolean(data), [data]);

  return {
    isApproved,
    isLoading,
    error
  };
}

// Hook for getting guardian root
export function useGuardianRoot(wallet?: string) {
  const { data, isLoading, error } = useContractRead(
    'get_guardian_root',
    wallet ? [wallet] : undefined
  );

  const guardianRoot = useMemo(() => data?.toString() || '', [data]);

  return {
    guardianRoot,
    isLoading,
    error
  };
}

// Hook for getting threshold
export function useThreshold(wallet?: string) {
  const { data, isLoading, error } = useContractRead(
    'get_threshold',
    wallet ? [wallet] : undefined
  );

  const threshold = useMemo(() => Number(data) || 0, [data]);

  return {
    threshold,
    isLoading,
    error
  };
}

// Hook for getting approval count
export function useApprovalCount(oldWallet?: string) {
  const { data, isLoading, error } = useContractRead(
    'get_approval_count',
    oldWallet ? [oldWallet] : undefined
  );

  const approvalCount = useMemo(() => Number(data) || 0, [data]);

  return {
    approvalCount,
    isLoading,
    error
  };
}