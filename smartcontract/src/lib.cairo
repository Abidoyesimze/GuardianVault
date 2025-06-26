use starknet::ContractAddress;

// Public structs and enums
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct RecoveryRequest {
    pub old_wallet: ContractAddress,
    pub new_wallet: ContractAddress,
    pub approvals: u32,
    pub status: RecoveryStatus,
    pub timestamp: u64,
}

#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum RecoveryStatus {
    #[default]
    None,
    Pending,
    Approved,
    Completed,
    Expired,
}

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct GuardianData {
    pub merkle_root: felt252,
    pub threshold: u32,
    pub is_setup: bool,
}

#[starknet::interface]
pub trait IRecoveryManager<TContractState> {
    // Guardian Management
    fn setup_guardians(ref self: TContractState, guardian_merkle_root: felt252, threshold: u32);
    fn get_guardian_root(self: @TContractState, wallet: ContractAddress) -> felt252;
    fn get_threshold(self: @TContractState, wallet: ContractAddress) -> u32;
    
    // Recovery Flow
    fn initiate_recovery(ref self: TContractState, old_wallet: ContractAddress, new_wallet: ContractAddress);
    fn approve_recovery(
        ref self: TContractState, 
        old_wallet: ContractAddress, 
        guardian_address: ContractAddress,
        signature_r: felt252,
        signature_s: felt252,
        merkle_proof: Array<felt252>
    );
    fn finalize_recovery(ref self: TContractState, old_wallet: ContractAddress) -> bool;
    
    // View Functions
    fn get_recovery_request(self: @TContractState, old_wallet: ContractAddress) -> RecoveryRequest;
    fn get_approval_count(self: @TContractState, old_wallet: ContractAddress) -> u32;
    fn is_recovery_approved(self: @TContractState, old_wallet: ContractAddress) -> bool;
}

#[starknet::contract]
pub mod RecoveryManager {
    use super::{IRecoveryManager, RecoveryRequest, RecoveryStatus, GuardianData};
    use starknet::{
        ContractAddress, get_caller_address, get_block_timestamp, get_contract_address,
        storage::{
            StoragePointerReadAccess, StoragePointerWriteAccess,
            StorageMapReadAccess, StorageMapWriteAccess, Map
        }
    };
    use core::poseidon::poseidon_hash_span;
    use core::traits::Into;
    use core::ecdsa::check_ecdsa_signature;

    #[storage]
    struct Storage {
        // Maps wallet address to guardian data
        guardian_data: Map<ContractAddress, GuardianData>,
        
        // Maps old_wallet to recovery request
        recovery_requests: Map<ContractAddress, RecoveryRequest>,
        
        // Maps (old_wallet, guardian) to approval status
        guardian_approvals: Map<(ContractAddress, ContractAddress), bool>,
        
        // Recovery timeout (24 hours)
        recovery_timeout: u64,
        
        // Contract owner
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        GuardiansSetup: GuardiansSetup,
        RecoveryInitiated: RecoveryInitiated,
        GuardianApproved: GuardianApproved,
        RecoveryCompleted: RecoveryCompleted,
        RecoveryExpired: RecoveryExpired,
    }

    #[derive(Drop, starknet::Event)]
    struct GuardiansSetup {
        #[key]
        wallet: ContractAddress,
        merkle_root: felt252,
        threshold: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct RecoveryInitiated {
        #[key]
        old_wallet: ContractAddress,
        new_wallet: ContractAddress,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct GuardianApproved {
        #[key]
        old_wallet: ContractAddress,
        #[key]
        guardian: ContractAddress,
        approvals_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct RecoveryCompleted {
        #[key]
        old_wallet: ContractAddress,
        new_wallet: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct RecoveryExpired {
        #[key]
        old_wallet: ContractAddress,
    }

    // Error constants
    const GUARDIANS_ALREADY_SETUP: felt252 = 'Guardians already setup';
    const GUARDIANS_NOT_SETUP: felt252 = 'Guardians not setup';
    const INVALID_THRESHOLD: felt252 = 'Invalid threshold';
    const RECOVERY_ALREADY_EXISTS: felt252 = 'Recovery already exists';
    const RECOVERY_NOT_FOUND: felt252 = 'Recovery not found';
    const RECOVERY_EXPIRED: felt252 = 'Recovery expired';
    const INVALID_MERKLE_PROOF: felt252 = 'Invalid merkle proof';
    const GUARDIAN_ALREADY_APPROVED: felt252 = 'Guardian already approved';
    const INVALID_SIGNATURE: felt252 = 'Invalid signature';
    const THRESHOLD_NOT_MET: felt252 = 'Threshold not met';
    const RECOVERY_NOT_APPROVED: felt252 = 'Recovery not approved';
    const ONLY_NEW_WALLET: felt252 = 'Only new wallet can finalize';

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        // Input validation
        assert(owner.into() != 0, 'Invalid owner address');
        
        self.owner.write(owner);
        self.recovery_timeout.write(86400); // 24 hours in seconds
    }

    #[abi(embed_v0)]
    impl RecoveryManagerImpl of IRecoveryManager<ContractState> {
        fn setup_guardians(ref self: ContractState, guardian_merkle_root: felt252, threshold: u32) {
            let caller = get_caller_address();
            
            // Input validation
            assert(guardian_merkle_root != 0, 'Invalid merkle root');
            assert(threshold > 0 && threshold <= 5, INVALID_THRESHOLD);
            assert(caller.into() != 0, 'Invalid caller address');
            
            let current_data = self.guardian_data.read(caller);
            assert(!current_data.is_setup, GUARDIANS_ALREADY_SETUP);

            let guardian_data = GuardianData {
                merkle_root: guardian_merkle_root,
                threshold,
                is_setup: true,
            };

            self.guardian_data.write(caller, guardian_data);

            self.emit(GuardiansSetup {
                wallet: caller,
                merkle_root: guardian_merkle_root,
                threshold,
            });
        }

        fn get_guardian_root(self: @ContractState, wallet: ContractAddress) -> felt252 {
            self.guardian_data.read(wallet).merkle_root
        }

        fn get_threshold(self: @ContractState, wallet: ContractAddress) -> u32 {
            self.guardian_data.read(wallet).threshold
        }

        fn initiate_recovery(ref self: ContractState, old_wallet: ContractAddress, new_wallet: ContractAddress) {
            let caller = get_caller_address();
            
            // Input validation
            assert(caller == new_wallet, 'Only new wallet can initiate');
            assert(old_wallet.into() != 0, 'Invalid old wallet address');
            assert(new_wallet.into() != 0, 'Invalid new wallet address');
            assert(old_wallet != new_wallet, 'Old and new wallet must differ');

            let guardian_data = self.guardian_data.read(old_wallet);
            assert(guardian_data.is_setup, GUARDIANS_NOT_SETUP);

            let current_request = self.recovery_requests.read(old_wallet);
            assert(current_request.status == RecoveryStatus::None, RECOVERY_ALREADY_EXISTS);

            let timestamp = get_block_timestamp();
            let recovery_request = RecoveryRequest {
                old_wallet,
                new_wallet,
                approvals: 0,
                status: RecoveryStatus::Pending,
                timestamp,
            };

            self.recovery_requests.write(old_wallet, recovery_request);

            self.emit(RecoveryInitiated {
                old_wallet,
                new_wallet,
                timestamp,
            });
        }

        fn approve_recovery(
            ref self: ContractState,
            old_wallet: ContractAddress,
            guardian_address: ContractAddress,
            signature_r: felt252,
            signature_s: felt252,
            merkle_proof: Array<felt252>
        ) {
            let caller = get_caller_address();
            
            // Input validation
            assert(caller == guardian_address, 'Only guardian can approve');
            assert(signature_r != 0, 'Invalid signature r');
            assert(signature_s != 0, 'Invalid signature s');
            assert(old_wallet.into() != 0, 'Invalid old wallet address');

            let mut recovery_request = self.recovery_requests.read(old_wallet);
            assert(recovery_request.status == RecoveryStatus::Pending, RECOVERY_NOT_FOUND);

            // Check if recovery has expired
            let current_time = get_block_timestamp();
            let timeout = self.recovery_timeout.read();
            assert(current_time <= recovery_request.timestamp + timeout, RECOVERY_EXPIRED);

            // Check if guardian already approved
            let already_approved = self.guardian_approvals.read((old_wallet, guardian_address));
            assert(!already_approved, GUARDIAN_ALREADY_APPROVED);

            // Verify guardian is in the merkle tree
            let guardian_data = self.guardian_data.read(old_wallet);
            let is_valid_guardian = self._verify_merkle_proof(
                guardian_address.into(),
                guardian_data.merkle_root,
                merkle_proof
            );
            assert(is_valid_guardian, INVALID_MERKLE_PROOF);

            // Verify signature
            let message_hash = self._get_recovery_message_hash(old_wallet, recovery_request.new_wallet);
            let is_valid_signature = self._verify_signature(
                message_hash,
                signature_r,
                signature_s,
                guardian_address
            );
            assert(is_valid_signature, INVALID_SIGNATURE);

            // Record approval
            self.guardian_approvals.write((old_wallet, guardian_address), true);
            recovery_request.approvals += 1;

            // Check if threshold is met
            if recovery_request.approvals >= guardian_data.threshold {
                recovery_request.status = RecoveryStatus::Approved;
            }

            self.recovery_requests.write(old_wallet, recovery_request);

            self.emit(GuardianApproved {
                old_wallet,
                guardian: guardian_address,
                approvals_count: recovery_request.approvals,
            });
        }

        fn finalize_recovery(ref self: ContractState, old_wallet: ContractAddress) -> bool {
            let caller = get_caller_address();
            
            // Input validation
            assert(old_wallet.into() != 0, 'Invalid old wallet address');
            
            let mut recovery_request = self.recovery_requests.read(old_wallet);
            
            // Security checks
            assert(caller == recovery_request.new_wallet, ONLY_NEW_WALLET);
            assert(recovery_request.status == RecoveryStatus::Approved, RECOVERY_NOT_APPROVED);

            // Check if recovery has expired
            let current_time = get_block_timestamp();
            let timeout = self.recovery_timeout.read();
            if current_time > recovery_request.timestamp + timeout {
                recovery_request.status = RecoveryStatus::Expired;
                self.recovery_requests.write(old_wallet, recovery_request);
                
                self.emit(RecoveryExpired { old_wallet });
                return false;
            }

            // Mark recovery as completed
            recovery_request.status = RecoveryStatus::Completed;
            self.recovery_requests.write(old_wallet, recovery_request);

            self.emit(RecoveryCompleted {
                old_wallet,
                new_wallet: recovery_request.new_wallet,
            });

            true
        }

        fn get_recovery_request(self: @ContractState, old_wallet: ContractAddress) -> RecoveryRequest {
            self.recovery_requests.read(old_wallet)
        }

        fn get_approval_count(self: @ContractState, old_wallet: ContractAddress) -> u32 {
            self.recovery_requests.read(old_wallet).approvals
        }

        fn is_recovery_approved(self: @ContractState, old_wallet: ContractAddress) -> bool {
            let request = self.recovery_requests.read(old_wallet);
            request.status == RecoveryStatus::Approved
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _verify_merkle_proof(
            self: @ContractState,
            leaf: felt252,
            root: felt252,
            proof: Array<felt252>
        ) -> bool {
            // Verify that the leaf is included in the Merkle tree with the given root
            // using the provided proof path
            
            if proof.len() == 0 {
                // If no proof provided, leaf must equal root (single-node tree)
                return leaf == root;
            }
            
            let mut current_hash = leaf;
            let mut i = 0;
            
            // Walk up the tree using the proof
            while i < proof.len() {
                let proof_element = *proof.at(i);
                
                // Ensure consistent ordering for hash computation
                // Smaller value goes first to maintain deterministic tree structure
                current_hash = if Into::<felt252, u256>::into(current_hash) <= Into::<felt252, u256>::into(proof_element) {
                    poseidon_hash_span(array![current_hash, proof_element].span())
                } else {
                    poseidon_hash_span(array![proof_element, current_hash].span())
                };
                
                i += 1;
            };
            
            // Final hash should match the stored root
            current_hash == root
        }

        fn _get_recovery_message_hash(
            self: @ContractState,
            old_wallet: ContractAddress,
            new_wallet: ContractAddress
        ) -> felt252 {
            // Create a structured message hash for signature verification
            // Include contract address to prevent cross-contract replay attacks
            let contract_address = get_contract_address();
            
            poseidon_hash_span(
                array![
                    'ZK_GUARDIANS_RECOVERY',     // Message type identifier
                    contract_address.into(),     // Contract address (prevents replay)
                    old_wallet.into(),           // Old wallet being recovered
                    new_wallet.into()            // New wallet receiving access
                ].span()
            )
        }

        fn _verify_signature(
            self: @ContractState,
            message_hash: felt252,
            signature_r: felt252,
            signature_s: felt252,
            guardian_address: ContractAddress
        ) -> bool {
            // Extract public key from guardian address
            // In StarkNet, addresses are derived from public keys
            let public_key = guardian_address.into();
            
            // Uses StarkNet's built-in ECDSA signature verification
            // This verifies that the signature (r,s) was created using the private key
            // corresponding to the public key, for the given message hash
            check_ecdsa_signature(
                message_hash,    // The hash that was signed
                public_key,      // Guardian's public key (derived from address)
                signature_r,     // R component of signature
                signature_s      // S component of signature
            )
        }
    }
}