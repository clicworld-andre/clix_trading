"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { useToast } from "@/hooks/use-toast"
import { callDiagnostics, checkMatrixSpecCompliance } from "@/lib/call-diagnostics"

export interface CallState {
  isCallActive: boolean
  isIncoming: boolean
  roomId: string | null
  peerId: string | null
  peerName: string | null
  peerAvatar: string | null
  callId: string | null
  callStartTime: number | null
  callDuration: number
  connectionState: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'failed' | 'ended'
  callEndedReason?: string
}

interface CallContextType {
  callState: CallState
  startCall: (roomId: string, peerId?: string) => Promise<void>
  answerCall: () => void
  endCall: (reason?: string) => void
  simulateIncomingCall: (roomId: string, peerId: string, peerName: string) => void
  updateConnectionState: (state: CallState['connectionState']) => void
}

const CallContext = createContext<CallContextType>({
  callState: {
    isCallActive: false,
    isIncoming: false,
    roomId: null,
    peerId: null,
    peerName: null,
    peerAvatar: null,
    callId: null,
    callStartTime: null,
    callDuration: 0,
    connectionState: 'idle',
    callEndedReason: undefined,
  },
  startCall: async () => {},
  answerCall: () => {},
  endCall: () => {},
  simulateIncomingCall: () => {},
  updateConnectionState: () => {},
})

export const useMatrixCalls = () => useContext(CallContext)

interface CallContextProviderProps {
  children: ReactNode
}

export const CallContextProvider = ({ children }: CallContextProviderProps) => {
  const { client } = useMatrixClient()
  const { toast } = useToast()
  
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isIncoming: false,
    roomId: null,
    peerId: null,
    peerName: null,
    peerAvatar: null,
    callId: null,
    callStartTime: null,
    callDuration: 0,
    connectionState: 'idle',
    callEndedReason: undefined,
  })

  // Call timeout refs and cleanup function
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Cleanup function for call state
  const cleanupCall = useCallback((reason?: string) => {
    // Save call history before cleanup
    setCallState(prevState => {
      if (prevState.isCallActive && prevState.callStartTime) {
        saveCallToHistory({
          callId: prevState.callId || `call_${Date.now()}`,
          roomId: prevState.roomId || '',
          participants: [{
            userId: prevState.peerId || '',
            name: prevState.peerName || 'Unknown',
            avatar: prevState.peerAvatar || null,
          }],
          startTime: prevState.callStartTime,
          endTime: Date.now(),
          duration: prevState.callDuration,
          isIncoming: prevState.isIncoming,
          endReason: reason || 'unknown',
          connectionState: prevState.connectionState,
        })
      }
      return prevState
    })
    
    // Clear timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    // Reset call state
    setCallState({
      isCallActive: false,
      isIncoming: false,
      roomId: null,
      peerId: null,
      peerName: null,
      peerAvatar: null,
      callId: null,
      callStartTime: null,
      callDuration: 0,
      connectionState: 'ended',
      callEndedReason: reason,
    })
  }, [])
  
  // Save call to history
  const saveCallToHistory = useCallback((callData: {
    callId: string
    roomId: string
    participants: Array<{
      userId: string
      name: string
      avatar: string | null
    }>
    startTime: number
    endTime: number
    duration: number
    isIncoming: boolean
    endReason: string
    connectionState: string
  }) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem('call-history') || '[]')
      
      const callRecord = {
        id: callData.callId,
        type: 'voice' as const,
        roomId: callData.roomId,
        participants: callData.participants,
        timestamp: callData.startTime,
        endTimestamp: callData.endTime,
        duration: callData.duration,
        direction: callData.isIncoming ? 'incoming' as const : 'outgoing' as const,
        status: callData.endReason === 'hangup' || callData.endReason === 'user_hangup' ? 'completed' as const :
                callData.endReason === 'timeout' ? 'missed' as const :
                'failed' as const,
        metadata: {
          connectionState: callData.connectionState,
          endReason: callData.endReason,
        },
      }
      
      const updatedHistory = [callRecord, ...existingHistory].slice(0, 100) // Keep last 100 calls
      localStorage.setItem('call-history', JSON.stringify(updatedHistory))
      
      console.log('CallContext: Saved call to history:', callRecord)
    } catch (error) {
      console.error('CallContext: Failed to save call to history:', error)
    }
  }, [])
  
  // Start duration tracking when call connects (only start tracking, don't change connection state)
  const startDurationTracking = useCallback(() => {
    const startTime = Date.now()
    setCallState(prev => ({ ...prev, callStartTime: startTime }))
    
    durationIntervalRef.current = setInterval(() => {
      setCallState(prev => ({
        ...prev,
        callDuration: prev.callStartTime ? Math.floor((Date.now() - prev.callStartTime) / 1000) : 0,
      }))
    }, 1000)
  }, [])
  
  // Set up call timeout for unanswered calls
  const startCallTimeout = useCallback((timeoutMs: number = 30000) => {
    callTimeoutRef.current = setTimeout(() => {
      console.log('CallContext: Call timeout - ending call')
      cleanupCall('timeout')
      
      setTimeout(() => {
        toast({
          title: "Call timeout",
          description: "Call was not answered in time",
          variant: "destructive",
        })
      }, 0)
    }, timeoutMs)
  }, [cleanupCall, toast])
  
  // Update connection state
  const updateConnectionState = useCallback((state: CallState['connectionState']) => {
    setCallState(prev => ({ ...prev, connectionState: state }))
  }, [])

  // Listen for incoming call events
  useEffect(() => {
    if (!client) return

    // Handle Matrix VoIP call events
    const handleCallInvite = (event: any) => {
      console.log('CallContext: m.call.invite event received:', event)
      const content = event.getContent()
      const sender = event.getSender()
      const currentUserId = client.getUserId()
      const roomId = event.getRoomId()
      
      // Ignore our own call invites
      if (sender === currentUserId) {
        console.log('CallContext: Ignoring own call invite')
        return
      }
      
      console.log('CallContext: Processing incoming call from:', sender, 'in room:', roomId)
      console.log('CallContext: Call content:', content)
        
      // Check if we're already in a call by using the current state
      setCallState(prevState => {
        // Don't show incoming call if we're already in a call
        if (prevState.isCallActive) {
          console.log('CallContext: Ignoring incoming call - already in call')
          return prevState
        }

        // Get caller info
        let callerName = sender
        let callerAvatar = null
        
        try {
          const room = client.getRoom(roomId)
          if (room) {
            const memberInfo = room.getMember(sender)
            if (memberInfo && memberInfo.name) {
              callerName = memberInfo.name
              // Clean up display name
              if (callerName.startsWith("@") && callerName.includes(":")) {
                callerName = callerName.split(":")[0].substring(1)
              }
            } else if (sender.startsWith("@") && sender.includes(":")) {
              callerName = sender.split(":")[0].substring(1)
            }
            
            // Get avatar with comprehensive validation
            if (memberInfo && memberInfo.getAvatarUrl && client.mxcUrlToHttp) {
              try {
                const avatarMxcUrl = memberInfo.getAvatarUrl()
                console.log('CallContext: Raw avatar MXC URL:', avatarMxcUrl)
                
                if (avatarMxcUrl && typeof avatarMxcUrl === 'string' && avatarMxcUrl.startsWith('mxc://')) {
                  // Check if client has proper baseUrl configured
                  let baseUrl = (client as any).baseUrl
                  if (!baseUrl || baseUrl === 'undefined' || baseUrl.includes('undefined')) {
                    baseUrl = (client as any).getHomeserverUrl?.()
                  }
                  if (!baseUrl || baseUrl === 'undefined' || baseUrl.includes('undefined')) {
                    // Fallback to stored credentials or default
                    const storedCredentials = JSON.parse(localStorage.getItem('matrix_credentials') || '{}')
                    baseUrl = storedCredentials.homeserver || 'https://chat.clic2go.ug'
                  }
                  console.log('CallContext: Base URL for avatar generation:', baseUrl)
                  
                  if (baseUrl && typeof baseUrl === 'string' && baseUrl !== 'undefined' && !baseUrl.includes('undefined')) {
                    const generatedAvatar = client.mxcUrlToHttp(avatarMxcUrl, 40, 40, "scale", true)
                    
                    // Validate the generated avatar URL doesn't contain undefined
                    if (generatedAvatar && !generatedAvatar.includes('undefined')) {
                      callerAvatar = generatedAvatar
                      console.log('CallContext: Generated valid avatar URL:', callerAvatar)
                    } else {
                      console.warn('CallContext: Generated avatar URL contains undefined:', generatedAvatar)
                    }
                  } else {
                    console.warn('CallContext: Invalid base URL for avatar generation:', baseUrl)
                  }
                } else {
                  console.log('CallContext: Invalid avatar MXC URL:', avatarMxcUrl)
                }
              } catch (error) {
                console.warn('CallContext: Failed to generate avatar URL:', error)
              }
            }
          } else {
            // Extract name from sender ID if room info not available
            if (sender.startsWith("@") && sender.includes(":")) {
              callerName = sender.split(":")[0].substring(1)
            }
          }
        } catch (error) {
          console.error('CallContext: Error getting caller info:', error)
        }

        // Schedule toast for next tick to avoid render conflicts
        setTimeout(() => {
          toast({
            title: "Incoming call",
            description: `${callerName} is calling...`,
          })
        }, 0)

        // Play a ringing sound (if available)
        try {
          // You can add an audio element here if you have a ringing sound file
          console.log('CallContext: Would play ringing sound here')
        } catch (error) {
          console.error('CallContext: Error playing ringing sound:', error)
        }

        console.log('CallContext: Setting incoming call state')
        console.log('CallContext: Original call_id from invite:', content.call_id)
        
        // Notify the WebRTC component that we have an SDP offer for incoming call
        if (content.offer) {
          console.log('CallContext: Broadcasting SDP offer to WebRTC layer for incoming call')
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('matrix-offer', {
              detail: {
                callId: content.call_id,
                offer: content.offer
              }
            }))
          }, 100) // Small delay to ensure the VoiceCall component is initialized
        }
        
        // Start timeout for incoming call (30 seconds)
        startCallTimeout(30000)
        
        // Return new incoming call state with the original call ID
        return {
          isCallActive: true,
          isIncoming: true,
          roomId: roomId,
          peerId: sender,
          peerName: callerName,
          peerAvatar: callerAvatar,
          callId: content.call_id, // Store the original call ID from the invite
          callStartTime: null,
          callDuration: 0,
          connectionState: 'ringing',
          callEndedReason: undefined,
        }
      })
    }

    // Handle call answer events
    const handleCallAnswer = (event: any) => {
      console.log('CallContext: m.call.answer event received:', event)
      const content = event.getContent()
      const sender = event.getSender()
      const currentUserId = client.getUserId()
      
      console.log('CallContext: Answer event details:', {
        sender: sender,
        currentUser: currentUserId,
        callId: content.call_id,
        content: content
      })
      
      if (sender === currentUserId) {
        console.log('CallContext: Ignoring own answer event')
        return
      }
      
      setCallState(prevState => {
        console.log('CallContext: Current state when processing answer:', prevState)
        
        // Only process if we're the caller (not incoming call) and call is active
        if (prevState.isCallActive && !prevState.isIncoming) {
          console.log('CallContext: Processing answer - call was accepted!')
          
          // Clear the call timeout since it was answered
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current)
            callTimeoutRef.current = null
          }
          
          setTimeout(() => {
            toast({
              title: "Call connected",
              description: `${prevState.peerName} answered the call`,
            })
          }, 0)
          
          // Notify the WebRTC component that we have an SDP answer
          if (content.answer) {
            console.log('CallContext: Broadcasting SDP answer to WebRTC layer')
            window.dispatchEvent(new CustomEvent('matrix-answer', {
              detail: {
                callId: content.call_id,
                answer: content.answer
              }
            }))
          }
          
          // Start duration tracking (but don't change connection state yet)
          // The WebRTC layer will update the connection state when actually connected
          startDurationTracking()
          
          // Keep the call active but let WebRTC control the connection state
          return {
            ...prevState,
            connectionState: 'connecting', // Let WebRTC layer control when it becomes 'connected'
          }
        } else {
          console.log('CallContext: Not processing answer - not applicable to current state')
        }
        
        return prevState
      })
    }

    // Handle call hangup events
    const handleCallHangup = (event: any) => {
      console.log('CallContext: m.call.hangup event received:', event)
      const sender = event.getSender()
      const currentUserId = client.getUserId()
      
      if (sender === currentUserId) return
      
      setCallState(prevState => {
        if (prevState.isCallActive) {
          setTimeout(() => {
            toast({
              title: "Call ended",
              description: `${prevState.peerName} ended the call`,
            })
          }, 0)
          
          // Clean up call state and timers
          cleanupCall('hangup')
          
          // Return ended call state (handled by cleanupCall)
          return {
            isCallActive: false,
            isIncoming: false,
            roomId: null,
            peerId: null,
            peerName: null,
            peerAvatar: null,
            callId: null,
            callStartTime: null,
            callDuration: 0,
            connectionState: 'ended',
            callEndedReason: 'hangup',
          }
        }
        return prevState
      })
    }

    // Handle ICE candidates events
    const handleCallCandidates = (event: any) => {
      console.log('CallContext: m.call.candidates event received:', event)
      const content = event.getContent()
      const sender = event.getSender()
      const currentUserId = client.getUserId()
      
      console.log('CallContext: ICE candidates details:', {
        sender: sender,
        currentUser: currentUserId,
        callId: content.call_id,
        candidatesCount: content.candidates?.length || 0,
        candidates: content.candidates
      })
      
      if (sender === currentUserId) {
        console.log('CallContext: Ignoring own ICE candidates')
        return
      }
      
      // Only process if we have an active call and the call IDs match
      setCallState(prevState => {
        if (prevState.isCallActive && prevState.callId === content.call_id) {
          console.log('CallContext: Processing ICE candidates for active call')
          
          // Notify the WebRTC component that we have new ICE candidates
          // This will be handled by the WebRTC integration we'll add next
          if (content.candidates && Array.isArray(content.candidates)) {
            console.log('CallContext: Broadcasting ICE candidates to WebRTC layer:', content.candidates.length)
            // Emit a custom event that the VoiceCall component can listen to
            window.dispatchEvent(new CustomEvent('matrix-ice-candidates', {
              detail: {
                callId: content.call_id,
                candidates: content.candidates
              }
            }))
          }
        } else {
          console.log('CallContext: Ignoring ICE candidates - no active call or call ID mismatch')
        }
        
        return prevState
      })
    }

    // Also handle custom call events for backward compatibility
    const handleRoomTimeline = (event: any, room: any) => {
      // Handle custom call events in room messages
      if (event.getType() !== "m.room.message") return
      
      const content = event.getContent()
      const sender = event.getSender()
      const currentUserId = client.getUserId()
      
      // Ignore our own messages
      if (sender === currentUserId) return
      
      // Check for custom call events (for compatibility with our implementation)
      if (content.call_event && content.call_event.type === "call.invite") {
        console.log('CallContext: Custom call.invite detected from:', sender, 'in room:', room.roomId)
        
        setCallState(prevState => {
          if (prevState.isCallActive) {
            console.log('CallContext: Ignoring custom call invite - already in call')
            return prevState
          }

          let callerName = sender
          if (sender.startsWith("@") && sender.includes(":")) {
            callerName = sender.split(":")[0].substring(1)
          }

          setTimeout(() => {
            toast({
              title: "Incoming call",
              description: `${callerName} is calling...`,
            })
          }, 0)

          return {
            isCallActive: true,
            isIncoming: true,
            roomId: room.roomId,
            peerId: sender,
            peerName: callerName,
            peerAvatar: null,
            callId: `custom_call_${Date.now()}`,
            callStartTime: null,
            callDuration: 0,
            connectionState: 'ringing',
            callEndedReason: undefined,
          }
        })
      }
    }

    // Add comprehensive event logging and block unwanted call events
    client.on("event", (event: any) => {
      const eventType = event.getType()
      const sender = event.getSender()
      const roomId = event.getRoomId()
      const content = event.getContent()
      
      // Log all events for debugging
      if (eventType.startsWith('m.call') || eventType === 'm.room.message') {
        console.log('CallContext: Event received:', {
          type: eventType,
          sender: sender,
          roomId: roomId,
          content: content
        })
      }
      
      // Block and ignore any m.call.reject events to prevent auto-termination
      if (eventType === "m.call.reject") {
        console.log('CallContext: Blocking m.call.reject event to prevent call termination:', {
          sender: sender,
          callId: content.call_id,
          content: content
        })
        return // Don't process this event at all
      }
      
      if (eventType === "m.call.invite") {
        console.log('CallContext: Processing m.call.invite')
        handleCallInvite(event)
      } else if (eventType === "m.call.answer") {
        console.log('CallContext: Processing m.call.answer')
        handleCallAnswer(event)
      } else if (eventType === "m.call.candidates") {
        console.log('CallContext: Processing m.call.candidates')
        handleCallCandidates(event)
      } else if (eventType === "m.call.hangup") {
        console.log('CallContext: Processing m.call.hangup')
        handleCallHangup(event)
      }
    })
    
    // Also add timeline event logging
    const handleRoomTimelineDebug = (event: any, room: any) => {
      const eventType = event.getType()
      if (eventType.startsWith('m.call')) {
        console.log('CallContext: Timeline call event:', {
          type: eventType,
          sender: event.getSender(),
          roomId: room.roomId,
          content: event.getContent()
        })

        if (eventType === 'm.call.reject') {
            // Optionally, handle call rejection here, e.g., show a toast
            // For now, we'll just log it and not end the call, as the hangup event should handle termination
            console.log('CallContext: Ignoring m.call.reject in timeline to avoid premature hangup.')
            return; // Don't process this further
        }

      }
      handleRoomTimeline(event, room)
    }
    
    // Also listen for room timeline events for custom call events
    client.on("Room.timeline", handleRoomTimelineDebug)

    return () => {
      client.removeAllListeners("event")
      client.removeListener("Room.timeline", handleRoomTimelineDebug)
    }
  }, [client, toast])

  // Start a new call
  const startCall = useCallback(async (roomId: string, peerId?: string) => {
    console.log('CallContext: startCall called with roomId:', roomId, 'peerId:', peerId)
    console.log('CallContext: client available:', !!client)
    
    try {
      // Handle demo call scenario
      if (roomId === "demo-room-id") {
        console.log('CallContext: Setting demo call state')
        const newCallState = {
          isCallActive: true,
          isIncoming: false,
          roomId,
          peerId: peerId || "@demo:matrix.clix.trading",
          peerName: "Demo User",
          peerAvatar: null,
          callId: `demo_call_${Date.now()}`,
          callStartTime: null,
          callDuration: 0,
          connectionState: 'calling' as const,
          callEndedReason: undefined,
        }
        console.log('CallContext: New call state:', newCallState)
        setCallState(newCallState)

        // Defer toast to avoid render conflicts
        setTimeout(() => {
          toast({
            title: "Demo call initiated",
            description: "Starting demo call with Demo User...",
          })
        }, 0)
        return
      }

      if (!client) {
        // Defer toast to avoid render conflicts
        setTimeout(() => {
          toast({
            title: "Error",
            description: "Matrix client not available",
            variant: "destructive",
          })
        }, 0)
        return
      }

      // Get room info
      let room = null
      try {
        room = client.getRoom(roomId)
      } catch (error) {
        console.warn(`Could not get room ${roomId}:`, error)
      }
      
      let peerName = peerId || "Unknown User"
      let peerAvatar = null
      let otherMember = null
      let targetUserId = peerId

      if (room) {
        // For direct messages, get the other user's info
        const currentUserId = client.getUserId()
        const members = room.getJoinedMembers()
        
        if (peerId) {
          // Find specific user
          otherMember = members.find((member: any) => member.userId === peerId)
        } else {
          // Find the other user (not current user)
          otherMember = members.find((member: any) => member.userId !== currentUserId)
        }

        if (otherMember) {
          targetUserId = otherMember.userId
          peerName = otherMember.name || otherMember.userId
          
          // Clean up display name
          if (peerName.startsWith("@") && peerName.includes(":")) {
            peerName = peerName.split(":")[0].substring(1)
          }
          
          // Get avatar with comprehensive validation
          if (otherMember.getAvatarUrl && client.mxcUrlToHttp) {
            try {
              const avatarMxcUrl = otherMember.getAvatarUrl()
              console.log('CallContext: Raw outgoing call avatar MXC URL:', avatarMxcUrl)
              
              if (avatarMxcUrl && typeof avatarMxcUrl === 'string' && avatarMxcUrl.startsWith('mxc://')) {
                  // Check if client has proper baseUrl configured
                  let baseUrl = (client as any).baseUrl
                  if (!baseUrl || baseUrl === 'undefined' || baseUrl.includes('undefined')) {
                    baseUrl = (client as any).getHomeserverUrl?.()
                  }
                  if (!baseUrl || baseUrl === 'undefined' || baseUrl.includes('undefined')) {
                    // Fallback to stored credentials or default
                    const storedCredentials = JSON.parse(localStorage.getItem('matrix_credentials') || '{}')
                    baseUrl = storedCredentials.homeserver || 'https://chat.clic2go.ug'
                  }
                  console.log('CallContext: Outgoing call base URL for avatar generation:', baseUrl)
                  
                  if (baseUrl && typeof baseUrl === 'string' && baseUrl !== 'undefined' && !baseUrl.includes('undefined')) {
                  const generatedAvatar = client.mxcUrlToHttp(avatarMxcUrl, 40, 40, "scale", true)
                  
                  // Validate the generated avatar URL doesn't contain undefined
                  if (generatedAvatar && !generatedAvatar.includes('undefined')) {
                    peerAvatar = generatedAvatar
                    console.log('CallContext: Generated valid outgoing call avatar URL:', peerAvatar)
                  } else {
                    console.warn('CallContext: Generated outgoing call avatar URL contains undefined:', generatedAvatar)
                  }
                } else {
                  console.warn('CallContext: Invalid base URL for outgoing call avatar generation:', baseUrl)
                }
              } else {
                console.log('CallContext: Invalid outgoing call avatar MXC URL:', avatarMxcUrl)
              }
            } catch (error) {
              console.warn('CallContext: Failed to generate outgoing call avatar URL:', error)
            }
          }
        }
        
        // If we still don't have a target user, get the first invited member
        if (!targetUserId && room.getInvitedMembers) {
          const invitedMembers = room.getInvitedMembers()
          const invitedMember = invitedMembers.find((member: any) => member.userId !== currentUserId)
          if (invitedMember) {
            targetUserId = invitedMember.userId
            peerName = invitedMember.name || invitedMember.userId
            if (peerName.startsWith("@") && peerName.includes(":")) {
              peerName = peerName.split(":")[0].substring(1)
            }
          }
        }
      }

      // Generate a call ID for this session
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Generate a proper party_id using device ID or random string
      const deviceId = (client as any).getDeviceId?.() || `device_${Math.random().toString(36).substr(2, 9)}`
      const partyId = deviceId
      
      console.log('CallContext: Generated call ID for outgoing call:', callId)
      console.log('CallContext: Using party_id:', partyId)
      console.log('CallContext: Calling user:', targetUserId)

      console.log('CallContext: 🚀 Starting Matrix VoIP call with immediate SDP generation')
      
      // CRITICAL FIX: Generate SDP offer immediately and send Matrix invite
      try {
        // Set call state ONCE with the call ID
        setCallState({
          isCallActive: true,
          isIncoming: false,
          roomId,
          peerId: targetUserId || null,
          peerName,
          peerAvatar,
          callId: callId,
          callStartTime: null,
          callDuration: 0,
          connectionState: 'calling',
          callEndedReason: undefined,
        })
        
        // Create WebRTC offer IMMEDIATELY (Element expects this)
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        })
        
        // Get user media and add tracks
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
        
        // Create offer immediately
        const offer = await peerConnection.createOffer({ offerToReceiveAudio: true })
        await peerConnection.setLocalDescription(offer)
        
        console.log('CallContext: ✅ Created immediate SDP offer for Element compatibility')
        
        // Send Matrix invite with REAL SDP immediately
        const invitePayload = {
          call_id: callId,
          party_id: partyId,
          version: 1,
          offer: {
            type: offer.type,
            sdp: offer.sdp
          },
          lifetime: 60000, // Reduced to 60 seconds (Element standard)
          invitee: targetUserId,
        }
        
        console.log('CallContext: 📤 Sending m.call.invite immediately with real SDP')
        
        await client.sendEvent(roomId, "m.call.invite", invitePayload)
        
        console.log('CallContext: ✅ Successfully sent Matrix invite - Element should ring!')
        
        // Store peer connection for later use
        window.dispatchEvent(new CustomEvent('matrix-call-peer-connection', {
          detail: { callId, peerConnection, localStream: stream }
        }))
        
      } catch (sdpError) {
        console.error('CallContext: ❌ Failed to create immediate SDP offer:', sdpError)
        
        // Fallback to simple invite without offer (will fail but shows intent)
        const fallbackPayload = {
          call_id: callId,
          party_id: partyId,
          version: 1,
          lifetime: 60000,
          invitee: targetUserId,
        }
        
        try {
          await client.sendEvent(roomId, "m.call.invite", fallbackPayload)
          console.log('CallContext: ⚠️ Sent fallback invite without SDP')
        } catch (fallbackError) {
          console.error('CallContext: ❌ Even fallback invite failed:', fallbackError)
          throw fallbackError
        }
      }
      
      // Start timeout for outgoing call (60 seconds)
      startCallTimeout(60000)

      // Defer toast to avoid render conflicts
      setTimeout(() => {
        toast({
          title: "Call initiated",
          description: `Calling ${peerName}...`,
        })
      }, 0)
      
      console.log('CallContext: Waiting for call to be answered...')

    } catch (error) {
      console.error("Error starting call:", error)
      // Defer toast to avoid render conflicts
      setTimeout(() => {
        toast({
          title: "Call failed",
          description: error instanceof Error ? error.message : "Could not start the call",
          variant: "destructive",
        })
      }, 0)
    }
  }, [client, toast])

  // Answer an incoming call - simplified to just update state, WebRTC handles SDP
  const answerCall = useCallback(() => {
    console.log('CallContext: answerCall called')
    console.log('CallContext: Current call state:', callState)
    
    if (!callState.isCallActive || !callState.isIncoming) {
      console.log('CallContext: Cannot answer call - not active or not incoming')
      return
    }

    console.log('CallContext: Answering call - letting VoiceCall component handle SDP negotiation')
    
    // Clear timeout and start duration tracking
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
    
    // Update call state to not incoming but let WebRTC control connection state
    setCallState(prev => {
      console.log('CallContext: Updating call state - call answered')
      return {
        ...prev,
        isIncoming: false,
        connectionState: 'connecting', // Let WebRTC layer control when it becomes 'connected'
      }
    })
    
    // Start duration tracking
    startDurationTracking()
    
    console.log('CallContext: ✅ Call state updated, VoiceCall component will handle Matrix signaling')
  }, [callState])

  // End the current call
  const endCall = useCallback((reason?: string) => {
    console.log('CallContext: endCall called with reason:', reason)
    console.log('CallContext: Current call state:', callState)
    
    if (!callState.isCallActive) {
      console.log('CallContext: No active call to end')
      return
    }

    // Send proper Matrix hangup event (skip for demo calls)
    if (client && callState.roomId && callState.roomId !== "demo-room-id") {
      console.log('CallContext: Sending hangup event for call_id:', callState.callId)
      
      // Try to send proper Matrix call hangup event
      if (callState.callId) {
        // Generate a proper party_id for the hangup
        const deviceId = (client as any).getDeviceId?.() || `device_${Math.random().toString(36).substr(2, 9)}`
        const partyId = deviceId
        
        client.sendEvent(callState.roomId, "m.call.hangup", {
          call_id: callState.callId,
          party_id: partyId, // Element expects this for proper call termination
          version: 1,
        }).then(() => {
          console.log('CallContext: Sent m.call.hangup event successfully with party_id:', partyId)
        }).catch((error) => {
          console.warn('CallContext: Failed to send m.call.hangup event:', error)
          
          // Fallback: send custom room message
          client.sendEvent(callState.roomId!, "m.room.message", {
            msgtype: "m.notice",
            body: "📞 Call ended",
            call_event: {
              type: "call.hangup",
              call_id: callState.callId,
              timestamp: Date.now(),
            },
          }).catch(console.error)
        })
      } else {
        // Send custom room message as fallback if no call ID
        client.sendEvent(callState.roomId, "m.room.message", {
          msgtype: "m.notice",
          body: "📞 Call ended",
          call_event: {
            type: "call.hangup",
            timestamp: Date.now(),
          },
        }).catch(console.error)
      }
    }

    // Clean up and reset state
    cleanupCall(reason || 'manual')

    // Defer toast to avoid render conflicts
    setTimeout(() => {
      toast({
        title: "Call ended",
        description: callState.roomId === "demo-room-id" ? "Demo call terminated" : "The call has been terminated",
      })
    }, 0)
  }, [client, callState, toast, cleanupCall])

  // Simulate receiving an incoming call (for demo purposes)
  const simulateIncomingCall = useCallback((roomId: string, peerId: string, peerName: string) => {
    if (callState.isCallActive) {
      // Defer toast to avoid render conflicts
      setTimeout(() => {
        toast({
          title: "Call declined",
          description: "Already in a call",
          variant: "destructive",
        })
      }, 0)
      return
    }

    setCallState({
      isCallActive: true,
      isIncoming: true,
      roomId,
      peerId,
      peerName,
      peerAvatar: null,
      callId: `sim_call_${Date.now()}`,
      callStartTime: null,
      callDuration: 0,
      connectionState: 'ringing',
      callEndedReason: undefined,
    })

    // Defer toast to avoid render conflicts
    setTimeout(() => {
      toast({
        title: "Incoming call",
        description: `${peerName} is calling...`,
      })
    }, 0)
  }, [callState.isCallActive, toast])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall('unmount')
    }
  }, [cleanupCall])

  return (
    <CallContext.Provider value={{
      callState,
      startCall,
      answerCall,
      endCall,
      simulateIncomingCall,
      updateConnectionState,
    }}>
      {children}
    </CallContext.Provider>
  )
}
