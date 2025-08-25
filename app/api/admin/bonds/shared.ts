// Shared data store for bonds
// In a real app, this would be a database

// Define the Bond type
export interface Bond {
  id: string;
  altxName: string;
  issuer: string;
  receiverWalletId: string;
  dateCreated: string;
  issuedShares: number;
  securityType: string;
  isin: string;
  currency: string;
  series: string;
  transactions?: any[];
  createdAt?: string;
}

// In-memory storage for bonds
export const bonds: Bond[] = []; 