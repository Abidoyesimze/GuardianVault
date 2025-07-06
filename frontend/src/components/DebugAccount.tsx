'use client';

import { useAccount, useConnect } from '@starknet-react/core';
import { useEffect } from 'react';

export function DebugAccount() {
  const accountData = useAccount();
  const { connectors } = useConnect();

  useEffect(() => {
    console.log('=== ACCOUNT DEBUG INFO ===');
    console.log('Full account data:', accountData);
    console.log('Account keys:', Object.keys(accountData));
    console.log('Account:', accountData.account);
    console.log('Address:', accountData.address);
    console.log('Status:', accountData.status);
    console.log('Is Connected:', accountData.isConnected);
    console.log('Is Connecting:', accountData.isConnecting);
    console.log('Is Disconnected:', accountData.isDisconnected);
    console.log('Is Reconnecting:', accountData.isReconnecting);
    console.log('Chain ID:', accountData.chainId);
    console.log('Connector:', accountData.connector);
    console.log('Available connectors:', connectors);
    
    if (accountData.account) {
      console.log('Account type:', typeof accountData.account);
      console.log('Account constructor:', accountData.account.constructor?.name);
      console.log('Account methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(accountData.account)));
    }
  }, [accountData, connectors]);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="font-bold mb-2">Account Debug Info:</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify({
          status: accountData.status,
          isConnected: accountData.isConnected,
          address: accountData.address,
          hasAccount: !!accountData.account,
          accountType: accountData.account?.constructor?.name,
          chainId: accountData.chainId,
          connectorId: accountData.connector?.id,
        }, null, 2)}
      </pre>
    </div>
  );
}