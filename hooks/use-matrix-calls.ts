"use client"

import { useState, useCallback } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { useToast } from "@/hooks/use-toast"

export interface CallState {
  isCallActive: boolean
  isIncoming: boolean
  roomId: string | null
  peerId: string | null
  peerName: string | null
  peerAvatar: string | null
}

export const useMatrixCalls = () => {
  const { client } = useMatrixClient()
  const { toast } = useToast()
  
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isIncoming: false,
    roomId: null,
    peerId: null,
    peerName: null,
    peerAvatar: null,
  })

  // Start a new call
  const startCall = useCallback(async (roomId: string, peerId?: string) => {
    console.log('useMatrixCalls: startCall called with roomId:', roomId, 'peerId:', peerId)
    console.log('useMatrixCalls: client available:', !!client)
    
    try {
      // Handle demo call scenario
      if (roomId === "demo-room-id") {
        setCallState({
          isCallActive: true,
          isIncoming: false,
          roomId,
          peerId: peerId || "@demo:matrix.clix.trading",
          peerName: "Demo User",
          peerAvatar: null,
        })

        toast({
          title: "Demo call initiated",
          description: "Starting demo call with Demo User...",
        })
        return
      }

      if (!client) {
        toast({
          title: "Error",
          description: "Matrix client not available",
          variant: "destructive",
        })
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
          
          // Get avatar
          if (otherMember.getAvatarUrl() && client.mxcUrlToHttp) {
            try {
              const avatarMxcUrl = otherMember.getAvatarUrl()
              if (avatarMxcUrl && avatarMxcUrl.startsWith('mxc://')) {
                // Check if client has proper baseUrl configured
                const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
                if (baseUrl && baseUrl !== 'undefined') {
                  peerAvatar = client.mxcUrlToHttp(avatarMxcUrl, 40, 40, "scale", true) || undefined
                } else {
                  console.warn('useMatrixCalls: No valid homeserver URL for avatar generation')
                }
              }
            } catch (error) {
              console.warn('useMatrixCalls: Failed to generate avatar URL:', error)
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

      // Send call initiation message to the room
      await client.sendEvent(roomId, "m.room.message", {
        msgtype: "m.notice",
        body: `📞 ${client.getUserId()?.split(':')[0]?.substring(1)} is calling...`,
        call_event: {
          type: "call.invite",
          call_id: callId,
          caller: client.getUserId(),
          callee: targetUserId,
          timestamp: Date.now(),
        }
      })

      // Set call state
      setCallState({
        isCallActive: true,
        isIncoming: false,
        roomId,
        peerId: targetUserId || null,
        peerName,
        peerAvatar: peerAvatar || null,
      })

      toast({
        title: "Call initiated",
        description: `Calling ${peerName}...`,
      })

      // Auto-simulate connection after 3 seconds for demo
      setTimeout(() => {
        if (callState.isCallActive && !callState.isIncoming) {
          // Simulate call being answered
          toast({
            title: "Call connected",
            description: `Connected to ${peerName}`,
          })
        }
      }, 3000)

    } catch (error) {
      console.error("Error starting call:", error)
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Could not start the call",
        variant: "destructive",
      })
    }
  }, [client, toast, callState.isCallActive, callState.isIncoming])

  // Answer an incoming call
  const answerCall = useCallback(() => {
    if (!callState.isCallActive || !callState.isIncoming) return

    setCallState(prev => ({
      ...prev,
      isIncoming: false,
    }))

    // Send call answer message to the room
    if (client && callState.roomId) {
      client.sendEvent(callState.roomId, "m.room.message", {
        msgtype: "m.notice",
        body: "📞 Call answered",
        call_event: {
          type: "call.answer",
          timestamp: Date.now(),
        },
      }).catch(console.error)
    }
  }, [client, callState])

  // End the current call
  const endCall = useCallback(() => {
    if (!callState.isCallActive) return

    // Send call end message to the room (skip for demo calls)
    if (client && callState.roomId && callState.roomId !== "demo-room-id") {
      client.sendEvent(callState.roomId, "m.room.message", {
        msgtype: "m.notice",
        body: "📞 Call ended",
        call_event: {
          type: "call.hangup",
          timestamp: Date.now(),
        },
      }).catch(console.error)
    }

    setCallState({
      isCallActive: false,
      isIncoming: false,
      roomId: null,
      peerId: null,
      peerName: null,
      peerAvatar: null,
    })

    toast({
      title: "Call ended",
      description: callState.roomId === "demo-room-id" ? "Demo call terminated" : "The call has been terminated",
    })
  }, [client, callState, toast])

  // Simulate receiving an incoming call (for demo purposes)
  const simulateIncomingCall = useCallback((roomId: string, peerId: string, peerName: string) => {
    if (callState.isCallActive) {
      toast({
        title: "Call declined",
        description: "Already in a call",
        variant: "destructive",
      })
      return
    }

    setCallState({
      isCallActive: true,
      isIncoming: true,
      roomId,
      peerId,
      peerName,
      peerAvatar: null,
    })

    toast({
      title: "Incoming call",
      description: `${peerName} is calling...`,
    })
  }, [callState.isCallActive, toast])

  return {
    callState,
    startCall,
    answerCall,
    endCall,
    simulateIncomingCall,
  }
}