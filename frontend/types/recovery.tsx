
export enum RecoveryStatus {
    None = 0,
    Pending = 1,
    Approved = 2,
    Completed = 3,
    Expired = 4,
  }
  
  export interface RecoveryRequest {
    old_wallet: string;
    new_wallet: string;
    approvals: number;
    status: RecoveryStatus;
    timestamp: number;
  }
  
  export interface Guardian {
    address: string;
    name?: string;
    isApproved?: boolean;
  }
  
  export interface GuardianSetup {
    guardians: Guardian[];
    threshold: number;
    merkleRoot: string;
  }
  
  export interface TransactionResult {
    hash?: string;
    success: boolean;
    error?: string;
  }