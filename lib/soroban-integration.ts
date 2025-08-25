/**
 * CLIX Trade Finance - Soroban Smart Contract Integration
 * 
 * This module provides TypeScript integration between the frontend LC system
 * and the deployed Soroban smart contracts.
 */

import { 
  Soroban as SorobanRpc, 
  Contract, 
  Address, 
  nativeToScVal, 
  scValToNative,
  xdr,
  Networks,
  TransactionBuilder,
  Keypair,
  Operation
} from '@stellar/stellar-sdk';

//=============================================================================
// Types and Interfaces
//=============================================================================

export interface ContractConfig {
  letterOfCreditId: string;
  documentVerificationId: string;
  disputeResolutionId: string;
  escrowManagerId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export interface LCContractData {
  lc_id: string;
  buyer: string;
  seller: string;
  issuing_bank: string;
  advising_bank?: string;
  amount: bigint;
  currency: string;
  commodity: CommodityDetails;
  terms: LCTerms;
  status: LCStatus;
  creation_timestamp: number;
  expiry_date: number;
  documents: DocumentReference[];
  amendments: Amendment[];
}

export interface CommodityDetails {
  description: string;
  quantity: string;
  unit_price: bigint;
  incoterms: string;
  origin: string;
  destination: string;
}

export interface LCTerms {
  payment_terms: string;
  partial_shipments: boolean;
  transshipment: boolean;
  latest_shipment_date: number;
  document_presentation_days: number;
  confirmation_required: boolean;
}

export interface DocumentReference {
  doc_type: string;
  ipfs_hash: string;
  submitted_by: string;
  submission_timestamp: number;
  verified: boolean;
  verification_timestamp?: number;
}

export interface Amendment {
  amendment_id: number;
  description: string;
  proposed_by: string;
  timestamp: number;
  accepted_by_buyer: boolean;
  accepted_by_seller: boolean;
  accepted_by_bank: boolean;
}

export enum LCStatus {
  Draft = "Draft",
  Issued = "Issued",
  Funded = "Funded",
  Shipping = "Shipping",
  DocumentsSubmitted = "DocumentsSubmitted",
  DocumentsVerified = "DocumentsVerified",
  PaymentReleased = "PaymentReleased",
  Completed = "Completed",
  Disputed = "Disputed",
  Cancelled = "Cancelled",
  Expired = "Expired"
}

export interface CreateLCParams {
  buyer: string;
  seller: string;
  issuing_bank: string;
  advising_bank?: string;
  amount: bigint;
  currency: string;
  commodity: CommodityDetails;
  terms: LCTerms;
  expiry_date: number;
}

export interface ContractResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
}

//=============================================================================
// Main Contract Client
//=============================================================================

export class SorobanLCClient {
  private server: any;
  private config: ContractConfig;
  private lcContract: Contract;
  private docContract: Contract;
  private disputeContract: Contract;
  private escrowContract: Contract;

  constructor(config: ContractConfig) {
    this.config = config;
    this.server = new (SorobanRpc as any).Server(config.rpcUrl);
    
    // Initialize contract instances
    this.lcContract = new Contract(config.letterOfCreditId);
    this.docContract = new Contract(config.documentVerificationId);
    this.disputeContract = new Contract(config.disputeResolutionId);
    this.escrowContract = new Contract(config.escrowManagerId);
  }

  //===========================================================================
  // Letter of Credit Functions
  //===========================================================================

  /**
   * Create a new Letter of Credit
   */
  async createLC(
    params: CreateLCParams,
    sourceKeypair: Keypair
  ): Promise<ContractResponse<string>> {
    try {
      const account = await this.server.getAccount(sourceKeypair.publicKey());
      
      const operation = this.lcContract.call(
        'create_lc',
        nativeToScVal(params.buyer, { type: 'address' }),
        nativeToScVal(params.seller, { type: 'address' }),
        nativeToScVal(params.issuing_bank, { type: 'address' }),
        params.advising_bank 
          ? nativeToScVal(params.advising_bank, { type: 'address' })
          : nativeToScVal(null),
        nativeToScVal(params.amount, { type: 'i128' }),
        nativeToScVal(params.currency, { type: 'address' }),
        nativeToScVal(params.commodity),
        nativeToScVal(params.terms),
        nativeToScVal(params.expiry_date, { type: 'u64' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      preparedTransaction.sign(sourceKeypair);

      const response = await this.server.sendTransaction(preparedTransaction);
      
      if (response.status === 'SUCCESS') {
        // Extract LC ID from response
        const lcId = this.extractLCIdFromResponse(response);
        return {
          success: true,
          data: lcId,
          transactionHash: response.hash
        };
      } else {
        return {
          success: false,
          error: `Transaction failed: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create LC: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Fund an LC with escrow
   */
  async fundLC(
    lcId: string,
    funderKeypair: Keypair
  ): Promise<ContractResponse<void>> {
    try {
      const account = await this.server.getAccount(funderKeypair.publicKey());
      
      const operation = this.lcContract.call(
        'fund_lc',
        nativeToScVal(lcId, { type: 'string' }),
        nativeToScVal(funderKeypair.publicKey(), { type: 'address' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      preparedTransaction.sign(funderKeypair);

      const response = await this.server.sendTransaction(preparedTransaction);
      
      return {
        success: response.status === 'SUCCESS',
        transactionHash: response.hash,
        error: response.status !== 'SUCCESS' ? response.status : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fund LC: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Submit document for LC
   */
  async submitDocument(
    lcId: string,
    docType: string,
    ipfsHash: string,
    submitterKeypair: Keypair
  ): Promise<ContractResponse<void>> {
    try {
      const account = await this.server.getAccount(submitterKeypair.publicKey());
      
      const operation = this.lcContract.call(
        'submit_document',
        nativeToScVal(lcId, { type: 'string' }),
        nativeToScVal(submitterKeypair.publicKey(), { type: 'address' }),
        nativeToScVal(docType, { type: 'string' }),
        nativeToScVal(ipfsHash, { type: 'string' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      preparedTransaction.sign(submitterKeypair);

      const response = await this.server.sendTransaction(preparedTransaction);
      
      return {
        success: response.status === 'SUCCESS',
        transactionHash: response.hash,
        error: response.status !== 'SUCCESS' ? response.status : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to submit document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Verify documents (bank function)
   */
  async verifyDocuments(
    lcId: string,
    verifierKeypair: Keypair
  ): Promise<ContractResponse<void>> {
    try {
      const account = await this.server.getAccount(verifierKeypair.publicKey());
      
      const operation = this.lcContract.call(
        'verify_documents',
        nativeToScVal(lcId, { type: 'string' }),
        nativeToScVal(verifierKeypair.publicKey(), { type: 'address' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      preparedTransaction.sign(verifierKeypair);

      const response = await this.server.sendTransaction(preparedTransaction);
      
      return {
        success: response.status === 'SUCCESS',
        transactionHash: response.hash,
        error: response.status !== 'SUCCESS' ? response.status : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify documents: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Release payment to seller
   */
  async releasePayment(
    lcId: string,
    releaserKeypair: Keypair
  ): Promise<ContractResponse<void>> {
    try {
      const account = await this.server.getAccount(releaserKeypair.publicKey());
      
      const operation = this.lcContract.call(
        'release_payment',
        nativeToScVal(lcId, { type: 'string' }),
        nativeToScVal(releaserKeypair.publicKey(), { type: 'address' })
      );

      const transaction = new TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      preparedTransaction.sign(releaserKeypair);

      const response = await this.server.sendTransaction(preparedTransaction);
      
      return {
        success: response.status === 'SUCCESS',
        transactionHash: response.hash,
        error: response.status !== 'SUCCESS' ? response.status : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to release payment: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  //===========================================================================
  // Query Functions
  //===========================================================================

  /**
   * Get LC details
   */
  async getLCDetails(lcId: string): Promise<ContractResponse<LCContractData>> {
    try {
      const response = await this.server.simulateTransaction(
        new TransactionBuilder(
          await this.server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
          {
            fee: '1000000',
            networkPassphrase: this.config.networkPassphrase,
          }
        )
          .addOperation(
            this.lcContract.call(
              'get_lc_details',
              nativeToScVal(lcId, { type: 'string' })
            )
          )
          .setTimeout(30)
          .build()
      );

      if (response.results?.[0]?.result) {
        const lcData = scValToNative(response.results[0].result.retval);
        return {
          success: true,
          data: this.transformLCData(lcData)
        };
      } else {
        return {
          success: false,
          error: 'LC not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get LC details: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get participant's LCs
   */
  async getParticipantLCs(
    participant: string,
    role: 'buyer' | 'seller' | 'bank'
  ): Promise<ContractResponse<string[]>> {
    try {
      const response = await this.server.simulateTransaction(
        new TransactionBuilder(
          await this.server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
          {
            fee: '1000000',
            networkPassphrase: this.config.networkPassphrase,
          }
        )
          .addOperation(
            this.lcContract.call(
              'get_participant_lcs',
              nativeToScVal(participant, { type: 'address' }),
              nativeToScVal(role, { type: 'string' })
            )
          )
          .setTimeout(30)
          .build()
      );

      if (response.results?.[0]?.result) {
        const lcIds = scValToNative(response.results[0].result.retval);
        return {
          success: true,
          data: lcIds
        };
      } else {
        return {
          success: true,
          data: []
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get participant LCs: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get escrow balance
   */
  async getEscrowBalance(lcId: string): Promise<ContractResponse<bigint>> {
    try {
      const response = await this.server.simulateTransaction(
        new TransactionBuilder(
          await this.server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
          {
            fee: '1000000',
            networkPassphrase: this.config.networkPassphrase,
          }
        )
          .addOperation(
            this.lcContract.call(
              'get_escrow_balance',
              nativeToScVal(lcId, { type: 'string' })
            )
          )
          .setTimeout(30)
          .build()
      );

      if (response.results?.[0]?.result) {
        const balance = scValToNative(response.results[0].result.retval);
        return {
          success: true,
          data: BigInt(balance)
        };
      } else {
        return {
          success: true,
          data: BigInt(0)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get escrow balance: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  //===========================================================================
  // Utility Functions
  //===========================================================================

  private extractLCIdFromResponse(response: any): string {
    // Extract LC ID from transaction response
    // This would parse the response to get the generated LC ID
    try {
      if (response.results?.[0]?.result) {
        const result = scValToNative(response.results[0].result.retval);
        if (typeof result === 'string') {
          return result;
        }
      }
    } catch (error) {
      console.warn('Could not extract LC ID from response', error);
    }
    
    // Fallback: generate a temporary ID based on transaction hash
    return `LC_${response.hash.substring(0, 8)}`;
  }

  private transformLCData(rawData: any): LCContractData {
    // Transform raw contract data to typed interface
    return {
      lc_id: rawData.lc_id,
      buyer: rawData.buyer,
      seller: rawData.seller,
      issuing_bank: rawData.issuing_bank,
      advising_bank: rawData.advising_bank || undefined,
      amount: BigInt(rawData.amount),
      currency: rawData.currency,
      commodity: rawData.commodity,
      terms: rawData.terms,
      status: rawData.status,
      creation_timestamp: rawData.creation_timestamp,
      expiry_date: rawData.expiry_date,
      documents: rawData.documents || [],
      amendments: rawData.amendments || []
    };
  }

  /**
   * Get contract configuration
   */
  getConfig(): ContractConfig {
    return { ...this.config };
  }

  /**
   * Update RPC endpoint
   */
  updateRpcUrl(rpcUrl: string): void {
    this.config.rpcUrl = rpcUrl;
    this.server = new (SorobanRpc as any).Server(rpcUrl);
  }
}

//=============================================================================
// Factory Functions
//=============================================================================

/**
 * Create client for testnet
 */
export function createTestnetClient(contractIds: {
  letterOfCredit: string;
  documentVerification: string;
  disputeResolution: string;
  escrowManager: string;
}): SorobanLCClient {
  return new SorobanLCClient({
    letterOfCreditId: contractIds.letterOfCredit,
    documentVerificationId: contractIds.documentVerification,
    disputeResolutionId: contractIds.disputeResolution,
    escrowManagerId: contractIds.escrowManager,
    rpcUrl: 'https://soroban-testnet.stellar.org:443',
    networkPassphrase: Networks.TESTNET
  });
}

/**
 * Create client for mainnet
 */
export function createMainnetClient(contractIds: {
  letterOfCredit: string;
  documentVerification: string;
  disputeResolution: string;
  escrowManager: string;
}): SorobanLCClient {
  return new SorobanLCClient({
    letterOfCreditId: contractIds.letterOfCredit,
    documentVerificationId: contractIds.documentVerification,
    disputeResolutionId: contractIds.disputeResolution,
    escrowManagerId: contractIds.escrowManager,
    rpcUrl: 'https://mainnet.sorobanrpc.com:443',
    networkPassphrase: Networks.PUBLIC
  });
}

/**
 * Create client for local development
 */
export function createLocalClient(contractIds: {
  letterOfCredit: string;
  documentVerification: string;
  disputeResolution: string;
  escrowManager: string;
}): SorobanLCClient {
  return new SorobanLCClient({
    letterOfCreditId: contractIds.letterOfCredit,
    documentVerificationId: contractIds.documentVerification,
    disputeResolutionId: contractIds.disputeResolution,
    escrowManagerId: contractIds.escrowManager,
    rpcUrl: 'http://localhost:8000/soroban/rpc',
    networkPassphrase: 'Local Network ; April 2025'
  });
}

//=============================================================================
// Integration Helpers
//=============================================================================

/**
 * Convert from existing LC interface to contract format
 */
export function transformToContractLC(
  existingLC: any
): CreateLCParams {
  return {
    buyer: existingLC.buyerAddress,
    seller: existingLC.sellerAddress,
    issuing_bank: existingLC.issuingBankAddress,
    advising_bank: existingLC.advisingBankAddress,
    amount: BigInt(Math.round(existingLC.amount * 10_000_000)), // Convert to Stellar precision
    currency: existingLC.currency.contractAddress,
    commodity: {
      description: existingLC.commodity.description,
      quantity: existingLC.commodity.quantity,
      unit_price: BigInt(Math.round(existingLC.commodity.unitPrice * 10_000_000)),
      incoterms: existingLC.terms.incoterms,
      origin: existingLC.commodity.origin,
      destination: existingLC.commodity.destination
    },
    terms: {
      payment_terms: existingLC.terms.paymentTerms,
      partial_shipments: existingLC.terms.partialShipments,
      transshipment: existingLC.terms.transshipment,
      latest_shipment_date: Math.floor(new Date(existingLC.terms.latestShipmentDate).getTime() / 1000),
      document_presentation_days: existingLC.terms.documentPresentationDays,
      confirmation_required: existingLC.terms.confirmationRequired
    },
    expiry_date: Math.floor(new Date(existingLC.expiryDate).getTime() / 1000)
  };
}

/**
 * Convert from contract LC to existing interface format
 */
export function transformFromContractLC(
  contractLC: LCContractData
): any {
  return {
    id: contractLC.lc_id,
    buyerAddress: contractLC.buyer,
    sellerAddress: contractLC.seller,
    issuingBankAddress: contractLC.issuing_bank,
    advisingBankAddress: contractLC.advising_bank,
    amount: Number(contractLC.amount) / 10_000_000, // Convert from Stellar precision
    currency: {
      contractAddress: contractLC.currency,
      symbol: 'USDC' // Would need to resolve this
    },
    status: contractLC.status,
    commodity: {
      description: contractLC.commodity.description,
      quantity: contractLC.commodity.quantity,
      unitPrice: Number(contractLC.commodity.unit_price) / 10_000_000,
      origin: contractLC.commodity.origin,
      destination: contractLC.commodity.destination
    },
    terms: {
      paymentTerms: contractLC.terms.payment_terms,
      incoterms: contractLC.commodity.incoterms,
      partialShipments: contractLC.terms.partial_shipments,
      transshipment: contractLC.terms.transshipment,
      latestShipmentDate: new Date(contractLC.terms.latest_shipment_date * 1000).toISOString(),
      documentPresentationDays: contractLC.terms.document_presentation_days,
      confirmationRequired: contractLC.terms.confirmation_required
    },
    expiryDate: new Date(contractLC.expiry_date * 1000).toISOString(),
    createdAt: new Date(contractLC.creation_timestamp * 1000).toISOString(),
    documents: contractLC.documents,
    amendments: contractLC.amendments
  };
}