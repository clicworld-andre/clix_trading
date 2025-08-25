"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Info, 
  Wallet,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  sisnApi,
  type SISNSystemMode,
  type SISNTokenInfo,
  type SISNBalance,
  type SISNSettlementStatus,
  formatBalance,
  getSISNTokenDisplayName,
  getSISNModeDisplayName
} from "@/lib/sisn-api"

interface SISNSettlementProps {
  walletPublicKey?: string
  isWalletConnected: boolean
}

export function SISNSettlement({ walletPublicKey, isWalletConnected }: SISNSettlementProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [systemMode, setSystemMode] = useState<SISNSystemMode | null>(null)
  const [tokenInfo, setTokenInfo] = useState<SISNTokenInfo | null>(null)
  const [balance, setBalance] = useState<SISNBalance | null>(null)
  const [settlementStatus, setSettlementStatus] = useState<SISNSettlementStatus | null>(null)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isSystemAvailable, setIsSystemAvailable] = useState(false)
  
  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    toAccount: '',
    amount: '',
    tokenCode: '',
    memo: ''
  })
  
  const { toast } = useToast()

  // Check if SISN system is available
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        console.log('SISN: Checking availability...')
        
        // First try a simple fetch to see if we can reach the server
        const healthUrl = 'http://localhost:3000/health'
        console.log('SISN: Attempting to fetch:', healthUrl)
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        
        console.log('SISN: Response status:', response.status)
        console.log('SISN: Response ok:', response.ok)
        
        const available = response.ok
        console.log('SISN: Final availability result:', available)
        setIsSystemAvailable(available)
        
        if (available) {
          console.log('SISN: System available, loading system info...')
          await loadSystemInfo(available)
        } else {
          console.log('SISN: System not available')
        }
      } catch (error) {
        console.error('SISN: Error checking availability:', error)
        console.error('SISN: Error details:', error instanceof Error ? error.message : String(error))
        setIsSystemAvailable(false)
      }
    }
    
    checkAvailability()
  }, [])

  // Load balance when wallet is connected and system is available
  useEffect(() => {
    if (isWalletConnected && walletPublicKey && isSystemAvailable) {
      loadBalance()
    }
  }, [isWalletConnected, walletPublicKey, isSystemAvailable])

  const loadSystemInfo = async (systemAvailable = isSystemAvailable) => {
    console.log('SISN: loadSystemInfo called, systemAvailable:', systemAvailable, 'isSystemAvailable:', isSystemAvailable)
    if (!systemAvailable) {
      console.log('SISN: System not available, returning early')
      return
    }
    
    try {
      console.log('SISN: Loading system info...')
      
      console.log('SISN: Fetching system mode...')
      const mode = await sisnApi.getSystemMode()
      console.log('SISN: System mode result:', mode)
      
      console.log('SISN: Fetching token info...')
      const tokens = await sisnApi.getTokenInfo()
      console.log('SISN: Token info result:', tokens)
      
      console.log('SISN: Fetching settlement status...')
      const status = await sisnApi.getSettlementStatus()
      console.log('SISN: Settlement status result:', status)
      
      setSystemMode(mode)
      setTokenInfo(tokens)
      setSettlementStatus(status)
      
      console.log('SISN: System info loaded successfully')
      
      // Set default token for transfer
      if (tokens.primary) {
        setTransferForm(prev => ({ ...prev, tokenCode: tokens.primary! }))
      } else if (tokens.supported.length > 0) {
        setTransferForm(prev => ({ ...prev, tokenCode: tokens.supported[0] }))
      }
    } catch (error) {
      console.error('SISN: Failed to load system info:', error)
      console.error('SISN: Error details:', error instanceof Error ? error.message : String(error))
      toast({
        title: "SISN System Error",
        description: "Failed to load system information",
        variant: "destructive",
      })
    }
  }

  const loadBalance = async () => {
    if (!walletPublicKey || !isSystemAvailable) return
    
    setIsLoading(true)
    try {
      const balanceData = await sisnApi.getAccountBalance(walletPublicKey)
      setBalance(balanceData)
    } catch (error) {
      console.error('Failed to load SISN balance:', error)
      // Don't show error toast for balance loading - account might not exist yet
      setBalance({
        account: walletPublicKey,
        balances: [],
        mode: systemMode?.mode || '',
        totalTokens: 0,
        multiToken: tokenInfo?.multiToken || false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (walletPublicKey) {
      loadBalance()
      loadSystemInfo()
    }
  }

  const handleTransfer = async () => {
    if (!walletPublicKey || !transferForm.toAccount || !transferForm.amount || !transferForm.tokenCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // This would require the wallet's secret key, which we don't have access to
    // In a real implementation, this would integrate with the wallet provider
    toast({
      title: "Transfer Not Available",
      description: "Transfer functionality requires wallet secret key integration",
      variant: "destructive",
    })
  }

  if (!isSystemAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">SISN System Unavailable</h3>
        <p className="text-sm text-muted-foreground text-center">
          The SISN settlement system is not currently available. Please check that the system is running on port 3000.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    )
  }

  if (!isWalletConnected || !walletPublicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">Connect Wallet for SISN</h3>
        <p className="text-sm text-muted-foreground text-center">
          Connect your wallet to access SISN settlement features and check your token balances.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* System Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">System Status</CardTitle>
              <Badge variant={settlementStatus?.operational ? "default" : "destructive"}>
                {settlementStatus?.operational ? "Operational" : "Unavailable"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {systemMode && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Mode:</span>
                  <Badge variant="outline">{getSISNModeDisplayName(systemMode.mode)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Platform:</span>
                  <span className="text-sm text-right">{systemMode.name}</span>
                </div>
                {tokenInfo && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Multi-Token:</span>
                      <span className="text-sm">{tokenInfo.multiToken ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Supported Tokens:</span>
                      <span className="text-sm">{tokenInfo.supported.join(", ")}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Balance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">SISN Account Balance</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>
              Account: {walletPublicKey?.slice(0, 8)}...{walletPublicKey?.slice(-8)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {balance && balance.balances.length > 0 ? (
                  balance.balances.map((tokenBalance) => (
                    <div
                      key={tokenBalance.asset_code}
                      className="flex justify-between items-center p-3 rounded-md border border-border"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{getSISNTokenDisplayName(tokenBalance.asset_code)}</div>
                          <div className="text-xs text-muted-foreground">{tokenBalance.asset_code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatBalance(tokenBalance.balance)} {tokenBalance.asset_code}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Info className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No token balances found for this account
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You may need to create trustlines or receive tokens first
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settlement Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settlement Actions</CardTitle>
            <CardDescription>Transfer tokens using the SISN settlement network</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => setIsTransferDialogOpen(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Send Transfer
            </Button>
            
            {settlementStatus && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Settlement Type:</span>
                  <span className="capitalize">{settlementStatus.settlement.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Real-time:</span>
                  <span>{settlementStatus.settlement.realTime ? "Yes" : "No"}</span>
                </div>
                {settlementStatus.settlement.centralClearance && (
                  <div className="flex justify-between">
                    <span>Central Clearance:</span>
                    <span>Yes</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send SISN Transfer</DialogTitle>
            <DialogDescription>
              Transfer tokens through the SISN settlement network
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Account</Label>
              <Input
                id="recipient"
                placeholder="Enter recipient public key"
                value={transferForm.toAccount}
                onChange={(e) => setTransferForm(prev => ({ ...prev, toAccount: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select 
                  value={transferForm.tokenCode} 
                  onValueChange={(value) => setTransferForm(prev => ({ ...prev, tokenCode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenInfo?.supported.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Textarea
                id="memo"
                placeholder="Enter transfer memo"
                rows={2}
                value={transferForm.memo}
                onChange={(e) => setTransferForm(prev => ({ ...prev, memo: e.target.value }))}
              />
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Transfer functionality requires wallet secret key integration, which is not available in this demo.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled>
              Send Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
