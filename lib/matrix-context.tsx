"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { initializeMatrixClient } from "./matrix-client"

// Use a more generic type instead of importing from matrix-js-sdk
interface MatrixClient {
  getUserId(): string | null
  startClient(options?: any): void
  stopClient(): void
  on(event: string | symbol, callback: (...args: any[]) => void): void
  removeListener(event: string | symbol, callback: (...args: any[]) => void): void
  removeAllListeners(event?: string | symbol): void
  logout(): Promise<any>
  leave?(roomId: string): Promise<void>
  joinRoom(roomIdOrAlias: string, opts?: any): Promise<any>
  sendEvent(roomId: string, eventType: string, content: any, txnId?: string, callback?: (err: any, res: any) => void): Promise<{ event_id: string }>
  getRoom(roomId: string): any
  getRooms(): any[]
  mxcUrlToHttp?(url: string, width?: number, height?: number, resizeMethod?: string, allowDirectLinks?: boolean): string | null
  createRoom?(options: any): Promise<{ room_id: string }>
}

interface MatrixContextType {
  client: MatrixClient | null
  isInitialized: boolean
  syncState: string
  createRoom: (options: any) => Promise<string>
  sendMessage: (roomId: string, message: any) => Promise<void>
}

const MatrixContext = createContext<MatrixContextType>({
  client: null,
  isInitialized: false,
  syncState: "",
  createRoom: async () => { throw new Error("Matrix client not initialized") },
  sendMessage: async () => { throw new Error("Matrix client not initialized") }
})

export const useMatrixClient = () => useContext(MatrixContext)

interface MatrixClientProviderProps {
  children: ReactNode
}

export const MatrixClientProvider = ({ children }: MatrixClientProviderProps) => {
  const [client, setClient] = useState<MatrixClient | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [syncState, setSyncState] = useState("")

  // Improve the Matrix client initialization and event handling

  // Update the useEffect in MatrixClientProvider to better handle client initialization
  useEffect(() => {
    const accessToken = localStorage.getItem("matrix_access_token")
    const userId = localStorage.getItem("matrix_user_id")
    const homeServer = localStorage.getItem("matrix_home_server")
    const deviceId = localStorage.getItem("matrix_device_id")

    if (accessToken && userId && homeServer) {
      const initClient = async () => {
        try {
          console.log('Initializing Matrix client with:', {
            homeServer,
            userId,
            hasAccessToken: !!accessToken,
            hasDeviceId: !!deviceId
          })

          const matrixClient = await initializeMatrixClient(homeServer, {
            accessToken,
            userId,
            deviceId: deviceId || undefined,
          })

          // Set up sync state listener
          matrixClient.on("sync" as any, (state: string, prevState: string | null, data: any) => {
            // Only log state changes that aren't reconnection noise
            if (state !== "SYNCING" && state !== "RECONNECTING") {
              console.log("Matrix sync state changed:", state, prevState)
            }
            setSyncState(state)

            // Start client if not already started
            if (state === "PREPARED" && !matrixClient.clientRunning) {
              console.log("Starting Matrix client after PREPARED state")
              matrixClient.startClient()
            }
          })

          // Add global error handler for Matrix client errors
          const handleMatrixError = (error: any) => {
            // Handle network connectivity errors quietly
            if (error?.name === 'ConnectionError' || 
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('ERR_NETWORK_CHANGED') ||
                error?.message?.includes('Failed to fetch')) {
              console.warn("Network connectivity issue, Matrix will retry:", error.message || error.name)
              return
            }
            
            // Handle specific error types
            if (error?.name === 'RoomStateError' || error?.message?.includes('unknown room')) {
              console.warn("Handling room state error for unknown room:", {
                roomId: error?.roomId || 'unknown',
                message: error?.message || error
              })
              
              // Try to rejoin the room if we have a valid room ID
              if (error?.roomId && typeof error.roomId === 'string' && error.roomId.startsWith('!')) {
                console.log(`Attempting to rejoin room: ${error.roomId}`)
                try {
                  // Use a timeout to avoid blocking the error handler
                  setTimeout(async () => {
                    try {
                      await matrixClient.joinRoom(error.roomId)
                      console.log(`Successfully rejoined room: ${error.roomId}`)
                    } catch (joinError) {
                      console.warn(`Could not rejoin room ${error.roomId}:`, joinError)
                    }
                  }, 100)
                } catch (e) {
                  console.warn('Error setting up room rejoin:', e)
                }
              }
              return
            }
            
            // Log other errors but don't crash the app
            if (error?.errcode || error?.error) {
              console.error("Matrix API error:", {
                errcode: error.errcode,
                error: error.error,
                data: error.data
              })
            } else {
              console.warn("Matrix client error:", error)
            }
          }

          // Listen for general errors
          matrixClient.on("error" as any, handleMatrixError)
          matrixClient.on("sync.error" as any, handleMatrixError)
          matrixClient.on("clientWellKnown" as any, handleMatrixError)
          matrixClient.on("Room.accountData" as any, (...args: any[]) => {
            try {
              // Handle room account data updates safely
            } catch (error) {
              console.warn("Error handling room account data:", error)
            }
          })

          // Configure client to sync historical rooms
          const startClientOptions = {
            // Sync additional state for better room discovery
            syncLimit: 50,
            // Include left rooms to get call history
            includeArchivedRooms: true,
            // Resolve invites and left rooms
            resolveInvites: true
          }

          // Start the client
          if (!matrixClient.clientRunning) {
            console.log("Starting Matrix client during initialization")
            matrixClient.startClient(startClientOptions)
          }

          setClient(matrixClient as any)
          setIsInitialized(true)
        } catch (error) {
          console.error("Failed to initialize Matrix client:", error)
          // Clear stored credentials if initialization fails
          localStorage.removeItem("matrix_access_token")
          localStorage.removeItem("matrix_user_id")
          localStorage.removeItem("matrix_home_server")
          localStorage.removeItem("matrix_device_id")
          setIsInitialized(true) // Set to true to show login screen
        }
      }

      initClient()
    } else {
      setIsInitialized(true) // Set to true to show login screen
    }

    // Cleanup function
    return () => {
      if (client) {
        client.removeAllListeners("sync" as any)
        client.stopClient()
      }
    }
  }, [])

  // Helper functions for LC operations
  const createRoom = async (options: any): Promise<string> => {
    if (!client || !client.createRoom) {
      throw new Error("Matrix client not available")
    }
    
    try {
      const response = await client.createRoom(options)
      return response.room_id
    } catch (error) {
      console.error("Error creating room:", error)
      throw error
    }
  }

  const sendMessage = async (roomId: string, message: any): Promise<void> => {
    if (!client) {
      throw new Error("Matrix client not available")
    }

    try {
      await client.sendEvent(roomId, "m.room.message", {
        msgtype: message.msgtype || "m.text",
        body: message.body,
        ...message
      })
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  return (
    <MatrixContext.Provider value={{ 
      client, 
      isInitialized, 
      syncState, 
      createRoom, 
      sendMessage 
    }}>
      {children}
    </MatrixContext.Provider>
  )
}
