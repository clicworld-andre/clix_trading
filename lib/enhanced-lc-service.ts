/**
 * Enhanced LC Service with Soroban Smart Contract Integration
 * 
 * This service extends the existing LC functionality with smart contract capabilities
 * while maintaining backward compatibility with the mock API system.
 */

import { SorobanLCClient, createLocalClient, createTestnetClient, createMainnetClient } from './soroban-integration';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import { LCTerms } from './lc/types';
import { LCService } from './lc/lc-service';

//=============================================================================
// Enhanced Types
//=============================================================================

export interface EnhancedLCData extends LCTerms {
  // Additional blockchain-specific fields
  smartContractEnabled?: boolean;
  blockchainNetwork?: 'local' | 'testnet' | 'mainnet';
  transactionHash?: string;
  contractAddress?: string;
  escrowAddress?: string;
  
  // Enhanced participant data
  participants: {
    buyer: {
      address: string;
      stellarAddress?: string;
      keypair?: Keypair;
    };
    seller: {
      address: string;
      stellarAddress?: string;
      keypair?: Keypair;
    };
    issuingBank: {
      address: string;
      stellarAddress?: string;
      keypair?: Keypair;
    };
    advisingBank?: {
      address: string;
      stellarAddress?: string;
      keypair?: Keypair;
    };
  };
}

export interface LCServiceConfig {
  // Smart contract configuration
  enableSmartContracts: boolean;
  network: 'local' | 'testnet' | 'mainnet';
  contractIds?: {
    letterOfCredit: string;
    documentVerification: string;
    disputeResolution: string;
    escrowManager: string;
  };
  
  // Fallback configuration
  fallbackToApi: boolean;
  apiEndpoint: string;
  
  // Integration settings
  matrixIntegration: boolean;
  ipfsGateway: string;
  walletIntegration: boolean;
}

//=============================================================================
// Enhanced LC Service
//=============================================================================

export class EnhancedLCService {
  private sorobanClient?: SorobanLCClient;
  private config: LCServiceConfig;
  private fallbackService: LCService; // Existing service

  constructor(config: LCServiceConfig, fallbackService: LCService) {
    this.config = config;
    this.fallbackService = fallbackService;
    
    if (config.enableSmartContracts && config.contractIds) {
      this.initializeSorobanClient();
    }
  }

  private initializeSorobanClient(): void {
    if (!this.config.contractIds) return;

    switch (this.config.network) {
      case 'local':
        this.sorobanClient = createLocalClient(this.config.contractIds);
        break;
      case 'testnet':
        this.sorobanClient = createTestnetClient(this.config.contractIds);
        break;
      case 'mainnet':
        this.sorobanClient = createMainnetClient(this.config.contractIds);
        break;
    }
  }

  //===========================================================================
  // Enhanced LC Operations
  //===========================================================================

  /**
   * Create LC with smart contract integration
   */
  async createLC(data: EnhancedLCData): Promise<{
    success: boolean;
    lcId: string;
    transactionHash?: string;
    error?: string;
  }> {
    
    // Determine if we should use smart contracts
    const useSmartContract = this.shouldUseSmartContract(data);
    
    if (useSmartContract && this.sorobanClient) {
      try {
        return await this.createLCWithSmartContract(data);
      } catch (error) {
        console.error('Smart contract LC creation failed:', error);
        
        if (this.config.fallbackToApi) {
          console.log('Falling back to API creation...');
          return await this.createLCWithAPI(data);
        } else {
          throw error;
        }
      }
    } else {
      return await this.createLCWithAPI(data);
    }
  }

  private async createLCWithSmartContract(data: EnhancedLCData): Promise<{
    success: boolean;
    lcId: string;
    transactionHash?: string;
    error?: string;
  }> {
    
    if (!this.sorobanClient || !data.participants.buyer.keypair) {
      throw new Error('Smart contract client or keypair not available');
    }

    // Transform data to contract format
    const contractParams = this.transformToContractParams(data);
    
    // Create LC on smart contract
    const result = await this.sorobanClient.createLC(
      contractParams,
      data.participants.buyer.keypair
    );

    if (!result.success) {
      return {
        success: false,
        lcId: '',
        error: result.error
      };
    }

    const lcId = result.data!;

    // Create Matrix room for negotiation if enabled
    if (this.config.matrixIntegration) {
      await this.createMatrixRoom(lcId, data);
    }

    // Store LC data locally with blockchain metadata
    await this.storeLCLocally({
      ...data,
      smartContractEnabled: true,
      transactionHash: result.transactionHash,
      contractAddress: this.config.contractIds!.letterOfCredit,
      blockchainNetwork: this.config.network
    } as EnhancedLCData & { id: string });

    return {
      success: true,
      lcId,
      transactionHash: result.transactionHash
    };
  }

  private async createLCWithAPI(data: EnhancedLCData): Promise<{
    success: boolean;
    lcId: string;
    transactionHash?: string;
    error?: string;
  }> {
    
    // Use existing API-based creation
    try {
      const result = await this.fallbackService.createLC(data, { 
        buyerMatrixId: data.buyer.matrixId, 
        sellerMatrixId: data.seller.matrixId 
      });
      return {
        success: result.success,
        lcId: result.lcId
      };
    } catch (error) {
      return {
        success: false,
        lcId: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Fund LC with smart contract integration
   */
  async fundLC(
    lcId: string,
    funderKeypair: Keypair
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    
    const lcData = await this.getLCData(lcId);
    
    if (lcData?.smartContractEnabled && this.sorobanClient) {
      const result = await this.sorobanClient.fundLC(lcId, funderKeypair);
      
      if (result.success && this.config.matrixIntegration) {
        await this.sendMatrixUpdate(lcId, {
          type: 'lc_funded',
          message: 'LC has been funded and is ready for shipment',
          amount: lcData.amount,
          currency: lcData.currency
        });
      }
      
      return result;
    } else {
      // API-based funding (mock)
      return {
        success: true,
        transactionHash: 'mock_funding_' + Date.now()
      };
    }
  }

  /**
   * Submit document with IPFS integration
   */
  async submitDocument(
    lcId: string,
    file: File,
    docType: string,
    submitterKeypair: Keypair
  ): Promise<{
    success: boolean;
    documentId?: string;
    ipfsHash?: string;
    transactionHash?: string;
    error?: string;
  }> {
    
    try {
      // 1. Upload to IPFS
      const ipfsHash = await this.uploadToIPFS(file);
      
      const lcData = await this.getLCData(lcId);
      
      if (lcData?.smartContractEnabled && this.sorobanClient) {
        // 2. Submit to smart contract
        const result = await this.sorobanClient.submitDocument(
          lcId,
          docType,
          ipfsHash,
          submitterKeypair
        );
        
        if (result.success && this.config.matrixIntegration) {
          // 3. Notify participants via Matrix
          await this.sendMatrixUpdate(lcId, {
            type: 'document_submitted',
            message: `Document submitted: ${docType}`,
            document: {
              type: docType,
              ipfsHash,
              submitter: submitterKeypair.publicKey()
            }
          });
        }
        
        return {
          success: result.success,
          documentId: `${lcId}_${docType}_${Date.now()}`,
          ipfsHash,
          transactionHash: result.transactionHash,
          error: result.error
        };
      } else {
        // API-based document submission
        const documentId = await this.submitDocumentToAPI(lcId, file, docType);
        return {
          success: true,
          documentId,
          ipfsHash
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verify documents (bank function)
   */
  async verifyDocuments(
    lcId: string,
    verifierKeypair: Keypair,
    comments?: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    
    const lcData = await this.getLCData(lcId);
    
    if (lcData?.smartContractEnabled && this.sorobanClient) {
      const result = await this.sorobanClient.verifyDocuments(lcId, verifierKeypair);
      
      if (result.success && this.config.matrixIntegration) {
        await this.sendMatrixUpdate(lcId, {
          type: 'documents_verified',
          message: 'All documents have been verified by the bank',
          verifier: verifierKeypair.publicKey(),
          comments
        });
      }
      
      return result;
    } else {
      // API-based verification
      await this.verifyDocumentsWithAPI(lcId, verifierKeypair.publicKey());
      return {
        success: true,
        transactionHash: 'mock_verify_' + Date.now()
      };
    }
  }

  /**
   * Release payment to seller
   */
  async releasePayment(
    lcId: string,
    releaserKeypair: Keypair
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    
    const lcData = await this.getLCData(lcId);
    
    if (lcData?.smartContractEnabled && this.sorobanClient) {
      const result = await this.sorobanClient.releasePayment(lcId, releaserKeypair);
      
      if (result.success && this.config.matrixIntegration) {
        await this.sendMatrixUpdate(lcId, {
          type: 'payment_released',
          message: 'Payment has been released to the seller',
          amount: lcData.amount,
          currency: lcData.currency,
          releaser: releaserKeypair.publicKey()
        });
      }
      
      return result;
    } else {
      // API-based payment release
      await this.releasePaymentWithAPI(lcId);
      return {
        success: true,
        transactionHash: 'mock_release_' + Date.now()
      };
    }
  }

  //===========================================================================
  // Query Functions
  //===========================================================================

  /**
   * Get LC details with blockchain data
   */
  async getLCDetails(lcId: string): Promise<EnhancedLCData | null> {
    
    // Try to get from smart contract first
    if (this.sorobanClient) {
      try {
        const contractResult = await this.sorobanClient.getLCDetails(lcId);
        
        if (contractResult.success && contractResult.data) {
          return this.transformFromContractData(contractResult.data);
        }
      } catch (error) {
        console.warn('Failed to get LC from smart contract:', error);
      }
    }
    
    // Fallback to local storage or API
    return await this.getLCFromLocalStorage(lcId);
  }

  /**
   * Get participant's LCs
   */
  async getParticipantLCs(
    participantAddress: string,
    role: 'buyer' | 'seller' | 'bank'
  ): Promise<string[]> {
    
    if (this.sorobanClient) {
      try {
        const result = await this.sorobanClient.getParticipantLCs(participantAddress, role);
        
        if (result.success && result.data) {
          return result.data;
        }
      } catch (error) {
        console.warn('Failed to get participant LCs from smart contract:', error);
      }
    }
    
    // Fallback to local data
    return await this.getParticipantLCsFromLocal(participantAddress, role);
  }

  /**
   * Get escrow balance
   */
  async getEscrowBalance(lcId: string): Promise<bigint> {
    
    if (this.sorobanClient) {
      try {
        const result = await this.sorobanClient.getEscrowBalance(lcId);
        
        if (result.success && result.data !== undefined) {
          return result.data;
        }
      } catch (error) {
        console.warn('Failed to get escrow balance:', error);
      }
    }
    
    return BigInt(0);
  }

  //===========================================================================
  // Integration Helpers
  //===========================================================================

  private shouldUseSmartContract(data: EnhancedLCData): boolean {
    return (
      this.config.enableSmartContracts &&
      this.sorobanClient !== undefined &&
      data.smartContractEnabled !== false &&
      data.participants.buyer.keypair !== undefined
    );
  }

  private transformToContractParams(data: EnhancedLCData): any {
    return {
      buyer: data.participants.buyer.stellarAddress || data.participants.buyer.address,
      seller: data.participants.seller.stellarAddress || data.participants.seller.address,
      issuing_bank: data.participants.issuingBank.stellarAddress || data.participants.issuingBank.address,
      advising_bank: data.participants.advisingBank?.stellarAddress,
      amount: BigInt(Math.round(parseFloat(data.amount) * 10_000_000)), // Convert to Stellar precision
      currency: this.getCurrencyContractAddress(data.currency),
      commodity: {
        description: data.commodity,
        quantity: data.quantity,
        unit_price: BigInt(Math.round(parseFloat(data.unitPrice) * 10_000_000)),
        incoterms: data.incoterms,
        origin: data.portOfLoading,
        destination: data.portOfDestination
      },
      terms: {
        payment_terms: data.lcType,
        partial_shipments: data.partialShipments,
        transshipment: data.transhipment,
        latest_shipment_date: Math.floor(new Date(data.latestShipmentDate).getTime() / 1000),
        document_presentation_days: 21, // Default value
        confirmation_required: false // Default value
      },
      expiry_date: Math.floor(new Date(data.expiryDate).getTime() / 1000)
    };
  }

  private transformFromContractData(contractData: any): EnhancedLCData {
    // Transform from contract format back to enhanced LC format
    // Implementation would convert contract data structure
    return contractData as EnhancedLCData; // Simplified for now
  }

  private getCurrencyContractAddress(symbol: string): string {
    const addresses: Record<string, string> = {
      'USDC': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAUHKENNYHA',
      'EURC': 'CEURC_CONTRACT_ADDRESS',
      'XLM': 'native',
      'CLIX': 'CLIX_CONTRACT_ADDRESS',
      'USD1': 'USD1_CONTRACT_ADDRESS',
      'XAU': 'XAU_CONTRACT_ADDRESS',
      'XCOF': 'XCOF_CONTRACT_ADDRESS'
    };
    
    return addresses[symbol] || addresses['USDC']; // Default to USDC
  }

  //===========================================================================
  // IPFS Integration
  //===========================================================================

  private async uploadToIPFS(file: File): Promise<string> {
    // Mock IPFS upload - in production would use actual IPFS client
    const mockHash = 'Qm' + Array.from(
      { length: 44 }, 
      () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        [Math.floor(Math.random() * 62)]
    ).join('');
    
    console.log(`Mock IPFS upload: ${file.name} -> ${mockHash}`);
    
    // In production:
    // const ipfs = create({ url: this.config.ipfsGateway });
    // const result = await ipfs.add(file);
    // return result.cid.toString();
    
    return mockHash;
  }

  //===========================================================================
  // Matrix Integration
  //===========================================================================

  private async createMatrixRoom(lcId: string, data: EnhancedLCData): Promise<string> {
    // Mock Matrix room creation
    console.log(`Creating Matrix room for LC: ${lcId}`);
    
    // In production would use actual Matrix client:
    // const roomId = await matrixClient.createRoom({
    //   name: `LC ${lcId} Negotiation`,
    //   topic: `Letter of Credit for ${data.commodity.description}`,
    //   invite: [data.participants.buyer.address, data.participants.seller.address]
    // });
    
    return `!mock_room_${lcId}:matrix.org`;
  }

  private async sendMatrixUpdate(lcId: string, update: any): Promise<void> {
    console.log(`Matrix update for LC ${lcId}:`, update);
    
    // In production would send actual Matrix message:
    // await matrixClient.sendMessage(roomId, {
    //   msgtype: 'io.clix.lc.event',
    //   body: update.message,
    //   lc_event: update
    // });
  }

  //===========================================================================
  // Storage Helpers
  //===========================================================================

  private async storeLCLocally(data: EnhancedLCData): Promise<void> {
    // Store in localStorage or IndexedDB
    const key = `clix_lc_${(data as any).id || 'temp_' + Date.now()}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private async getLCFromLocalStorage(lcId: string): Promise<EnhancedLCData | null> {
    const key = `clix_lc_${lcId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  private async getLCData(lcId: string): Promise<EnhancedLCData | null> {
    return await this.getLCFromLocalStorage(lcId);
  }

  private async getParticipantLCsFromLocal(
    participantAddress: string,
    role: string
  ): Promise<string[]> {
    // Search localStorage for LCs involving this participant
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('clix_lc_'));
    const lcIds: string[] = [];
    
    for (const key of allKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}') as EnhancedLCData;
        
        if (this.isParticipantInLC(data, participantAddress, role)) {
          lcIds.push((data as any).id);
        }
      } catch (error) {
        console.warn('Error parsing LC data from localStorage:', error);
      }
    }
    
    return lcIds;
  }

  private isParticipantInLC(data: EnhancedLCData, address: string, role: string): boolean {
    switch (role) {
      case 'buyer':
        return data.participants.buyer.address === address ||
               data.participants.buyer.stellarAddress === address;
      case 'seller':
        return data.participants.seller.address === address ||
               data.participants.seller.stellarAddress === address;
      case 'bank':
        return data.participants.issuingBank.address === address ||
               data.participants.issuingBank.stellarAddress === address ||
               data.participants.advisingBank?.address === address ||
               data.participants.advisingBank?.stellarAddress === address;
      default:
        return false;
    }
  }

  //===========================================================================
  // Fallback API Methods (Placeholders)
  //===========================================================================

  private async submitDocumentToAPI(lcId: string, file: File, docType: string): Promise<string> {
    // Mock API document submission
    return `${lcId}_${docType}_${Date.now()}`;
  }

  private async verifyDocumentsWithAPI(lcId: string, verifier: string): Promise<void> {
    // Mock API document verification
    console.log(`Mock API: Documents verified for ${lcId} by ${verifier}`);
  }

  private async releasePaymentWithAPI(lcId: string): Promise<void> {
    // Mock API payment release
    console.log(`Mock API: Payment released for ${lcId}`);
  }

  //===========================================================================
  // Configuration Management
  //===========================================================================

  updateConfig(newConfig: Partial<LCServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableSmartContracts !== undefined || newConfig.contractIds) {
      this.initializeSorobanClient();
    }
  }

  getConfig(): LCServiceConfig {
    return { ...this.config };
  }

  isSmartContractEnabled(): boolean {
    return this.config.enableSmartContracts && this.sorobanClient !== undefined;
  }

  getCurrentNetwork(): string {
    return this.config.network;
  }
}

//=============================================================================
// Factory Function
//=============================================================================

/**
 * Create enhanced LC service with smart contract integration
 */
export function createEnhancedLCService(
  config: LCServiceConfig,
  fallbackService: LCService
): EnhancedLCService {
  return new EnhancedLCService(config, fallbackService);
}

//=============================================================================
// Usage Example
//=============================================================================

/*
// Example configuration for local development
const config: LCServiceConfig = {
  enableSmartContracts: true,
  network: 'local',
  contractIds: {
    letterOfCredit: process.env.NEXT_PUBLIC_LC_CONTRACT_ID!,
    documentVerification: process.env.NEXT_PUBLIC_DOC_CONTRACT_ID!,
    disputeResolution: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT_ID!,
    escrowManager: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID!
  },
  fallbackToApi: true,
  apiEndpoint: '/api/lc',
  matrixIntegration: true,
  ipfsGateway: 'https://ipfs.infura.io:5001',
  walletIntegration: true
};

// Create enhanced service
const existingLCService = new LCService(); // Your existing service
const enhancedService = createEnhancedLCService(config, existingLCService);

// Use enhanced service
const lcData: EnhancedLCData = {
  // ... existing LC data
  smartContractEnabled: true,
  participants: {
    buyer: {
      address: 'user123',
      stellarAddress: 'GXXXXX...',
      keypair: Keypair.fromSecret('SXXXXX...')
    },
    // ... other participants
  }
};

const result = await enhancedService.createLC(lcData);
*/