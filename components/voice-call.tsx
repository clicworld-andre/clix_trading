"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { useMatrixCalls } from "@/lib/call-context"
import { callDiagnostics } from "@/lib/call-diagnostics"
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react"

interface VoiceCallProps {
  roomId: string
  peerId?: string
  peerName?: string
  peerAvatar?: string
  isIncoming?: boolean
  onEndCall: () => void
}

export default function VoiceCall({
  roomId,
  peerId,
  peerName,
  peerAvatar,
  isIncoming = false,
  onEndCall,
}: VoiceCallProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { client } = useMatrixClient()
  const { toast } = useToast()
  const { answerCall, endCall, callState: contextCallState, updateConnectionState } = useMatrixCalls()
  
  // ICE candidate batching to avoid rate limiting
  const pendingIceCandidates = useRef<any[]>([])
  const iceCandidateTimer = useRef<NodeJS.Timeout | null>(null)
  
  // SDP deferred handling to manage signaling states
  const deferredRemoteSdp = useRef<RTCSessionDescriptionInit | null>(null)
  
  // Track negotiation state to prevent race conditions
  const isNegotiating = useRef<boolean>(false)
  const hasPendingOffer = useRef<boolean>(false)
  
  // Use call state from context instead of local state
  const callStatus = contextCallState.connectionState === 'ringing' ? 'ringing' : 
                   contextCallState.connectionState === 'connected' ? 'connected' :
                   contextCallState.connectionState === 'calling' ? 'connecting' :
                   contextCallState.connectionState === 'ended' ? 'ended' : 'connecting'
  
  const callDuration = contextCallState.callDuration

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (callStatus !== "connected") return
      
      switch (event.key.toLowerCase()) {
        case 'm':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            toggleMute()
          }
          break
        case 'escape':
          event.preventDefault()
          handleEndCall()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [callStatus])

  // Listen for Matrix signaling events
  useEffect(() => {
    // Listen for ICE candidates from Matrix
    const handleMatrixIceCandidates = (event: CustomEvent) => {
      console.log('VoiceCall: Received Matrix ICE candidates:', event.detail)
      const { callId, candidates } = event.detail
      
      // Only process if this is for our current call
      if (callId === contextCallState.callId && peerConnectionRef.current) {
        console.log('VoiceCall: Adding remote ICE candidates:', candidates.length)
        candidates.forEach(async (candidate: any) => {
          try {
            if (candidate.candidate) {
              await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
              console.log('VoiceCall: Successfully added ICE candidate:', candidate.candidate)
            }
          } catch (error) {
            console.warn('VoiceCall: Failed to add ICE candidate:', error, candidate)
          }
        })
      }
    }

    // Function to try setting deferred remote SDP
    const trySetDeferredRemoteSdp = () => {
      if (deferredRemoteSdp.current && peerConnectionRef.current) {
        const currentState = peerConnectionRef.current.signalingState
        console.log('VoiceCall: Trying to set deferred remote SDP, current state:', currentState)
        
        if (currentState === 'have-local-offer') {
          console.log('VoiceCall: Setting deferred remote description')
          const sdpToSet = deferredRemoteSdp.current
          deferredRemoteSdp.current = null // Clear deferred SDP
          
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdpToSet))
            .then(() => {
              console.log('VoiceCall: Successfully set deferred remote description')
              updateConnectionState('connecting')
            })
            .catch((error) => {
              console.error('VoiceCall: Failed to set deferred remote description:', error)
            })
        }
      }
    }

    // Simplified remote answer handler - expects local offer to already exist
    const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit) => {
      if (!peerConnectionRef.current) {
        console.error('VoiceCall: No peer connection available for answer')
        return
      }

      const pc = peerConnectionRef.current
      console.log('VoiceCall: Processing remote answer, current signaling state:', pc.signalingState)
      
      try {
        // We should already be in 'have-local-offer' state from initialization
        if (pc.signalingState === 'have-local-offer') {
          console.log('VoiceCall: Setting remote answer (local offer already exists)')
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
          console.log('VoiceCall: ✅ Successfully set remote answer, new state:', pc.signalingState)
          hasPendingOffer.current = false
          isNegotiating.current = false
          updateConnectionState('connecting')
        } else if (pc.signalingState === 'stable') {
          console.warn('VoiceCall: ⚠️ Peer connection in stable state - deferring answer until local offer is created')
          // Store for retry when we become ready
          deferredRemoteSdp.current = answer
          isNegotiating.current = false
        } else {
          console.error('VoiceCall: ❌ Wrong signaling state for setting remote answer:', pc.signalingState)
          console.error('VoiceCall: Expected "have-local-offer", got:', pc.signalingState)
          // Store for retry
          deferredRemoteSdp.current = answer
          isNegotiating.current = false
        }
      } catch (error) {
        console.error('VoiceCall: ❌ Failed to handle remote answer:', error)
        isNegotiating.current = false
        hasPendingOffer.current = false
      }
    }

    // Listen for SDP answer from Matrix
    const handleMatrixAnswer = (event: CustomEvent) => {
      console.log('VoiceCall: Received Matrix SDP answer:', event.detail)
      const { callId, answer } = event.detail
      
      // Only process if this is for our current call
      if (callId === contextCallState.callId && peerConnectionRef.current) {
        // Prevent concurrent negotiations
        if (isNegotiating.current) {
          console.log('VoiceCall: Already negotiating, deferring answer')
          deferredRemoteSdp.current = answer
          return
        }
        
        isNegotiating.current = true
        handleRemoteAnswer(answer)
      }
    }

    // Listen for SDP offer from Matrix (for incoming calls)
    const handleMatrixOffer = (event: CustomEvent) => {
      console.log('VoiceCall: Received Matrix SDP offer:', event.detail)
      const { callId, offer } = event.detail
      
      // Only process if this is for our current call and we're answering
      if (callId === contextCallState.callId && peerConnectionRef.current && contextCallState.isIncoming) {
        console.log('VoiceCall: Setting remote description from offer (incoming call)')
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
          .then(async () => {
            console.log('VoiceCall: Set remote offer, creating answer')
            
            // Create and set local answer
            const answer = await peerConnectionRef.current!.createAnswer()
            await peerConnectionRef.current!.setLocalDescription(answer)
            
            console.log('VoiceCall: Created local answer, now sending it back to Element via Matrix')
            
            // CRITICAL FIX: Send the local answer back to Element via Matrix signaling
            if (client && contextCallState.roomId) {
              const deviceId = (client as any).getDeviceId?.() || `device_${Math.random().toString(36).substr(2, 9)}`
              
              await client.sendEvent(contextCallState.roomId, "m.call.answer", {
                call_id: callId,
                party_id: deviceId,
                version: 1,
                answer: {
                  type: "answer",
                  sdp: answer.sdp
                }
              })
              
              console.log('VoiceCall: ✅ Successfully sent local answer back to Element')
              console.log('VoiceCall: Element should now complete WebRTC negotiation')
            } else {
              console.error('VoiceCall: ❌ Cannot send answer - client or roomId missing')
            }
          })
          .catch((error) => {
            console.error('VoiceCall: Failed to handle incoming call offer:', error)
          })
      }
    }

    window.addEventListener('matrix-ice-candidates', handleMatrixIceCandidates as EventListener)
    window.addEventListener('matrix-answer', handleMatrixAnswer as EventListener)
    window.addEventListener('matrix-offer', handleMatrixOffer as EventListener)
    
    return () => {
      window.removeEventListener('matrix-ice-candidates', handleMatrixIceCandidates as EventListener)
      window.removeEventListener('matrix-answer', handleMatrixAnswer as EventListener)
      window.removeEventListener('matrix-offer', handleMatrixOffer as EventListener)
    }
  }, [contextCallState.callId, contextCallState.isIncoming])

  // Listen for peer connection from immediate Matrix SDP approach
  useEffect(() => {
    const handlePeerConnection = (event: CustomEvent) => {
      const { callId, peerConnection, localStream } = event.detail
      
      // Only handle if this is for our current call
      if (callId === contextCallState.callId) {
        console.log('VoiceCall: Received peer connection from Matrix layer')
        
        // Set up the existing peer connection
        peerConnectionRef.current = peerConnection
        setLocalStream(localStream)
        
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = localStream
          localAudioRef.current.muted = true
        }
        
        // Set up event handlers on the existing peer connection
        setupPeerConnectionHandlers(peerConnection)
      }
    }
    
    // Listen for peer connection from Matrix call context
    window.addEventListener('matrix-call-peer-connection', handlePeerConnection as EventListener)
    
    return () => {
      window.removeEventListener('matrix-call-peer-connection', handlePeerConnection as EventListener)
    }
  }, [contextCallState.callId])
  
  // Setup peer connection handlers
  const setupPeerConnectionHandlers = (peerConnection: RTCPeerConnection) => {
    console.log('VoiceCall: Setting up peer connection handlers')
    
    // Handle incoming tracks (remote audio)
    peerConnection.ontrack = (event) => {
      console.log('VoiceCall: Received remote stream')
      const remoteStream = event.streams[0]
      setRemoteStream(remoteStream)
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.muted = false
        
        // Auto-play remote audio with fallback
        remoteAudioRef.current.play().catch(error => {
          console.warn('VoiceCall: Auto-play failed for remote audio:', error)
        })
      }
      
      console.log('VoiceCall: Remote audio stream setup complete')
    }

    // Add event listeners for connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log('VoiceCall: Connection state:', peerConnection.connectionState)
      
      if (peerConnection.connectionState === 'connected') {
        updateConnectionState('connected')
        console.log('VoiceCall: WebRTC connection established')
      } else if (peerConnection.connectionState === 'failed') {
        console.warn('VoiceCall: Connection failed')
        updateConnectionState('failed')
      } else if (peerConnection.connectionState === 'connecting') {
        updateConnectionState('connecting')
      }
    }
    
    peerConnection.onicegatheringstatechange = () => {
      console.log('VoiceCall: ICE gathering state:', peerConnection.iceGatheringState)
    }
    
    peerConnection.oniceconnectionstatechange = () => {
      console.log('VoiceCall: ICE connection state:', peerConnection.iceConnectionState)
    }
    
    // Handle ICE candidates - batch them to avoid rate limiting
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('VoiceCall: New ICE candidate:', event.candidate)
        
        // Add candidate to pending batch
        pendingIceCandidates.current.push({
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        })
        
        // Clear existing timer
        if (iceCandidateTimer.current) {
          clearTimeout(iceCandidateTimer.current)
        }
        
        // Set new timer to send candidates after a short delay (batch them)
        iceCandidateTimer.current = setTimeout(() => {
          if (pendingIceCandidates.current.length > 0 && client && contextCallState.roomId && contextCallState.callId) {
            const deviceId = (client as any).getDeviceId?.() || `device_${Math.random().toString(36).substr(2, 9)}`
            const candidatesToSend = [...pendingIceCandidates.current]
            pendingIceCandidates.current = [] // Clear the batch
            
            console.log(`VoiceCall: Sending batch of ${candidatesToSend.length} ICE candidates`)
            
            client.sendEvent(contextCallState.roomId, "m.call.candidates", {
              call_id: contextCallState.callId,
              party_id: deviceId,
              version: 1,
              candidates: candidatesToSend
            }).then(() => {
              console.log(`VoiceCall: Successfully sent batch of ${candidatesToSend.length} ICE candidates`)
            }).catch((error) => {
              console.warn('VoiceCall: Failed to send ICE candidate batch:', error)
            })
          }
        }, 500) // Wait 500ms to batch multiple candidates
      }
    }
  }
  
  // Initialize WebRTC for incoming calls only
  useEffect(() => {
    const initializeCall = async () => {
      // Only initialize for incoming calls - outgoing calls are handled by Matrix context
      if (!contextCallState.isIncoming || !contextCallState.isCallActive) {
        console.log('VoiceCall: Skipping WebRTC initialization - not an incoming call')
        return
      }
      
      try {
        console.log('VoiceCall: Initializing WebRTC for incoming call')
        
        // Get local audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)

        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream
          localAudioRef.current.muted = true
        }

        // Create peer connection for incoming calls
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        })
        
        console.log('VoiceCall: Created peer connection for incoming call')

        // Add local stream to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream)
        })
        
        // Set up handlers
        setupPeerConnectionHandlers(peerConnection)
        
        peerConnectionRef.current = peerConnection
        
        console.log('VoiceCall: WebRTC initialized for incoming call')
        
      } catch (error) {
        console.error("Error initializing incoming call:", error)
        toast({
          title: "Call failed",
          description: "Could not access microphone",
          variant: "destructive",
        })
        handleEndCall()
      }
    }

    initializeCall()

    // Cleanup function
    return () => {
      cleanupCall()
    }
  }, [isIncoming, peerName, toast])

  // Duration tracking is now handled by the call context

  const acceptCall = (event?: React.MouseEvent) => {
    console.log('=== GREEN ANSWER BUTTON CLICKED ===');
    
    // Prevent any event bubbling that might trigger SDK handlers
    if (event) {
      event.preventDefault()
      event.stopPropagation()
      // React's SyntheticEvent doesn't have stopImmediatePropagation, use nativeEvent
      if (event.nativeEvent && typeof event.nativeEvent.stopImmediatePropagation === 'function') {
        event.nativeEvent.stopImmediatePropagation()
      }
      console.log('VoiceCall: Prevented event propagation')
    }
    
    console.log('VoiceCall: acceptCall clicked - THIS IS THE GREEN BUTTON')
    console.log('VoiceCall: Current contextCallState:', contextCallState)
    console.log('VoiceCall: About to call answerCall function from context')
    console.log('VoiceCall: Call ID that will be used:', contextCallState.callId)
    console.log('VoiceCall: Room ID that will be used:', contextCallState.roomId)
    
    // Call the Matrix answerCall function to send the answer event
    answerCall()
    
    console.log('VoiceCall: answerCall() completed')
    console.log('=== ANSWER BUTTON PROCESSING COMPLETE ===');
    
    // Update connection state to connecting
    updateConnectionState('connecting')

    toast({
      title: "Call accepted",
      description: `You are now in a call with ${peerName || "the other participant"}`,
    })
    
    console.log('VoiceCall: Call accepted, waiting for WebRTC connection')
  }

  const handleEndCall = () => {
    console.log('VoiceCall: handleEndCall called')

    // Call the Matrix context's endCall function to send proper Matrix events
    endCall('user_hangup')

    // Clean up local resources
    cleanupCall()
    
    // Notify parent component
    onEndCall()
  }

  const cleanupCall = () => {
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    
    // Clear ICE candidate timer
    if (iceCandidateTimer.current) {
      clearTimeout(iceCandidateTimer.current)
      iceCandidateTimer.current = null
    }
    
    // Clear any pending ICE candidates and deferred SDP
    pendingIceCandidates.current = []
    deferredRemoteSdp.current = null

    // Stop and release local media stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }

  const toggleMute = () => {
    if (localStream) {
      // Actually mute/unmute the audio tracks
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)

      // Show toast notification
      toast({
        title: isMuted ? "Microphone unmuted" : "Microphone muted",
        description: isMuted ? "Others can now hear you" : "Others cannot hear you",
      })
    }
  }

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn
      setIsSpeakerOn(!isSpeakerOn)

      // Show toast notification
      toast({
        title: isSpeakerOn ? "Speaker off" : "Speaker on",
        description: isSpeakerOn ? "You cannot hear others" : "You can now hear others",
      })
    }
  }

  // Format call duration as MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} muted autoPlay />
      <audio ref={remoteAudioRef} autoPlay />

      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Avatar */}
            <Avatar className="h-24 w-24">
              <AvatarImage src={peerAvatar || ""} alt={peerName || "Caller"} />
              <AvatarFallback className="text-2xl">{peerName ? getInitials(peerName) : "?"}</AvatarFallback>
            </Avatar>

            {/* Caller info */}
            <div className="text-center">
              <h3 className="text-xl font-semibold">{peerName || peerId || "Unknown Caller"}</h3>
              <p className="text-muted-foreground">
                {callStatus === "connecting" && "Connecting..."}
                {callStatus === "ringing" && "Incoming call..."}
                {callStatus === "connected" && formatDuration(callDuration)}
                {callStatus === "ended" && "Call ended"}
              </p>
            </div>

            {/* Call status animation */}
            {callStatus === "connecting" || callStatus === "ringing" ? (
              <div className="flex justify-center my-4">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-primary/20 animate-ping"></div>
                  <div className="relative rounded-full bg-primary p-4">
                    <Phone className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Call controls */}
            <div className="flex justify-center space-x-4 mt-6">
              {callStatus === "ringing" && isIncoming ? (
                <>
                  <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleEndCall}>
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600"
                    onClick={acceptCall}
                  >
                    <Phone className="h-6 w-6" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={isMuted ? "default" : "outline"}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={toggleMute}
                    disabled={callStatus !== "connected"}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>

                  <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleEndCall}>
                    <PhoneOff className="h-6 w-6" />
                  </Button>

                  <Button
                    variant={isSpeakerOn ? "outline" : "default"}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={toggleSpeaker}
                    disabled={callStatus !== "connected"}
                  >
                    {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
