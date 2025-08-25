# CLIX LC Smart Contracts Specification

## 📋 Overview

This document provides detailed specifications for all Soroban smart contracts in the CLIX Letter of Credit solution.

---

## 🏗️ Contract Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART CONTRACT LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  LCFactory          │  LetterOfCredit     │  EscrowManager      │
│  - Deploy LC        │  - LC Lifecycle     │  - Fund Management  │
│  - Registry         │  - State Machine    │  - Multi-Currency   │
│  - Access Control   │  - Event Emission   │  - Release Logic    │
├─────────────────────────────────────────────────────────────────┤
│  DocumentVerify     │  DisputeResolution  │  ComplianceCheck    │
│  - IPFS Hashes      │  - Arbitration      │  - KYC/AML          │
│  - Verification     │  - Evidence         │  - Sanctions        │
│  - Timestamps       │  - Multi-Sig       │  - Reporting        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Contract 1: LCFactory

### Purpose
Deploys and manages individual Letter of Credit contracts with proper access control and registry maintenance.

### State Structure
```rust
use soroban_sdk::{contract, contractimpl, Address, Env, Map, String, Vec, Symbol};

#[contract]
pub struct LCFactory;

#[derive(Clone)]
pub struct FactoryState {
    pub admin: Address,
    pub lc_registry: Map<String, Address>, // lc_id -> contract_address
    pub authorized_issuers: Vec<Address>,
    pub deployment_fee: i128,
    pub total_lcs_deployed: u64,
    pub paused: bool,
}

#[derive(Clone)]
pub struct LCDeploymentParams {
    pub lc_id: String,
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub currency: Address,
    pub expiry_date: u64,
    pub terms_hash: String,
    pub required_documents: Vec<String>,
}
```

### Functions
```rust
#[contractimpl]
impl LCFactory {
    /// Initialize the factory with admin
    pub fn initialize(env: Env, admin: Address, deployment_fee: i128) -> Self;
    
    /// Deploy a new LC contract
    pub fn deploy_lc(
        env: Env,
        params: LCDeploymentParams,
        arbiter: Address,
    ) -> Address;
    
    /// Get LC contract address by ID
    pub fn get_lc_address(env: Env, lc_id: String) -> Option<Address>;
    
    /// Register authorized issuer (banks/institutions)
    pub fn authorize_issuer(env: Env, issuer: Address);
    
    /// Emergency pause/unpause
    pub fn set_paused(env: Env, paused: bool);
    
    /// Get factory statistics
    pub fn get_stats(env: Env) -> FactoryStats;
}

#[derive(Clone)]
pub struct FactoryStats {
    pub total_deployed: u64,
    pub active_lcs: u64,
    pub total_volume: i128,
    pub authorized_issuers_count: u32,
}
```

---

## 📄 Contract 2: LetterOfCredit

### Purpose
Manages individual LC lifecycle from creation to completion, including escrow, document verification, and settlement.

### State Structure
```rust
#[contract]
pub struct LetterOfCredit;

#[derive(Clone, PartialEq, Eq)]
pub enum LCStatus {
    Created,
    Funded,
    Shipped,
    DocumentsSubmitted,
    Delivered,
    Completed,
    Disputed,
    Cancelled,
}

#[derive(Clone)]
pub struct LCState {
    // Identifiers
    pub lc_id: String,
    pub factory_address: Address,
    
    // Parties
    pub buyer: Address,
    pub seller: Address,
    pub issuing_bank: Option<Address>,
    pub confirming_bank: Option<Address>,
    pub arbiter: Address,
    
    // Financial Terms
    pub amount: i128,
    pub currency: Address,
    pub funded_amount: i128,
    
    // Commodity Details
    pub commodity: String,
    pub quantity: String,
    pub quality_specs: String,
    
    // Terms and Conditions
    pub terms_hash: String, // IPFS hash
    pub expiry_date: u64,
    pub latest_shipment_date: u64,
    pub required_documents: Vec<String>,
    pub special_conditions: String,
    
    // Status and Workflow
    pub status: LCStatus,
    pub buyer_signed: bool,
    pub seller_signed: bool,
    
    // Document Management
    pub submitted_documents: Map<String, DocumentInfo>,
    pub document_verification_deadline: u64,
    
    // Dispute Information
    pub dispute_raised: bool,
    pub dispute_raised_by: Option<Address>,
    pub dispute_evidence: Vec<String>,
    
    // Timestamps
    pub created_at: u64,
    pub funded_at: Option<u64>,
    pub shipped_at: Option<u64>,
    pub documents_submitted_at: Option<u64>,
    pub completed_at: Option<u64>,
    
    // Transaction References
    pub funding_tx_hash: Option<String>,
    pub settlement_tx_hash: Option<String>,
}

#[derive(Clone)]
pub struct DocumentInfo {
    pub document_type: String,
    pub ipfs_hash: String,
    pub submitted_by: Address,
    pub submitted_at: u64,
    pub verified: bool,
    pub verified_by: Option<Address>,
    pub verified_at: Option<u64>,
}
```

### Functions
```rust
#[contractimpl]
impl LetterOfCredit {
    /// Initialize LC with parameters
    pub fn initialize(
        env: Env,
        factory: Address,
        params: LCDeploymentParams,
        arbiter: Address,
    ) -> Self;
    
    /// Sign LC terms (buyer or seller)
    pub fn sign_terms(env: Env, signer: Address) -> Result<(), LCError>;
    
    /// Fund the LC (buyer only, after both signatures)
    pub fn fund_lc(env: Env, from: Address, amount: i128) -> Result<(), LCError>;
    
    /// Confirm shipment (seller only)
    pub fn confirm_shipment(
        env: Env,
        shipper: Address,
        tracking_number: String,
        shipped_date: u64,
    ) -> Result<(), LCError>;
    
    /// Submit required documents (seller only)
    pub fn submit_documents(
        env: Env,
        submitter: Address,
        documents: Vec<DocumentSubmission>,
    ) -> Result<(), LCError>;
    
    /// Verify document (authorized verifier only)
    pub fn verify_document(
        env: Env,
        verifier: Address,
        document_type: String,
        verified: bool,
        notes: String,
    ) -> Result<(), LCError>;
    
    /// Confirm delivery and release payment (buyer only)
    pub fn confirm_delivery(env: Env, buyer: Address) -> Result<(), LCError>;
    
    /// Raise dispute
    pub fn raise_dispute(
        env: Env,
        disputer: Address,
        reason: String,
        evidence_hashes: Vec<String>,
    ) -> Result<(), LCError>;
    
    /// Resolve dispute (arbiter only)
    pub fn resolve_dispute(
        env: Env,
        arbiter: Address,
        buyer_amount: i128,
        seller_amount: i128,
        resolution_notes: String,
    ) -> Result<(), LCError>;
    
    /// Cancel LC (before funding only)
    pub fn cancel_lc(env: Env, canceller: Address) -> Result<(), LCError>;
    
    /// Get complete LC state
    pub fn get_lc_info(env: Env) -> LCState;
    
    /// Get current status
    pub fn get_status(env: Env) -> LCStatus;
    
    /// Check if document requirements are met
    pub fn check_document_compliance(env: Env) -> DocumentCompliance;
}

#[derive(Clone)]
pub struct DocumentSubmission {
    pub document_type: String,
    pub ipfs_hash: String,
    pub file_name: String,
    pub file_size: u64,
}

#[derive(Clone)]
pub struct DocumentCompliance {
    pub all_required_submitted: bool,
    pub all_documents_verified: bool,
    pub missing_documents: Vec<String>,
    pub unverified_documents: Vec<String>,
}

#[derive(Clone, PartialEq, Eq)]
pub enum LCError {
    NotAuthorized,
    InvalidState,
    AlreadySigned,
    InsufficientFunds,
    ExpiredLC,
    DocumentNotFound,
    DisputeAlreadyRaised,
    InvalidAmount,
    CannotCancel,
}
```

---

## 📄 Contract 3: EscrowManager

### Purpose
Manages multi-currency escrow funds with secure release mechanisms and partial payment support.

### State Structure
```rust
#[contract]
pub struct EscrowManager;

#[derive(Clone)]
pub struct EscrowAccount {
    pub lc_contract: Address,
    pub currency: Address,
    pub total_amount: i128,
    pub available_amount: i128,
    pub locked_amount: i128,
    pub buyer: Address,
    pub seller: Address,
    pub created_at: u64,
    pub auto_release_date: Option<u64>,
}

#[derive(Clone)]
pub struct ReleaseInstruction {
    pub lc_contract: Address,
    pub recipient: Address,
    pub amount: i128,
    pub currency: Address,
    pub release_type: ReleaseType,
    pub authorization_hash: String,
}

#[derive(Clone, PartialEq, Eq)]
pub enum ReleaseType {
    Complete,
    Partial,
    Dispute,
    Refund,
}
```

### Functions
```rust
#[contractimpl]
impl EscrowManager {
    /// Create escrow account for LC
    pub fn create_escrow(
        env: Env,
        lc_contract: Address,
        buyer: Address,
        seller: Address,
        currency: Address,
        auto_release_date: Option<u64>,
    ) -> Result<(), EscrowError>;
    
    /// Deposit funds into escrow
    pub fn deposit(
        env: Env,
        lc_contract: Address,
        from: Address,
        amount: i128,
        currency: Address,
    ) -> Result<(), EscrowError>;
    
    /// Release funds from escrow
    pub fn release_funds(
        env: Env,
        instruction: ReleaseInstruction,
    ) -> Result<(), EscrowError>;
    
    /// Get escrow balance
    pub fn get_balance(
        env: Env,
        lc_contract: Address,
        currency: Address,
    ) -> i128;
    
    /// Lock partial amount for dispute
    pub fn lock_funds(
        env: Env,
        lc_contract: Address,
        amount: i128,
    ) -> Result<(), EscrowError>;
    
    /// Unlock funds after dispute resolution
    pub fn unlock_funds(
        env: Env,
        lc_contract: Address,
        amount: i128,
    ) -> Result<(), EscrowError>;
    
    /// Emergency withdrawal (admin only)
    pub fn emergency_withdraw(
        env: Env,
        lc_contract: Address,
        recipient: Address,
        reason: String,
    ) -> Result<(), EscrowError>;
}
```

---

## 📄 Contract 4: DocumentVerification

### Purpose
Manages document submission, verification, and IPFS hash integrity checks.

### State Structure
```rust
#[contract]
pub struct DocumentVerification;

#[derive(Clone)]
pub struct DocumentRegistry {
    pub lc_contract: Address,
    pub documents: Map<String, DocumentRecord>,
    pub verifiers: Vec<Address>,
    pub verification_deadline: u64,
}

#[derive(Clone)]
pub struct DocumentRecord {
    pub document_type: String,
    pub ipfs_hash: String,
    pub submitted_by: Address,
    pub submitted_at: u64,
    pub file_metadata: FileMetadata,
    pub verification_status: VerificationStatus,
    pub verifications: Vec<VerificationEntry>,
}

#[derive(Clone)]
pub struct FileMetadata {
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub checksum: String,
}

#[derive(Clone)]
pub struct VerificationEntry {
    pub verifier: Address,
    pub verified: bool,
    pub notes: String,
    pub verified_at: u64,
}

#[derive(Clone, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    Verified,
    Rejected,
    RequiresResubmission,
}
```

### Functions
```rust
#[contractimpl]
impl DocumentVerification {
    /// Register document registry for LC
    pub fn create_registry(
        env: Env,
        lc_contract: Address,
        required_documents: Vec<String>,
        verifiers: Vec<Address>,
        deadline: u64,
    ) -> Result<(), DocumentError>;
    
    /// Submit document
    pub fn submit_document(
        env: Env,
        lc_contract: Address,
        document: DocumentSubmission,
        metadata: FileMetadata,
    ) -> Result<(), DocumentError>;
    
    /// Verify document
    pub fn verify_document(
        env: Env,
        lc_contract: Address,
        document_type: String,
        verifier: Address,
        verified: bool,
        notes: String,
    ) -> Result<(), DocumentError>;
    
    /// Check if all documents are verified
    pub fn check_compliance(
        env: Env,
        lc_contract: Address,
    ) -> DocumentCompliance;
    
    /// Get document by type
    pub fn get_document(
        env: Env,
        lc_contract: Address,
        document_type: String,
    ) -> Option<DocumentRecord>;
    
    /// Add authorized verifier
    pub fn add_verifier(
        env: Env,
        lc_contract: Address,
        verifier: Address,
    ) -> Result<(), DocumentError>;
}
```

---

## 📄 Contract 5: DisputeResolution

### Purpose
Handles dispute lifecycle, evidence submission, and arbitration with multi-signature resolution.

### State Structure
```rust
#[contract]
pub struct DisputeResolution;

#[derive(Clone)]
pub struct DisputeCase {
    pub dispute_id: String,
    pub lc_contract: Address,
    pub raised_by: Address,
    pub raised_at: u64,
    pub reason: String,
    pub status: DisputeStatus,
    pub evidence: Vec<EvidenceItem>,
    pub arbitrators: Vec<Address>,
    pub required_signatures: u32,
    pub resolution: Option<DisputeResolution>,
}

#[derive(Clone)]
pub struct EvidenceItem {
    pub submitted_by: Address,
    pub evidence_type: String,
    pub ipfs_hash: String,
    pub description: String,
    pub submitted_at: u64,
}

#[derive(Clone)]
pub struct DisputeResolutionDecision {
    pub dispute_id: String,
    pub arbitrator: Address,
    pub buyer_amount: i128,
    pub seller_amount: i128,
    pub reasoning: String,
    pub signature: String,
    pub decided_at: u64,
}

#[derive(Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Open,
    UnderReview,
    AwaitingEvidence,
    Resolved,
    Appealed,
}
```

### Functions
```rust
#[contractimpl]
impl DisputeResolution {
    /// Create dispute case
    pub fn create_dispute(
        env: Env,
        lc_contract: Address,
        raised_by: Address,
        reason: String,
        initial_evidence: Vec<EvidenceItem>,
        arbitrators: Vec<Address>,
        required_signatures: u32,
    ) -> Result<String, DisputeError>; // Returns dispute_id
    
    /// Submit additional evidence
    pub fn submit_evidence(
        env: Env,
        dispute_id: String,
        evidence: EvidenceItem,
    ) -> Result<(), DisputeError>;
    
    /// Arbitrator decision
    pub fn submit_decision(
        env: Env,
        dispute_id: String,
        decision: DisputeResolutionDecision,
    ) -> Result<(), DisputeError>;
    
    /// Execute resolution after sufficient signatures
    pub fn execute_resolution(
        env: Env,
        dispute_id: String,
    ) -> Result<(), DisputeError>;
    
    /// Appeal resolution (within time window)
    pub fn appeal_resolution(
        env: Env,
        dispute_id: String,
        appellant: Address,
        appeal_reason: String,
    ) -> Result<(), DisputeError>;
    
    /// Get dispute details
    pub fn get_dispute(
        env: Env,
        dispute_id: String,
    ) -> Option<DisputeCase>;
}
```

---

## 📄 Contract 6: ComplianceCheck

### Purpose
Handles KYC/AML verification, sanctions screening, and regulatory compliance for LC participants.

### State Structure
```rust
#[contract]
pub struct ComplianceCheck;

#[derive(Clone)]
pub struct ComplianceRecord {
    pub user_address: Address,
    pub kyc_status: KYCStatus,
    pub aml_status: AMLStatus,
    pub sanctions_status: SanctionsStatus,
    pub jurisdiction: String,
    pub risk_score: u32,
    pub last_updated: u64,
    pub expiry_date: u64,
}

#[derive(Clone, PartialEq, Eq)]
pub enum KYCStatus {
    NotVerified,
    Pending,
    Verified,
    Rejected,
    Expired,
}

#[derive(Clone, PartialEq, Eq)]
pub enum AMLStatus {
    NotChecked,
    Cleared,
    UnderReview,
    Flagged,
    Blocked,
}

#[derive(Clone, PartialEq, Eq)]
pub enum SanctionsStatus {
    NotChecked,
    Cleared,
    UnderReview,
    Sanctioned,
}
```

### Functions
```rust
#[contractimpl]
impl ComplianceCheck {
    /// Update user compliance status
    pub fn update_compliance(
        env: Env,
        user: Address,
        compliance: ComplianceRecord,
        verifier: Address,
    ) -> Result<(), ComplianceError>;
    
    /// Check if user can participate in LC
    pub fn can_participate(
        env: Env,
        user: Address,
        lc_amount: i128,
        currency: Address,
    ) -> Result<bool, ComplianceError>;
    
    /// Perform transaction compliance check
    pub fn check_transaction(
        env: Env,
        buyer: Address,
        seller: Address,
        amount: i128,
        currency: Address,
        jurisdiction: String,
    ) -> Result<ComplianceResult, ComplianceError>;
    
    /// Get compliance status
    pub fn get_compliance_status(
        env: Env,
        user: Address,
    ) -> Option<ComplianceRecord>;
}

#[derive(Clone)]
pub struct ComplianceResult {
    pub approved: bool,
    pub risk_level: RiskLevel,
    pub required_actions: Vec<String>,
    pub monitoring_required: bool,
}

#[derive(Clone, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}
```

---

## 🔄 Contract Interaction Flow

### 1. LC Creation Flow
```rust
// 1. Factory deploys LC contract
let lc_address = factory.deploy_lc(env, params, arbiter);

// 2. Both parties sign terms
lc_contract.sign_terms(env, buyer);
lc_contract.sign_terms(env, seller);

// 3. Compliance check
compliance.can_participate(env, buyer, amount, currency)?;

// 4. Create escrow account
escrow.create_escrow(env, lc_address, buyer, seller, currency, None);

// 5. Fund LC
lc_contract.fund_lc(env, buyer, amount)?;
```

### 2. LC Execution Flow
```rust
// 1. Seller ships goods
lc_contract.confirm_shipment(env, seller, tracking, date)?;

// 2. Submit documents
let documents = vec![DocumentSubmission { /* ... */ }];
lc_contract.submit_documents(env, seller, documents)?;

// 3. Verify documents
doc_verify.verify_document(env, lc_address, doc_type, verifier, true, notes)?;

// 4. Buyer confirms or disputes
if satisfied {
    lc_contract.confirm_delivery(env, buyer)?; // Releases payment
} else {
    lc_contract.raise_dispute(env, buyer, reason, evidence)?;
}
```

### 3. Dispute Resolution Flow
```rust
// 1. Create dispute case
let dispute_id = dispute_resolution.create_dispute(
    env, lc_address, buyer, reason, evidence, arbitrators, 2
)?;

// 2. Submit additional evidence
dispute_resolution.submit_evidence(env, dispute_id, additional_evidence)?;

// 3. Arbitrators make decisions
for arbitrator in arbitrators {
    let decision = DisputeResolutionDecision { /* ... */ };
    dispute_resolution.submit_decision(env, dispute_id, decision)?;
}

// 4. Execute resolution when threshold met
dispute_resolution.execute_resolution(env, dispute_id)?;
```

---

## ⚙️ Deployment Configuration

### Contract Deployment Order
1. **ComplianceCheck** (no dependencies)
2. **EscrowManager** (no dependencies)
3. **DocumentVerification** (no dependencies)
4. **DisputeResolution** (no dependencies)
5. **LetterOfCredit** (depends on all above)
6. **LCFactory** (depends on LetterOfCredit)

### Testnet Deployment Script
```bash
#!/bin/bash

# Deploy contracts in correct order
soroban contract deploy --wasm compliance_check.wasm --network testnet
soroban contract deploy --wasm escrow_manager.wasm --network testnet
soroban contract deploy --wasm document_verification.wasm --network testnet
soroban contract deploy --wasm dispute_resolution.wasm --network testnet
soroban contract deploy --wasm letter_of_credit.wasm --network testnet
soroban contract deploy --wasm lc_factory.wasm --network testnet
```

---

## 🧪 Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_lc_lifecycle() {
        let env = Env::default();
        let factory = LCFactory::new(&env);
        
        // Test complete LC flow
        let lc_address = factory.deploy_lc(&env, params);
        // ... comprehensive test scenarios
    }
    
    #[test]
    fn test_dispute_resolution() {
        // Test dispute creation and resolution
    }
    
    #[test]
    fn test_document_verification() {
        // Test document submission and verification
    }
}
```

### Integration Tests
```rust
#[test]
fn test_complete_lc_workflow() {
    // End-to-end LC test from creation to completion
}

#[test]
fn test_multi_currency_escrow() {
    // Test escrow with different currencies
}

#[test]
fn test_compliance_integration() {
    // Test compliance checks throughout LC lifecycle
}
```

---

**Contract Specifications Status**: ✅ Complete and Ready for Implementation  
**Next Step**: Begin Rust contract development with testing framework  
**Estimated Development Time**: 3-4 weeks for all contracts

---

*These specifications provide complete technical details for implementing all smart contracts in the CLIX LC solution.*