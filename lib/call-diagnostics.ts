// Matrix VoIP Call Diagnostics Tool
// This tool provides comprehensive debugging for Matrix VoIP calls

export interface CallEvent {
  timestamp: number
  type: 'outgoing_call_start' | 'incoming_call_received' | 'sdp_offer_created' | 'matrix_invite_sent' | 
        'matrix_answer_received' | 'matrix_candidates_sent' | 'matrix_candidates_received' | 
        'webrtc_connection_state' | 'ice_gathering_state' | 'ice_connection_state' |
        'call_answer_sent' | 'call_hangup' | 'error'
  callId: string
  details: any
  direction?: 'incoming' | 'outgoing'
}

class CallDiagnostics {
  private events: CallEvent[] = []
  private activeCallId: string | null = null

  startDiagnostics(callId: string) {
    this.activeCallId = callId
    this.events = []
    this.log('outgoing_call_start', { callId }, { callId })
  }

  log(type: CallEvent['type'], details: any, context?: { callId?: string, direction?: 'incoming' | 'outgoing' }) {
    const event: CallEvent = {
      timestamp: Date.now(),
      type,
      callId: context?.callId || this.activeCallId || 'unknown',
      details,
      direction: context?.direction
    }
    
    this.events.push(event)
    
    // Color-coded console logging
    const colors = {
      'outgoing_call_start': '🚀',
      'incoming_call_received': '📞',
      'sdp_offer_created': '📝',
      'matrix_invite_sent': '📤',
      'matrix_answer_received': '📥',
      'matrix_candidates_sent': '🧊➡️',
      'matrix_candidates_received': '🧊⬅️',
      'webrtc_connection_state': '🔗',
      'ice_gathering_state': '❄️',
      'ice_connection_state': '🧊',
      'call_answer_sent': '✅',
      'call_hangup': '📴',
      'error': '❌'
    }
    
    console.log(`${colors[type]} [${new Date(event.timestamp).toISOString()}] ${type.toUpperCase()}:`, details)
  }

  getCallTimeline(callId?: string): CallEvent[] {
    const targetCallId = callId || this.activeCallId
    if (!targetCallId) return this.events
    
    return this.events.filter(event => event.callId === targetCallId)
  }

  analyzeProblem(callId?: string): string[] {
    const timeline = this.getCallTimeline(callId)
    const issues: string[] = []

    // Check if call was started
    const callStart = timeline.find(e => e.type === 'outgoing_call_start' || e.type === 'incoming_call_received')
    if (!callStart) {
      issues.push("❌ No call initiation detected")
      return issues
    }

    // For outgoing calls
    if (callStart.type === 'outgoing_call_start') {
      // Check if SDP offer was created
      const sdpOffer = timeline.find(e => e.type === 'sdp_offer_created')
      if (!sdpOffer) {
        issues.push("❌ No SDP offer created - WebRTC initialization failed")
      } else {
        // Check if Matrix invite was sent
        const inviteSent = timeline.find(e => e.type === 'matrix_invite_sent')
        if (!inviteSent) {
          issues.push("❌ Matrix invite not sent despite SDP offer being created")
        } else {
          // Check if answer was received
          const answerReceived = timeline.find(e => e.type === 'matrix_answer_received')
          if (!answerReceived) {
            issues.push("⚠️ No answer received from remote client - call may have been rejected or ignored")
          } else {
            // Check ICE candidate flow
            const candidatesSent = timeline.filter(e => e.type === 'matrix_candidates_sent')
            const candidatesReceived = timeline.filter(e => e.type === 'matrix_candidates_received')
            
            if (candidatesSent.length === 0) {
              issues.push("❌ No ICE candidates sent - local ICE gathering failed")
            }
            if (candidatesReceived.length === 0) {
              issues.push("❌ No ICE candidates received - remote ICE gathering failed or not sent")
            }
            
            // Check WebRTC connection states
            const connectionStates = timeline.filter(e => e.type === 'webrtc_connection_state')
            const iceConnectionStates = timeline.filter(e => e.type === 'ice_connection_state')
            
            const lastConnectionState = connectionStates[connectionStates.length - 1]
            const lastIceState = iceConnectionStates[iceConnectionStates.length - 1]
            
            if (lastConnectionState?.details?.state === 'failed') {
              issues.push("❌ WebRTC connection failed")
            }
            if (lastIceState?.details?.state === 'failed') {
              issues.push("❌ ICE connection failed - network connectivity issues")
            }
            if (lastConnectionState?.details?.state === 'connecting' && 
                Date.now() - lastConnectionState.timestamp > 30000) {
              issues.push("⚠️ WebRTC connection stuck in 'connecting' state for >30s")
            }
          }
        }
      }
    }

    // For incoming calls
    if (callStart.type === 'incoming_call_received') {
      const answerSent = timeline.find(e => e.type === 'call_answer_sent')
      if (!answerSent) {
        issues.push("⚠️ Call not answered yet")
      }
    }

    // Check for any errors
    const errors = timeline.filter(e => e.type === 'error')
    errors.forEach(error => {
      issues.push(`❌ Error: ${error.details.message || 'Unknown error'}`)
    })

    if (issues.length === 0) {
      issues.push("✅ No obvious issues detected in call flow")
    }

    return issues
  }

  generateReport(callId?: string): string {
    const timeline = this.getCallTimeline(callId)
    const issues = this.analyzeProblem(callId)
    
    let report = "=== Matrix VoIP Call Diagnostic Report ===\n\n"
    
    if (timeline.length === 0) {
      report += "No call events recorded.\n"
      return report
    }

    const targetCallId = callId || this.activeCallId || timeline[0]?.callId
    report += `Call ID: ${targetCallId}\n`
    report += `Events Recorded: ${timeline.length}\n`
    report += `Duration: ${timeline.length > 0 ? (timeline[timeline.length - 1].timestamp - timeline[0].timestamp) / 1000 : 0}s\n\n`

    report += "=== Issues Analysis ===\n"
    issues.forEach(issue => {
      report += issue + "\n"
    })

    report += "\n=== Event Timeline ===\n"
    timeline.forEach(event => {
      const time = new Date(event.timestamp).toLocaleTimeString()
      const details = typeof event.details === 'object' ? JSON.stringify(event.details, null, 2) : event.details
      report += `[${time}] ${event.type.toUpperCase()}: ${details}\n`
    })

    return report
  }

  clear() {
    this.events = []
    this.activeCallId = null
  }

  exportDiagnostics(): { events: CallEvent[], timestamp: number } {
    return {
      events: [...this.events],
      timestamp: Date.now()
    }
  }
}

// Global singleton instance
export const callDiagnostics = new CallDiagnostics()

// Helper function to log Matrix specification compliance
export function checkMatrixSpecCompliance(invitePayload: any): string[] {
  const issues: string[] = []
  
  // Required fields according to Matrix spec
  if (!invitePayload.call_id) issues.push("Missing call_id")
  if (!invitePayload.party_id) issues.push("Missing party_id") 
  if (!invitePayload.version) issues.push("Missing version")
  if (!invitePayload.offer) issues.push("Missing offer")
  if (!invitePayload.lifetime) issues.push("Missing lifetime")
  
  // Check lifetime is reasonable (Matrix spec recommends minimum 90s)
  if (invitePayload.lifetime < 90000) {
    issues.push(`Lifetime too short: ${invitePayload.lifetime}ms (recommend >= 90000ms)`)
  }
  
  // Check SDP offer structure
  if (invitePayload.offer) {
    if (!invitePayload.offer.type) issues.push("Missing offer.type")
    if (!invitePayload.offer.sdp) issues.push("Missing offer.sdp")
    if (invitePayload.offer.type !== "offer") issues.push(`Wrong offer type: ${invitePayload.offer.type} (should be "offer")`)
  }
  
  // Check version is supported
  if (invitePayload.version !== 1) {
    issues.push(`Unsupported version: ${invitePayload.version} (should be 1)`)
  }
  
  return issues
}
