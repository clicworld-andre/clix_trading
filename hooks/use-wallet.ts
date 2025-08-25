import { useState, useEffect, useCallback } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { useToast } from "@/hooks/use-toast"
import { get, post, postUnauthenticated } from "@/lib/service"

interface WalletConnectionData {
  user_id: string
  otc_user_id: string
  public_key: string
  wallet_username: string
}

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)
  const [walletData, setWalletData] = useState<WalletConnectionData | null>(null)
  const { client } = useMatrixClient()
  const { toast } = useToast()

  const getCleanMatrixId = (fullMatrixId: string): string => {
    // If it doesn't start with @, assume it's already clean
    if (!fullMatrixId.startsWith('@')) {
      return fullMatrixId.replace(/[^a-zA-Z0-9_]/g, "")
    }
    // Remove @ and everything after :, then clean special characters
    return fullMatrixId.replace(/^@/, "").split(":")[0].replace(/[^a-zA-Z0-9_]/g, "")
  }

  const getFullMatrixId = (cleanId: string): string => {
    // If it already starts with @, return as is
    if (cleanId.startsWith('@')) {
      return cleanId
    }
    // Add @ and domain
    return `@${cleanId}:clic2go.ug`
  }

  const checkConnection = useCallback(async () => {
    console.log('🔍 useWallet: Starting checkConnection...')
    
    try {
      // Get Matrix user ID from localStorage - don't depend on client being ready
      const matrixUserId = localStorage.getItem('matrix_user_id')
      console.log('🔍 useWallet: Matrix user ID from localStorage:', matrixUserId)
      
      if (!matrixUserId) {
        console.log('❌ useWallet: No matrix_user_id found, setting loading to false')
        setIsLoading(false)
        return
      }

      const cleanMatrixId = getCleanMatrixId(matrixUserId)
      console.log('🔍 useWallet: Clean Matrix ID:', cleanMatrixId)

      // First check localStorage for existing connection
      const storedWalletData = localStorage.getItem(`wallet_data_${cleanMatrixId}`)
      console.log('🔍 useWallet: Stored wallet data:', storedWalletData ? 'Found' : 'Not found')
      
      if (storedWalletData) {
        const parsedData = JSON.parse(storedWalletData) as WalletConnectionData
        console.log('✅ useWallet: Found stored wallet data, setting connected:', parsedData.user_id)
        setWalletData(parsedData)
        setConnectedUsername(parsedData.user_id)
        setIsConnected(true)
        setIsLoading(false)
        return
      }

      console.log('🔍 useWallet: No stored wallet_data, checking for basic connection...')
      
      // Check if we have basic connection info (fallback method)
      const basicConnection = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      const hasToken = localStorage.getItem(`jwt_${cleanMatrixId}`) || localStorage.getItem('jwt')
      
      if (basicConnection && hasToken) {
        console.log('✅ useWallet: Found basic connection info, creating wallet data')
        
        // Create basic wallet data structure from available info
        const connectionData: WalletConnectionData = {
          user_id: basicConnection,
          otc_user_id: cleanMatrixId,
          public_key: '',
          wallet_username: basicConnection
        }
        
        // Store the wallet data for future use
        localStorage.setItem(`wallet_data_${cleanMatrixId}`, JSON.stringify(connectionData))
        
        setWalletData(connectionData)
        setConnectedUsername(basicConnection)
        setIsConnected(true)
      } else {
        console.log('❌ useWallet: No wallet connection found')
        setIsConnected(false)
        setConnectedUsername(null)
        setWalletData(null)
      }
    } catch (error) {
      console.error("❌ useWallet: Error checking wallet connection:", error)
      setIsConnected(false)
      setConnectedUsername(null)
      setWalletData(null)
    } finally {
      console.log('🔄 useWallet: Setting loading to false')
      setIsLoading(false)
    }
  }, [toast])

  const connect = async (username: string, pin: string) => {
    try {
      const matrixUserId = localStorage.getItem('matrix_user_id')
      if (!matrixUserId) {
        toast({
          title: "Connection failed",
          description: "Matrix user ID not found",
          variant: "destructive",
        })
        return
      }

      const cleanMatrixId = getCleanMatrixId(matrixUserId)
      const fullMatrixId = getFullMatrixId(cleanMatrixId)
      
      // Handle wallet format - if username doesn't contain :, add :100 for default wallet
      const walletUsername = username.includes(':') ? username : `${username}:100`

      console.log('🔗 useWallet.connect: Attempting connection with:', {
        user_id: walletUsername,
        original_input: username,
        otc_user_id: fullMatrixId,
        matrix_id: matrixUserId,
        clean_id: cleanMatrixId
      })

      console.log('🔗 useWallet.connect: Sending linkOtc request (unauthenticated)...')
      const data = await postUnauthenticated('linkOtc', {
        user_id: walletUsername,
        otc_user_id: fullMatrixId,
        password: pin,
      }) as any
      console.log('🔗 useWallet.connect: Response data:', data)

      if (data.status === 200 || (data.message && data.message.includes("already linked"))) {
        // Show specific message for already linked accounts
        if (data.message && data.message.toLowerCase().includes("already linked")) {
          toast({
            title: "Account Already Linked",
            description: data.message,
          })
        }
        
        // Create wallet connection data from the response
        const connectionData: WalletConnectionData = {
          user_id: walletUsername,
          otc_user_id: cleanMatrixId,
          public_key: data.public_key || '',
          wallet_username: walletUsername
        }

        // Store connection data
        localStorage.setItem(`wallet_data_${cleanMatrixId}`, JSON.stringify(connectionData))
        localStorage.setItem(`otc_chat_${cleanMatrixId}`, walletUsername)
        if (data.jwt) {
          localStorage.setItem(`jwt_${cleanMatrixId}`, data.jwt)
          localStorage.setItem('jwt', data.jwt)
        }

        setWalletData(connectionData)
        setConnectedUsername(walletUsername)
        setIsConnected(true)

        toast({
          title: "Wallet connected",
          description: "Your PELOTON Plus wallet has been successfully connected",
        })

        // Trigger a wallet-connected event that components can listen for
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wallet-connected", {
            detail: { username, connectionData }
          }))
        }
      } else {
        toast({
          title: "Connection failed",
          description: data.message || `Error: ${data.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to your PELOTON Plus wallet",
        variant: "destructive",
      })
    }
  }

  const disconnect = () => {
    const matrixUserId = localStorage.getItem('matrix_user_id')
    if (!matrixUserId) return

    const cleanMatrixId = getCleanMatrixId(matrixUserId)

    localStorage.removeItem(`wallet_data_${cleanMatrixId}`)
    localStorage.removeItem(`otc_chat_${cleanMatrixId}`)
    localStorage.removeItem(`jwt_${cleanMatrixId}`)
    localStorage.removeItem('jwt')
    localStorage.removeItem('matrix_user_id')

    setIsConnected(false)
    setConnectedUsername(null)
    setWalletData(null)

    toast({
      title: "Wallet disconnected",
      description: "Your PELOTON Plus wallet has been disconnected",
    })

    // Trigger a wallet-disconnected event that components can listen for
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet-disconnected"))
    }
  }

  // Check connection on mount - no need to wait for Matrix client
  useEffect(() => {
    console.log('🔄 useWallet: useEffect triggered, calling checkConnection')
    checkConnection()
    
    // Listen for wallet connection events from dialogs
    const handleWalletConnected = (event: CustomEvent) => {
      console.log('🔄 useWallet: Received wallet-connected event, refreshing state')
      const { username, connectionData } = event.detail
      
      // Immediately update state without API call
      setWalletData(connectionData)
      setConnectedUsername(username)
      setIsConnected(true)
      setIsLoading(false)
    }
    
    window.addEventListener('wallet-connected', handleWalletConnected as EventListener)
    
    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnected as EventListener)
    }
  }, [checkConnection])

  return {
    isConnected,
    isLoading,
    connectedUsername,
    walletData,
    connect,
    disconnect,
    checkConnection,
  }
} 