import { NextResponse } from 'next/server';
import { bonds } from './shared';

export async function GET() {
  return NextResponse.json(bonds);
}

export async function POST(request: Request) {
  try {
    const bondData = await request.json();
    
    // Validate required fields
    const requiredFields = ['altxName', 'issuer', 'receiverWalletId', 'dateCreated', 'issuedShares', 'securityType', 'isin', 'currency', 'series'];
    for (const field of requiredFields) {
      if (!bondData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Create new bond with ID
    const newBond = {
      id: Date.now().toString(),
      ...bondData,
      transactions: [],
      createdAt: new Date().toISOString()
    };
    
    // Add to in-memory storage
    bonds.push(newBond);
    
    // Return the created bond
    return NextResponse.json(newBond, { status: 201 });
  } catch (error) {
    console.error('Error creating bond:', error);
    return NextResponse.json({ error: 'Failed to create bond' }, { status: 500 });
  }
} 