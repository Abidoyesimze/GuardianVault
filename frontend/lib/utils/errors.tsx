// lib/utils/errors.ts

/**
 * Cairo contract error messages mapping
 * Maps raw Cairo error strings to user-friendly messages
 */
const CAIRO_ERROR_MESSAGES: Record<string, string> = {
    // Guardian Setup Errors
    'Guardians already setup': 'Guardians have already been configured for this wallet. You can only set up guardians once.',
    'Guardians not setup': 'No guardians have been configured for this wallet. Please set up guardians first.',
    'Invalid threshold': 'Invalid threshold value. Must be between 1 and 5 guardians.',
    
    // Recovery Process Errors
    'Recovery already exists': 'A recovery request is already active for this wallet. Please wait for it to complete or expire.',
    'Recovery not found': 'No active recovery request found for this wallet.',
    'Recovery expired': 'The recovery request has expired after 24 hours. Please initiate a new recovery request.',
    'Recovery not approved': 'Recovery request has not been approved by enough guardians yet.',
    
    // Guardian Approval Errors
    'Invalid merkle proof': 'Invalid guardian verification. This address is not authorized as a guardian for this wallet.',
    'Guardian already approved': 'This guardian has already approved this recovery request.',
    'Invalid signature': 'Invalid guardian signature. Please ensure you are signing the correct recovery message.',
    'Threshold not met': 'Not enough guardian approvals. More guardian signatures are required to complete recovery.',
    
    // Access Control Errors
    'Only new wallet can finalize': 'Only the new wallet can finalize the recovery process.',
    'Only new wallet can initiate': 'Only the new wallet address can initiate recovery.',
    'Only guardian can approve': 'Only authorized guardians can approve recovery requests.',
    
    // Validation Errors
    'Invalid merkle root': 'Invalid guardian merkle root. Please check your guardian configuration.',
    'Invalid old wallet address': 'Invalid old wallet address format.',
    'Invalid new wallet address': 'Invalid new wallet address format.',
    'Invalid caller address': 'Invalid caller address.',
    'Invalid owner address': 'Invalid owner address.',
    'Invalid signature r': 'Invalid signature R component.',
    'Invalid signature s': 'Invalid signature S component.',
    'Old and new wallet must differ': 'The old and new wallet addresses must be different.',
  };
  
  /**
   * StarkNet and wallet-specific error patterns
   */
  const STARKNET_ERROR_PATTERNS: Record<string, string> = {
    'User rejected': 'Transaction was rejected by user.',
    'user rejected': 'Transaction was rejected by user.',
    'insufficient funds': 'Insufficient ETH balance for transaction fees.',
    'insufficient balance': 'Insufficient ETH balance for transaction fees.',
    'nonce': 'Transaction nonce error. Please try again.',
    'Contract not found': 'Smart contract not found. Please check the contract address.',
    'contract not found': 'Smart contract not found. Please check the contract address.',
    'execution reverted': 'Transaction execution failed. Please check your inputs.',
    'network error': 'Network connection error. Please check your internet connection.',
    'timeout': 'Transaction timeout. Please try again.',
    'gas': 'Transaction gas error. Please try again with higher gas.',
    'replacement fee too low': 'Transaction fee too low. Please try again with higher fee.',
    'already known': 'Transaction already submitted. Please wait for confirmation.',
  };
  
  /**
   * Parse Cairo contract error and return user-friendly message
   */
  export function parseCairoError(error: unknown): string {
    if (!error) return 'Unknown error occurred';
  
    // Extract error message from different error formats
    let errorMessage = '';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    } else if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
      errorMessage = (error.data as { message: string }).message;
    } else if (error && typeof error === 'object' && 'reason' in error) {
      errorMessage = (error as { reason: string }).reason;
    } else if (error && typeof error === 'object' && 'error' in error && error.error && typeof error.error === 'object' && 'message' in error.error) {
      errorMessage = (error.error as { message: string }).message;
    } else if (error && typeof error === 'object' && 'details' in error) {
      errorMessage = (error as { details: string }).details;
    }
  
    console.log('Parsing error:', { originalError: error, extractedMessage: errorMessage });
  
    // First, check for Cairo contract-specific errors
    for (const [cairoError, userMessage] of Object.entries(CAIRO_ERROR_MESSAGES)) {
      if (errorMessage.toLowerCase().includes(cairoError.toLowerCase())) {
        return userMessage;
      }
    }
  
    // Then check for StarkNet/wallet errors
    for (const [pattern, userMessage] of Object.entries(STARKNET_ERROR_PATTERNS)) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return userMessage;
      }
    }
  
    // Handle specific error codes
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string | number }).code;
      switch (code) {
        case 4001:
          return 'Transaction was rejected by user.';
        case -32000:
          return 'Insufficient funds for transaction.';
        case -32002:
          return 'Transaction already pending. Please wait.';
        case -32003:
          return 'Transaction underpriced. Please increase gas price.';
        default:
          break;
      }
    }
  
    // If no specific mapping found, return cleaned error message
    if (errorMessage) {
      // Clean up common error prefixes
      const cleanedMessage = errorMessage
        .replace(/^Error: /, '')
        .replace(/^execution reverted: /, '')
        .replace(/^VM Exception[^:]*: /, '')
        .replace(/^revert /, '')
        .trim();
      
      return cleanedMessage || 'Transaction failed. Please try again.';
    }
  
    return 'Unknown error occurred. Please try again.';
  }
  
  /**
   * Check if error indicates guardians are already set up
   */
  export function isGuardiansAlreadySetupError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    return message.includes('already been configured') || message.includes('guardians already setup');
  }
  
  /**
   * Check if error indicates guardians not set up
   */
  export function isGuardiansNotSetupError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    return message.includes('no guardians have been configured') || message.includes('guardians not setup');
  }
  
  /**
   * Check if error indicates invalid guardian
   */
  export function isInvalidGuardianError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    return message.includes('not authorized as a guardian') || message.includes('invalid merkle proof');
  }
  
  /**
   * Check if error indicates user rejection
   */
  export function isUserRejectionError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    const hasCode4001 = !!(error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'number' && (error as { code: number }).code === 4001);
    return message.includes('rejected by user') || hasCode4001;
  }
  
  /**
   * Check if error indicates insufficient funds
   */
  export function isInsufficientFundsError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    return message.includes('insufficient funds') || message.includes('insufficient balance');
  }
  
  /**
   * Check if error indicates network/connection issues
   */
  export function isNetworkError(error: unknown): boolean {
    const message = parseCairoError(error).toLowerCase();
    return message.includes('network error') || message.includes('timeout') || message.includes('connection');
  }
  
  /**
   * Get error severity level for UI styling
   */
  export function getErrorSeverity(error: unknown): 'error' | 'warning' | 'info' {
    const message = parseCairoError(error).toLowerCase();
    
    // Info level - user actions
    if (message.includes('rejected by user') || message.includes('cancelled')) {
      return 'info';
    }
    
    // Warning level - recoverable states
    if (message.includes('already') || 
        message.includes('expired') || 
        message.includes('pending') ||
        message.includes('not enough') ||
        message.includes('threshold not met')) {
      return 'warning';
    }
    
    // Error level - serious issues
    return 'error';
  }
  
  /**
   * Get error icon for UI display
   */
  export function getErrorIcon(error: unknown): string {
    const severity = getErrorSeverity(error);
    
    switch (severity) {
      case 'info':
        return '💡'; // or use Lucide icon: Info
      case 'warning':
        return '⚠️'; // or use Lucide icon: AlertTriangle
      case 'error':
      default:
        return '❌'; // or use Lucide icon: AlertCircle
    }
  }
  
  /**
   * Get suggested actions for common errors
   */
  export function getErrorSuggestions(error: unknown): string[] {
    const message = parseCairoError(error).toLowerCase();
    
    if (isUserRejectionError(error)) {
      return ['Try the transaction again', 'Make sure you approve the transaction in your wallet'];
    }
    
    if (isInsufficientFundsError(error)) {
      return ['Add ETH to your wallet for transaction fees', 'Try again with a smaller transaction amount'];
    }
    
    if (isGuardiansAlreadySetupError(error)) {
      return ['Your guardians are already configured', 'Go to the recovery page if you need to recover your wallet'];
    }
    
    if (isGuardiansNotSetupError(error)) {
      return ['Set up guardians first before attempting recovery', 'Go to the setup page to configure your guardians'];
    }
    
    if (isInvalidGuardianError(error)) {
      return ['Ensure this address is one of your configured guardians', 'Check the guardian address is correct'];
    }
    
    if (isNetworkError(error)) {
      return ['Check your internet connection', 'Try again in a few moments', 'Switch to a different network if the issue persists'];
    }
    
    if (message.includes('threshold not met')) {
      return ['Get more guardians to approve the recovery', 'Check how many approvals are still needed'];
    }
    
    return ['Please try again', 'Contact support if the issue persists'];
  }
  
  /**
   * Format error for display in UI components
   */
  export interface FormattedError {
    message: string;
    severity: 'error' | 'warning' | 'info';
    icon: string;
    suggestions: string[];
    canRetry: boolean;
  }
  
  export function formatErrorForUI(error: unknown): FormattedError {
    const message = parseCairoError(error);
    const severity = getErrorSeverity(error);
    const icon = getErrorIcon(error);
    const suggestions = getErrorSuggestions(error);
    
    // Determine if user can retry
    const canRetry = !isUserRejectionError(error) && 
                     !isGuardiansAlreadySetupError(error) &&
                     !message.toLowerCase().includes('invalid');
    
    return {
      message,
      severity,
      icon,
      suggestions,
      canRetry
    };
  }