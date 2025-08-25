'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getBondById, isAuthenticated } from '@/lib/admin-api';
import { showToast } from '@/lib/toast-helper';

interface Transaction {
  order_id: string
  symbol: string
  user_id: string
  selling: string
  buying: string
  price: number
  quantity: number
  status: string
  tx_hash: string
  fiat_amount: number
  created_on: string
}

interface Bond {
  id: number
  code: string
  token_name: string
  asset_type: string
  issuer: string
  issuer_public: string
  status: string
  returns: string
  duration: string
  maturity: string
  shares: number
  img_url?: string
  country: string
  sis_number: string
  transactions: Transaction[]
}

export default function BondDetails() {
  const params = useParams();
  const router = useRouter();
  const [bond, setBond] = useState<Bond | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBond() {
      try {
        setIsLoading(true);
        const response = await getBondById(params.id as string);
        setBond(response);
      } catch (error) {
        console.error('Error fetching bond:', error);
        showToast({
          title: 'Error',
          description: 'Failed to load bond details'
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBond();
  }, [params.id]);

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading bond details...</div>;
  }

  if (!bond) {
    return <div className="container mx-auto py-6">Bond not found</div>;
  }

  // Calculate bond statistics
  const totalTransactions = bond.transactions?.length || 0;
  
  // Calculate total fiat amount traded
  const totalFiatAmount = bond.transactions?.reduce((acc, t) => acc + (t.fiat_amount || 0), 0) || 0;
  
  // Calculate buy and sell volumes in fiat
  const buyFiatAmount = bond.transactions?.reduce((acc, t) => 
    t.buying ? acc + (t.fiat_amount || 0) : acc, 0) || 0;
  
  const sellFiatAmount = bond.transactions?.reduce((acc, t) => 
    t.selling ? acc + (t.fiat_amount || 0) : acc, 0) || 0;

  // Calculate average price from fiat amounts
  const averagePrice = totalTransactions > 0
    ? totalFiatAmount / totalTransactions
    : 0;

  // Get unique holders and their current positions
  const holders = new Map<string, { quantity: number, fiatAmount: number }>();
  
  bond.transactions?.forEach(t => {
    const currentHolder = holders.get(t.user_id) || { quantity: 0, fiatAmount: 0 };
    if (t.buying) {
      currentHolder.quantity += t.quantity;
      currentHolder.fiatAmount += t.fiat_amount;
    } else if (t.selling) {
      currentHolder.quantity -= t.quantity;
      currentHolder.fiatAmount -= t.fiat_amount;
    }
    holders.set(t.user_id, currentHolder);
  });

  // Filter out holders with zero balance
  const activeHolders = Array.from(holders.entries())
    .filter(([_, data]) => data.quantity > 0)
    .map(([userId, data]) => ({
      userId,
      quantity: data.quantity,
      fiatAmount: data.fiatAmount
    }));

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bonds" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Bonds
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Bond Header */}
        <Card>
          <CardHeader>
            <CardTitle>{bond.token_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Symbol</h3>
                <p>{bond.code}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Asset Type</h3>
                <p>{bond.asset_type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className={bond.status === 'Active' ? 'text-green-600' : 'text-gray-600'}>
                  {bond.status}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Returns</h3>
                <p>{bond.returns}%</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                <p>{bond.duration} years</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Maturity</h3>
                <p>{new Date(bond.maturity).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Shares</h3>
                <p>{bond.shares.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Country</h3>
                <p>{bond.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalFiatAmount.toLocaleString()} UGX</p>
              <p className="text-sm text-gray-500">{totalTransactions} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Buy Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{buyFiatAmount.toLocaleString()} UGX</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sell Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{sellFiatAmount.toLocaleString()} UGX</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{averagePrice.toLocaleString()} UGX</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Transactions and Holders */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="transactions">
              <TabsList>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="holders">Current Holders</TabsTrigger>
              </TabsList>
              <TabsContent value="transactions">
                {bond.transactions && bond.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Quantity</th>
                          <th className="text-left p-2">Price (UGX)</th>
                          <th className="text-left p-2">Total (UGX)</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Transaction Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bond.transactions?.map(transaction => (
                          <tr key={transaction.order_id} className="border-b">
                            <td className="p-2">{new Date(transaction.created_on).toLocaleDateString()}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                transaction.buying ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.buying ? 'BUY' : 'SELL'}
                              </span>
                            </td>
                            <td className="p-2">{transaction.quantity.toLocaleString()}</td>
                            <td className="p-2">{transaction.price.toLocaleString()}</td>
                            <td className="p-2">{transaction.fiat_amount.toLocaleString()}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className="text-xs font-mono truncate" title={transaction.tx_hash}>
                                {transaction.tx_hash}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No transactions found for this bond.</p>
                )}
              </TabsContent>
              <TabsContent value="holders">
                {activeHolders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">User ID</th>
                          <th className="text-left p-2">Holdings</th>
                          <th className="text-left p-2">Value (UGX)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeHolders.map(holder => (
                          <tr key={holder.userId} className="border-b">
                            <td className="p-2">{holder.userId}</td>
                            <td className="p-2">{holder.quantity.toLocaleString()}</td>
                            <td className="p-2">{holder.fiatAmount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No current holders found for this bond.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 