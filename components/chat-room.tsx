"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { get } from "@/lib/service"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { Send, CreditCard, Mic, StopCircle, Trash2, Check, RefreshCw, Wallet, Phone, PhoneCall, Info, DollarSign, ArrowUpDown, Plus, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import TradeConfirmationDialog from "./trade-confirmation-dialog"
import AccountConnectionPrompt from "./account-connection-prompt"
import OrderConfirmationDialog from "./order-confirmation-dialog"
import RoomInfoDialog from "./room-info-dialog"
import { useMatrixCalls } from "@/lib/call-context"

// Remove specific imports from matrix-js-sdk to avoid dependency issues
// Just use the types we need without importing specific classes
interface MatrixEvent {
  getId(): string | null
  getSender(): string | null
  getContent(): any
  getType(): string
  getTs(): number
}

interface Room {
  roomId: string
  name: string
  timeline?: MatrixEvent[]
  getMember(userId: string): any
}

interface ChatRoomProps {
  roomId: string
  onToggleTrade?: () => void
  showTradePanel?: boolean
  onStartNewOTCSession?: () => void
  onCloseOTCSession?: () => void
}

interface Message {
  id: string
  sender: string
  senderDisplayName: string
  content: string
  timestamp: number
  type: "text" | "trade" | "system" | "voice" | "trade-accepted" | "order"
  event?: MatrixEvent
  audioUrl?: string
  orderId?: string
}

// Define the OrderDetails interface
interface OrderDetails {
  orderId: string
  direction: "buy" | "sell"
  baseAsset: string
  counterAsset: string
  amount: string
  price: string
  total: string
  seller: string
}

// Helper to check if an event was successfully sent (status is null)
const isEventSent = (event: any) => {
  // In matrix-js-sdk, a successfully sent event will have a null/undefined status
  // Local echoes or failed events have status values like "QUEUED", "NOT_SENT", "CANCELLED", etc.
  return !event?.getStatus || event.getStatus() == null
}

export default function ChatRoom({ roomId, onToggleTrade, showTradePanel, onStartNewOTCSession, onCloseOTCSession }: ChatRoomProps) {
  const { client } = useMatrixClient()
  const { startCall, simulateIncomingCall } = useMatrixCalls()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const isMobile = useMobile()
  const [tradeConfirmationOpen, setTradeConfirmationOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<{
    messageId: string
    content: string
    sender: string
    isBuy: boolean
    asset: string
    amount: string
    currency: string
    value: string
  } | null>(null)
  const [acceptedTrades, setAcceptedTrades] = useState<string[]>([])
  const [processingOrderIds, setProcessingOrderIds] = useState<string[]>([])
  const [isWalletPromptOpen, setIsWalletPromptOpen] = useState(false)
  const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    if (!client || !roomId) return

    setIsLoading(true)
    setMessages([])

    // Get room timeline
    const room = client.getRoom(roomId)
    if (room) {
      loadRoomMessages(room)
    }

    // Listen for new messages in this room
    const onMessage = (event: MatrixEvent, room: Room) => {
      if (room.roomId !== roomId || event.getType() !== "m.room.message") return

      // Ignore local echoes / unsent events
      if (!isEventSent(event as any)) return

      const content = event.getContent()
      const msgtype = content.msgtype
      const sender = event.getSender() || "Unknown"

      // Ignore signalling messages
      if (content.body && content.body.startsWith("SIGNAL:")) {
        return; // do not render signalling data
      }

      // Get sender's display name
      let senderDisplayName = sender
      try {
        const memberInfo = room.getMember(sender)
        if (memberInfo && memberInfo.name) {
          senderDisplayName = memberInfo.name
          // If it's a Matrix ID, extract just the username part
          if (senderDisplayName.startsWith("@") && senderDisplayName.includes(":")) {
            senderDisplayName = senderDisplayName.split(":")[0].substring(1)
          }
        } else {
          // If no member info, extract username from Matrix ID
          if (sender.startsWith("@") && sender.includes(":")) {
            senderDisplayName = sender.split(":")[0].substring(1)
          }
        }
      } catch (error) {
        console.error("Error getting member info:", error)
        // Fallback to extracting from Matrix ID
        if (sender.startsWith("@") && sender.includes(":")) {
          senderDisplayName = sender.split(":")[0].substring(1)
        }
      }

      // Only add text messages
      if (msgtype === "m.text" || msgtype === "m.notice") {
        setMessages((prev) => [
          ...prev,
          {
            id: event.getId() || Math.random().toString(),
            sender: sender,
            senderDisplayName: senderDisplayName,
            content: content.body || "",
            timestamp: event.getTs(),
            type: content.body.includes("🏦 Bond Trade:")
              ? "trade"
              : content.body.includes("✅ Trade Accepted:")
                ? "trade-accepted"
                : content.body.includes("🎤 Voice message")
                  ? "voice"
                  : content.body.includes("🏦 Order Created:") || content.body.includes("Order Created:")
                    ? "order"
                    : "text",
            event,
            audioUrl: content.url || null,
            // Extract order ID if it's an order message
            orderId:
              content.body.includes("🏦 Order Created:") || content.body.includes("Order Created:")
                ? parseOrderId(content.body)
                : undefined,
          },
        ])
      }
    }

    client.on("Room.timeline", onMessage)
    setIsLoading(false)

    return () => {
      client.removeListener("Room.timeline", onMessage)
    }
  }, [client, roomId])

  // Function to extract order ID from message content
  const parseOrderId = (content: string): string | undefined => {
    // Look for a pattern like "#orderId" at the end of the message
    const match = content.match(/#([A-Za-z0-9_-]+)/)
    return match ? match[1] : undefined
  }

  const loadRoomMessages = (room: any) => {
    // Get timeline events
    const timeline = room.timeline || []

    const formattedMessages = timeline
      .filter((event: MatrixEvent) => {
        // Exclude events that weren't successfully sent
        if (!isEventSent(event as any)) return false

        const type = event.getType()
        if (type !== "m.room.message") return false

        const content = event.getContent()
        const msgtype = content.msgtype
        // Skip signalling messages
        if (content.body && content.body.startsWith("SIGNAL:")) return false
        return msgtype === "m.text" || msgtype === "m.notice" || msgtype === "m.audio"
      })
      .map((event: MatrixEvent) => {
        const content = event.getContent()
        let messageType: "text" | "trade" | "system" | "voice" | "trade-accepted" | "order" = "text"
        const sender = event.getSender() || "Unknown"

        // Get sender's display name
        let senderDisplayName = sender
        try {
          const memberInfo = room.getMember(sender)
          if (memberInfo && memberInfo.name) {
            senderDisplayName = memberInfo.name
            // If it's a Matrix ID, extract just the username part
            if (senderDisplayName.startsWith("@") && senderDisplayName.includes(":")) {
              senderDisplayName = senderDisplayName.split(":")[0].substring(1)
            }
          } else {
            // If no member info, extract username from Matrix ID
            if (sender.startsWith("@") && sender.includes(":")) {
              senderDisplayName = sender.split(":")[0].substring(1)
            }
          }
        } catch (error) {
          console.error("Error getting member info:", error)
          // Fallback to extracting from Matrix ID
          if (sender.startsWith("@") && sender.includes(":")) {
            senderDisplayName = sender.split(":")[0].substring(1)
          }
        }

        if (content.body?.includes("🏦 Bond Trade:")) {
          messageType = "trade"
        } else if (content.body?.includes("✅ Trade Accepted:")) {
          messageType = "trade-accepted"
        } else if (content.body?.includes("🎤 Voice message")) {
          messageType = "voice"
        } else if (content.body?.includes("🏦 Order Created:") || content.body?.includes("Order Created:")) {
          messageType = "order"
        } else if (content.msgtype === "m.notice") {
          messageType = "system"
        }

        return {
          id: event.getId() || Math.random().toString(),
          sender: sender,
          senderDisplayName: senderDisplayName,
          content: content.body || "",
          timestamp: event.getTs(),
          type: messageType,
          event,
          audioUrl: content.url || null,
          // Extract order ID if it's an order message
          orderId: messageType === "order" ? parseOrderId(content.body) : undefined,
        }
      })

    setMessages(formattedMessages)
  }

  // Check for wallet connection status
  useEffect(() => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

    if (cleanMatrixId) {
      const savedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      setConnectedUsername(savedUsername)
    }
  }, [client])

  // Get partner name from room members
  useEffect(() => {
    if (!client || !roomId) return

    const room = client.getRoom(roomId)
    if (room) {
      const currentUserId = client.getUserId()
      const members = room.getJoinedMembers?.()
      if (members) {
        const otherMember = Object.values(members).find((member: any) => member.userId !== currentUserId) as any
        if (otherMember) {
          let name = otherMember.name || otherMember.userId
          if (name.startsWith('@') && name.includes(':')) {
            name = name.split(':')[0].substring(1)
          }
          setPartnerName(name)
        }
      }
    }
  }, [client, roomId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || !client || !roomId) return

    try {
      // Send message to room
      const content = {
        body: inputMessage,
        msgtype: "m.text",
      }

      await client.sendEvent(roomId, "m.room.message", content)
      setInputMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(url)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      let seconds = 0
      recordingTimerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)

        // Auto-stop after 60 seconds
        if (seconds >= 60) {
          stopRecording()
        }
      }, 1000)

      toast({
        title: "Recording started",
        description: "Recording voice message...",
      })
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    setIsRecording(false)
  }

  const cancelRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
  }

  const sendVoiceMessage = async () => {
    if (!audioBlob || !client || !roomId) return

    try {
      // For a real implementation, you would upload the audio file to Matrix
      // and then send an m.audio message with the URL
      // This is a simplified version that just sends a text message

      const content = {
        body: `🎤 Voice message (${formatDuration(recordingTime)})`,
        msgtype: "m.text",
      }

      await client.sendEvent(roomId, "m.room.message", content)

      // Reset recording state
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)

      toast({
        title: "Voice message sent",
        description: "Your voice message has been sent",
      })
    } catch (error) {
      console.error("Error sending voice message:", error)
      toast({
        title: "Failed to send voice message",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleTakeTrade = (message: Message) => {
    // Parse the trade message
    const content = message.content
    const isBuy = content.includes("Buy")

    // Extract amount and asset
    const amountMatch = content.match(/(\d+(\.\d+)?) units of (.+?) for/)
    const amount = amountMatch ? amountMatch[1] : "0"
    const asset = amountMatch ? amountMatch[3] : ""

    // Extract value and currency
    const valueMatch = content.match(/for (\d+(\.\d+)?) ([A-Z]+)/)
    const value = valueMatch ? valueMatch[1] : "0"
    const currency = valueMatch ? valueMatch[3] : ""

    // Set the selected trade details
    setSelectedTrade({
      messageId: message.id,
      content: message.content,
      sender: message.sender,
      isBuy,
      asset,
      amount,
      currency,
      value,
    })

    // Open the trade confirmation dialog
    setTradeConfirmationOpen(true)
  }

  // Update handleTakeOrder to ensure API URL is correct
  // Replace the existing handleTakeOrder function with this one

  const handleTakeOrder = async (message: Message) => {
    if (!client || !roomId) {
      toast({
        title: "Cannot take order",
        description: "Missing client or room information",
        variant: "destructive",
      })
      return
    }

    // Get the connected username from localStorage
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
    const connectedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)

    if (!connectedUsername) {
      // Show account connection prompt
      setIsWalletPromptOpen(true)
      return
    }

    // Try to extract order ID from message content if not already available
    const orderId = message.orderId || parseOrderId(message.content)

    if (!orderId) {
      toast({
        title: "Cannot take order",
        description: "Missing order information",
        variant: "destructive",
      })
      return
    }

    // Set the selected order ID
    setSelectedOrderId(orderId)

    // Add this order ID to the processing list to show loading state
    setProcessingOrderIds((prev) => [...prev, orderId])

    // Fetch order details
    try {
      const data = await get(`getOrder/${orderId}`) as any

      // Remove from processing list
      setProcessingOrderIds((prev) => prev.filter((id) => id !== orderId))

      if (data.status === 200 && data.data) {
        const order = data.data

        // Calculate total
        const amount = Number.parseFloat(order.amount)
        const price = Number.parseFloat(order.price)
        const total = (amount * price).toFixed(2)

        setOrderDetails({
          orderId: order.order_id,
          direction: order.direction,
          baseAsset: order.base_asset,
          counterAsset: order.counter_asset,
          amount: order.amount,
          price: order.price,
          total,
          seller: message.sender,
        })

        // Open order confirmation dialog
        setIsOrderConfirmationOpen(true)
      } else {
        // Show error message from API response
        toast({
          title: "Failed to fetch order details",
          description: data.message || `Error: ${data.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Failed to fetch order details",
        description: error instanceof Error ? error.message : "Could not fetch order details",
        variant: "destructive",
      })

      // Remove from processing list in case of error
      setProcessingOrderIds((prev) => prev.filter((id) => id !== orderId))
    }
  }

  const handleConnectAccount = () => {
    setIsWalletPromptOpen(false)
    // Open the account connection dialog
    if (client) {
      const matrixUserId = client.getUserId() || ""
      const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

      // This assumes you have a global state or context for showing the account connection dialog
      // You might need to adjust this based on your actual implementation
      const walletPanel = document.querySelector("[data-account-panel]")
      if (walletPanel) {
        // Simulate a click on the wallet panel button
        walletPanel.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      } else {
        // Fallback if we can't find the wallet panel button
        toast({
          title: "Connect account",
          description: "Please connect your account from the wallet panel",
        })
      }
    }
  }

  const handleTradeAccepted = (messageId: string) => {
    setAcceptedTrades((prev) => [...prev, messageId])
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* New wallet connection prompt */}
      {!localStorage.getItem(`otc_chat_${client?.getUserId()?.replace(/^@/, "").split(":")[0]}`) && (
        <div className="bg-blue-100 dark:bg-blue-900 p-3 shadow-sm cursor-pointer" onClick={handleConnectAccount}>
          <div className="flex items-center">
            <Wallet className="h-5 w-5 mr-2 text-blue-700 dark:text-blue-300" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Connect your PELOTON Plus wallet</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Click here to access trading features</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Room Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <div className={`w-2 h-2 rounded-full ${connectedUsername ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {connectedUsername ? `Clic Wallet: ${connectedUsername}` : 'Clic Wallet Disconnected'}
            </span>
          </div>
          {/* Partner name removed as requested */}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('Call button clicked, roomId:', roomId)
              console.log('startCall function:', startCall)
              toast({
                title: "Call button clicked",
                description: `Attempting to call in room: ${roomId}`,
              })
              startCall(roomId)
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Start voice call"
          >
            <PhoneCall className="h-4 w-4" />
          </Button>
          {onToggleTrade && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTrade}
              className={`text-muted-foreground hover:text-foreground ${
                showTradePanel ? 'bg-muted text-foreground' : ''
              }`}
              title="Toggle OTC Trading Panel"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
          {onStartNewOTCSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartNewOTCSession}
              className="text-muted-foreground hover:text-foreground"
              title="Start New OTC Trading Session"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {onCloseOTCSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCloseOTCSession}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Close OTC Trading Session"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRoomInfoOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Room info"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.sender === client?.getUserId()
              const isProcessing = message.orderId && processingOrderIds.includes(message.orderId)

              return (
                <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-lg p-3 text-foreground ${
                      message.type === "trade"
                        ? "bg-amber-100 dark:bg-amber-900"
                        : message.type === "order"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : message.type === "trade-accepted"
                            ? "bg-green-100 dark:bg-green-900"
                            : message.type === "voice"
                              ? "bg-green-100 dark:bg-green-900"
                              : isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                    }`}
                  >
                    {!isCurrentUser && <div className="text-xs font-medium mb-1">{message.senderDisplayName}</div>}

                    {message.type === "trade" ? (
                      <div>
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-sm">{message.content}</span>
                        </div>

                        {message.sender !== client?.getUserId() && !acceptedTrades.includes(message.id) && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-amber-200 hover:bg-amber-100"
                              style={{
                                backgroundColor: "rgba(254, 243, 199, 0.5)",
                                color: "var(--foreground)",
                              }}
                              onClick={() => handleTakeTrade(message)}
                            >
                              Take Trade
                            </Button>
                          </div>
                        )}

                        {acceptedTrades.includes(message.id) && (
                          <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            ✅ Trade Accepted
                          </div>
                        )}
                      </div>
                    ) : message.type === "order" ? (
                      <div>
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="text-sm">{message.content}</span>
                        </div>

                        {message.sender !== client?.getUserId() && !acceptedTrades.includes(message.id) && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-blue-200 hover:bg-blue-100"
                              style={{
                                backgroundColor: "rgba(219, 234, 254, 0.5)",
                                color: "var(--foreground)",
                              }}
                              onClick={() => handleTakeOrder(message)}
                              disabled={processingOrderIds.includes(message.orderId || "")}
                            >
                              {processingOrderIds.includes(message.orderId || "") ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Take Order"
                              )}
                            </Button>
                          </div>
                        )}

                        {acceptedTrades.includes(message.id) && (
                          <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            ✅ Order Accepted
                          </div>
                        )}
                      </div>
                    ) : message.type === "trade-accepted" ? (
                      <div className="flex items-center">
                        <Check className="h-4 w-4 mr-2 flex-shrink-0 text-green-600 dark:text-green-400" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : message.type === "voice" ? (
                      <div className="flex items-center">
                        <Mic className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-foreground text-sm">{message.content}</div>
                    )}

                    <div className="text-xs opacity-70 mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-2 md:p-4 border-t border-border">
        {isRecording ? (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                <span>Recording... {formatDuration(recordingTime)}</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={cancelRecording}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={stopRecording}
                  className="bg-skyblue-400 hover:bg-skyblue-500"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
            </div>
            <Progress value={Math.min((recordingTime / 60) * 100, 100)} className="h-1" />
          </div>
        ) : audioUrl ? (
          <div className="flex flex-col space-y-2">
            <audio src={audioUrl} controls className="w-full" />
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={cancelRecording} className="flex-1">
                <Trash2 className="h-4 w-4 mr-1" />
                Discard
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={sendVoiceMessage}
                className="flex-1 bg-skyblue-400 hover:bg-skyblue-500"
              >
                <Send className="h-4 w-4 mr-1" />
                Send Voice Message
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <Textarea
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[40px] md:min-h-[60px] resize-none text-sm"
              rows={isMobile ? 1 : 2}
            />
            <div className="flex flex-col space-y-2">
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={startRecording}
                className="text-skyblue-500 border-skyblue-200 hover:bg-skyblue-50"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <TradeConfirmationDialog
        isOpen={tradeConfirmationOpen}
        onClose={() => {
          setTradeConfirmationOpen(false)
          if (selectedTrade) {
            handleTradeAccepted(selectedTrade.messageId)
          }
        }}
        tradeDetails={selectedTrade}
        roomId={roomId}
      />

      <AccountConnectionPrompt
        isOpen={isWalletPromptOpen}
        onClose={() => setIsWalletPromptOpen(false)}
        onConnect={handleConnectAccount}
      />

      <OrderConfirmationDialog
        isOpen={isOrderConfirmationOpen}
        onClose={() => {
          setIsOrderConfirmationOpen(false)
          setOrderDetails(null)
        }}
        orderDetails={orderDetails}
        roomId={roomId}
      />

      <RoomInfoDialog
        isOpen={isRoomInfoOpen}
        onClose={() => setIsRoomInfoOpen(false)}
        roomId={roomId}
      />
    </div>
  )
}
