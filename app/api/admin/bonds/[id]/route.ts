import { NextResponse } from 'next/server';
import { bonds, Bond } from '../../bonds/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the bond by ID
    const bond = bonds.find((b: Bond) => b.id === id);
    
    if (!bond) {
      return NextResponse.json({ error: 'Bond not found' }, { status: 404 });
    }
    
    return NextResponse.json(bond);
  } catch (error) {
    console.error('Error fetching bond:', error);
    return NextResponse.json({ error: 'Failed to fetch bond' }, { status: 500 });
  }
} 