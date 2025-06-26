use starknet::{ContractAddress, contract_address_const};
use core::poseidon::poseidon_hash_span;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use smartcontract::{
    IRecoveryManagerDispatcher, IRecoveryManagerDispatcherTrait,
    RecoveryStatus
};

// Simple test constants
fn OWNER() -> ContractAddress { 
    contract_address_const::<0x123>() 
}

fn USER() -> ContractAddress { 
    contract_address_const::<0x456>() 
}

fn NEW_USER() -> ContractAddress { 
    contract_address_const::<0x789>() 
}

fn GUARDIAN1() -> ContractAddress { 
    contract_address_const::<0xabc>() 
}

fn GUARDIAN2() -> ContractAddress { 
    contract_address_const::<0xdef>() 
}

fn GUARDIAN3() -> ContractAddress { 
    contract_address_const::<0x111>() 
}

fn deploy_contract() -> IRecoveryManagerDispatcher {
    let declare_result = declare("RecoveryManager").unwrap();
    let contract_class = declare_result.contract_class();
    let constructor_args = array![OWNER().into()];
    let (contract_address, _) = contract_class.deploy(@constructor_args).unwrap();
    IRecoveryManagerDispatcher { contract_address }
}

fn create_simple_merkle_root() -> felt252 {
    // Simple merkle root for testing
    poseidon_hash_span(array![
        GUARDIAN1().into(),
        GUARDIAN2().into(), 
        GUARDIAN3().into()
    ].span())
}

#[test]
fn test_basic_guardian_setup() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    assert(contract.get_guardian_root(USER()) == root, 'Root match');
    assert(contract.get_threshold(USER()) == 2, 'Threshold 2');
}

#[test]
fn test_basic_recovery_initiation() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    // Setup
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    // Initiate recovery
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
    
    let request = contract.get_recovery_request(USER());
    assert(request.old_wallet == USER(), 'Old wallet match');
    assert(request.new_wallet == NEW_USER(), 'New wallet match');
    assert(request.status == RecoveryStatus::Pending, 'Status pending');
}

#[test]
#[should_panic(expected: ('Invalid threshold',))]
fn test_invalid_threshold() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 0); // Invalid threshold
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Invalid merkle root',))]
fn test_invalid_merkle_root() {
    let contract = deploy_contract();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(0, 2); // Invalid root
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_recovery_status_transitions() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    // Setup
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    // Initial state
    let initial_request = contract.get_recovery_request(USER());
    assert(initial_request.status == RecoveryStatus::None, 'Start None');
    
    // After initiation
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
    
    let pending_request = contract.get_recovery_request(USER());
    assert(pending_request.status == RecoveryStatus::Pending, 'Now Pending');
}

#[test]
fn test_guardian_data_storage() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    // Before setup
    assert(contract.get_guardian_root(USER()) == 0, 'Start 0 root');
    assert(contract.get_threshold(USER()) == 0, 'Start 0 threshold');
    
    // After setup
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 3);
    stop_cheat_caller_address(contract.contract_address);
    
    assert(contract.get_guardian_root(USER()) == root, 'Root stored');
    assert(contract.get_threshold(USER()) == 3, 'Threshold stored');
}

#[test] 
fn test_recovery_flow_structure() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    // 1. Setup guardians
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    // 2. Initiate recovery  
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
    
    // 3. Check initial state
    let request = contract.get_recovery_request(USER());
    assert(request.approvals == 0, 'Start 0 approvals');
    assert(request.status == RecoveryStatus::Pending, 'Status pending');
    
    // 4. Verify guardian data is accessible
    let guardian_data_root = contract.get_guardian_root(USER());
    let threshold = contract.get_threshold(USER());
    assert(guardian_data_root == root, 'Guardian root match');
    assert(threshold == 2, 'Threshold 2');
}

#[test]
fn test_contract_deployment() {
    let contract = deploy_contract();
    
    // Contract should be deployed and accessible
    let zero_address = contract_address_const::<0x0>();
    let root = contract.get_guardian_root(zero_address);
    
    // Should return 0 for non-existent guardian data
    assert(root == 0, 'Return 0');
}

#[test]
#[should_panic(expected: ('Guardians already setup',))]
fn test_duplicate_guardian_setup() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    
    // Try to setup again - should panic
    contract.setup_guardians(root, 3);
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Old and new wallet must differ',))]
fn test_same_wallet_recovery() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    
    // Try to recover to same wallet
    contract.initiate_recovery(USER(), USER());
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Guardians not setup',))]
fn test_recovery_without_guardians() {
    let contract = deploy_contract();
    
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Recovery already exists',))]
fn test_duplicate_recovery_initiation() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    
    // Try to initiate again - should panic
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_approval_count_tracking() {
    let contract = deploy_contract();
    let root = create_simple_merkle_root();
    
    start_cheat_caller_address(contract.contract_address, USER());
    contract.setup_guardians(root, 2);
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, NEW_USER());
    contract.initiate_recovery(USER(), NEW_USER());
    stop_cheat_caller_address(contract.contract_address);
    
    // Check initial approval count
    let initial_count = contract.get_approval_count(USER());
    assert(initial_count == 0, 'Start 0 approvals');
    
    // Check recovery approval status
    let is_approved = contract.is_recovery_approved(USER());
    assert(!is_approved, 'Not approved yet');
}
