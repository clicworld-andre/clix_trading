"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useMatrixClient } from "@/lib/matrix-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpRight, CreditCard, DollarSign, Info, Plus, RefreshCw, Wallet, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import WalletConnectionDialog from "./wallet-connection-dialog"
import { SISNSettlement } from "./sisn-settlement"

interface WalletPanelProps {
  roomId?: string
  onRequestConnect?: () => void
  onRequestClose?: () => void
}

interface Balance {
  asset_type: string
  asset_code: string
  asset_name: string
  balance: string
  img_url?: string
}

interface UserWallet {
  wallet_name: string
  wallet_type: string
}

interface Portfolio {
  total_value: number
}

interface AssetDetails {
  assetCode: string
  assetName: string
  isin: string
  duration: string
  returns: string
  maturityDate: string
  issuer: string
  description: string
}

export function WalletPanel({ roomId = "", onRequestConnect, onRequestClose }: WalletPanelProps) {
  const { isConnected, isLoading: isWalletLoading, connectedUsername, walletData, disconnect, connect } = useWallet()
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [balances, setBalances] = useState<Balance[]>([])
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false)
  const [isAssetDetailsDialogOpen, setIsAssetDetailsDialogOpen] = useState(false)
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetDetails | null>(null)
  const { client } = useMatrixClient()
  const { toast } = useToast()

  const loadBalances = async () => {
    if (!isConnected || !connectedUsername || !client) return

    setIsLoadingBalances(true)
    try {
      const matrixUserId = client.getUserId() || ""
      const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
      const jwt = localStorage.getItem(`jwt_${cleanMatrixId}`)

      const response = await fetch(`https://api.clicworld.app/assets/web3/otc/getBalances/${connectedUsername}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to load balances: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if ((data.status === 200 || data.status === 100) && data.data) {
        setWallet(data.data.wallet)
        setPortfolio(data.data.portifolio)
        setBalances(data.data.balances || [])
      } else {
        throw new Error(data.message || `Failed to load balances: Status ${data.status}`)
      }
    } catch (error) {
      console.error("Error loading balances:", error)
      toast({
        title: "Failed to load balances",
        description: error instanceof Error ? error.message : "Could not load balances",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBalances(false)
    }
  }

  // Load balances when connected
  useEffect(() => {
    if (isConnected && connectedUsername) {
      loadBalances()
    }
  }, [isConnected, connectedUsername])

  // Listen for wallet connection/disconnection events
  useEffect(() => {
    const handleWalletConnected = () => {
      loadBalances()
    }

    window.addEventListener("wallet-connected", handleWalletConnected)
    return () => {
      window.removeEventListener("wallet-connected", handleWalletConnected)
    }
  }, [])

  const handleRefresh = () => {
    if (connectedUsername) {
      loadBalances()
    }
  }

  const handleDeposit = () => {
    setIsDepositDialogOpen(true)
  }

  const handleShowAssetDetails = async (assetCode: string) => {
    // Here you would typically fetch asset details from your API
    // For now, we'll use mock data
    setSelectedAsset({
      assetCode,
      assetName: "Sample Asset",
      isin: "US1234567890",
      duration: "5 years",
      returns: "10% p.a.",
      maturityDate: "2025-12-31",
      issuer: "Sample Bank Ltd.",
      description: "This is a sample asset description.",
    })
    setIsAssetDetailsDialogOpen(true)
  }

  if (isWalletLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
          <h3 className="text-lg font-medium">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground text-center">
            Connect your PELOTON Plus wallet to start trading and managing your assets.
          </p>
          <Button onClick={() => setIsConnectionDialogOpen(true)}>
            Connect Wallet
          </Button>
        </div>
        
        {/* Wallet Connection Dialog */}
        <WalletConnectionDialog
          isOpen={isConnectionDialogOpen}
          onClose={() => setIsConnectionDialogOpen(false)}
          onConnect={async (username: string, pin: string) => {
            await connect(username, pin)
            setIsConnectionDialogOpen(false)
          }}
          matrixUserId={client?.getUserId() || ""}
        />
      </>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        <Tabs defaultValue="money" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="money">Money</TabsTrigger>
            <TabsTrigger value="securities">Securities</TabsTrigger>
            <TabsTrigger value="sisn">
              Interbank Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="money" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Wallet Info</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {isLoadingBalances ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {walletData && (
                      <div className="bg-muted p-3 rounded-md mb-4">
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="text-muted-foreground">Username:</span>{" "}
                            {walletData.user_id}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Wallet ID:</span>{" "}
                            {walletData.wallet_username}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {balances
                        .filter(
                          (balance) =>
                            (balance.asset_type === "credit_alphanum4" &&
                              (balance.asset_code === "UGX" ||
                                balance.asset_code === "KES" ||
                                balance.asset_code === "USD" ||
                                balance.asset_code === "EUR" ||
                                balance.asset_code === "GBP" ||
                                balance.asset_code === "JPY")) ||
                            balance.asset_code === "USDC",
                        )
                        .map((balance) => (
                          <div
                            key={balance.asset_code}
                            className="flex justify-between items-center p-3 rounded-md border border-border"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
                                {balance.img_url ? (
                                  <img
                                    src={balance.img_url || "/placeholder.svg"}
                                    alt={balance.asset_code}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=32&width=32"
                                    }}
                                  />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{balance.asset_name}</div>
                                <div className="text-xs text-muted-foreground">{balance.asset_code}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {Number.parseFloat(balance.balance).toLocaleString()} {balance.asset_code}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </CardContent>

              <CardFooter className="flex justify-center">
                <Button variant="outline" className="w-full" onClick={handleDeposit}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Deposit
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-2">
              <Button variant="outline" className="w-full text-muted-foreground" onClick={disconnect}>
                Disconnect Wallet
              </Button>

              {connectedUsername && (
                <div className="text-xs text-center text-muted-foreground">Connected as: {connectedUsername}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="securities" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Securities</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Asset
                    </Button>
                  </div>
                </div>
                <CardDescription>Your securities holdings</CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingBalances ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {balances
                        .filter(
                          (balance) =>
                            balance.asset_type === "credit_alphanum12"
                        )
                        .map((balance) => (
                          <div
                            key={balance.asset_code}
                            className="flex justify-between items-center p-3 rounded-md border border-border"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
                                {balance.img_url ? (
                                  <img
                                    src={balance.img_url || "/placeholder.svg"}
                                    alt={balance.asset_code}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=32&width=32"
                                    }}
                                  />
                                ) : (
                                  <DollarSign className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{balance.asset_name}</div>
                                <div className="text-xs text-muted-foreground">{balance.asset_code}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="text-right mr-3">
                                <div className="font-medium">
                                  {Number.parseFloat(balance.balance).toLocaleString()} 
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleShowAssetDetails(balance.asset_code)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sisn" className="mt-4">
            <SISNSettlement 
              walletPublicKey={walletData?.public_key || connectedUsername || undefined}
              isWalletConnected={isConnected}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to Deposit</DialogTitle>
            <DialogDescription>Follow these steps to deposit funds into your PELOTON Plus account</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Deposit Instructions:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Visit any of our supported banks (Equity Bank, KCB, Stanbic)</li>
                <li>Fill out a deposit slip at the bank</li>
                <li>Select "Deposit to PELOTON Plus" as the transaction type</li>
                <li>
                  Enter your PELOTON Plus username: <span className="font-medium">{connectedUsername}</span>
                </li>
                <li>Provide the amount you wish to deposit</li>
                <li>Complete the transaction with the bank teller</li>
                <li>Keep your receipt for reference</li>
                <li>Funds will appear in your PELOTON Plus account within 1-2 business days</li>
              </ol>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                For assistance with deposits, please contact our support team at support@PELOTONplus.com
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDepositDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Details Dialog */}
      <Dialog open={isAssetDetailsDialogOpen} onOpenChange={setIsAssetDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
            <DialogDescription>Information about this security</DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedAsset.assetName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAsset.assetCode}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <span className="text-sm font-medium">ISIN Number:</span>
                  <span className="text-sm">{selectedAsset.isin}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <span className="text-sm font-medium">Duration:</span>
                  <span className="text-sm">{selectedAsset.duration}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <span className="text-sm font-medium">Returns:</span>
                  <span className="text-sm">{selectedAsset.returns}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <span className="text-sm font-medium">Maturity Date:</span>
                  <span className="text-sm">{selectedAsset.maturityDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <span className="text-sm font-medium">Issuer:</span>
                  <span className="text-sm truncate" title={selectedAsset.issuer}>
                    {selectedAsset.issuer.substring(0, 20)}...
                  </span>
                </div>
                <div className="border-b pb-2">
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm mt-1">{selectedAsset.description}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsAssetDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        isOpen={isConnectionDialogOpen}
        onClose={() => setIsConnectionDialogOpen(false)}
        onConnect={async (username: string, pin: string) => {
          await connect(username, pin)
          setIsConnectionDialogOpen(false)
        }}
        matrixUserId={client?.getUserId() || ""}
      />
    </div>
  )
}
