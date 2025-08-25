# CLIX Trading System - Enhanced Call Function Test Plan

## 🎯 Overview
This test plan covers all enhanced Matrix voice call functionality implemented in the CLIX Trading System, including call state management, timeouts, duration tracking, WebRTC integration, and call history.

## 🔧 Prerequisites
- CLIX Trading System running on `http://localhost:3000`
- Two Matrix accounts (for testing between users)
- Modern browser with microphone access
- Developer tools open for monitoring console logs

## 📋 Test Categories

### 1. **Call State Management Tests**

#### Test 1.1: Outgoing Call Flow
**Objective**: Test complete outgoing call lifecycle

**Steps**:
1. Log into CLIX Trading System
2. Open a chat room with another user
3. Click the phone icon to initiate call
4. Observe call state transitions

**Expected Results**:
- Call state: `idle` → `calling` → `connected` (if answered) or `ended` (if timeout/hangup)
- Toast notification: "Call initiated"
- Call dialog appears with "Calling..." status
- Phone animation displays during ringing
- Call timeout after 60 seconds if unanswered

**Console Logs to Monitor**:
```
CallContext: startCall called with roomId: [room_id]
CallContext: Generated call ID for outgoing call: [call_id]
CallContext: Sent m.call.invite event successfully
CallContext: Waiting for call to be answered...
```

#### Test 1.2: Incoming Call Flow
**Objective**: Test incoming call detection and handling

**Steps**:
1. Have another user initiate a call to you
2. Observe incoming call UI
3. Test both answer and decline scenarios

**Expected Results**:
- Toast notification: "Incoming call from [user]"
- Call dialog with green answer and red decline buttons
- Call state: `idle` → `ringing` → `connected` (if answered) or `ended` (if declined)
- Automatic timeout after 30 seconds if not answered

**Console Logs to Monitor**:
```
CallContext: m.call.invite event received
CallContext: Processing incoming call from: [sender]
CallContext: Setting incoming call state
```

#### Test 1.3: Call Answer Functionality
**Objective**: Test call answering mechanics

**Steps**:
1. Receive incoming call
2. Click green answer button
3. Verify call connection and duration tracking

**Expected Results**:
- Call connects successfully
- Toast: "Call accepted"
- Duration counter starts (00:00, 00:01, 00:02...)
- Microphone and speaker controls become active
- Call state changes to `connected`

### 2. **Call Timeout Tests**

#### Test 2.1: Outgoing Call Timeout
**Objective**: Test 60-second timeout for outgoing calls

**Steps**:
1. Initiate call to user who won't answer
2. Wait for 60 seconds without interaction
3. Observe automatic call termination

**Expected Results**:
- Call automatically ends after 60 seconds
- Toast notification: "Call timeout - Call was not answered in time"
- Call state returns to `idle`
- Call dialog closes

#### Test 2.2: Incoming Call Timeout
**Objective**: Test 30-second timeout for incoming calls

**Steps**:
1. Have another user call you
2. Don't answer for 30 seconds
3. Observe automatic call termination

**Expected Results**:
- Call automatically ends after 30 seconds
- Toast notification: "Call timeout"
- Call dialog closes
- Call recorded as "missed" in history

### 3. **Duration Tracking Tests**

#### Test 3.1: Real-time Duration Display
**Objective**: Test live duration counter accuracy

**Steps**:
1. Establish connected call
2. Monitor duration display for 2-3 minutes
3. Verify accurate time progression

**Expected Results**:
- Duration displays as MM:SS format (00:00, 00:01, etc.)
- Counter updates every second
- Time remains accurate throughout call

#### Test 3.2: Duration in Call History
**Objective**: Test duration recording in call history

**Steps**:
1. Complete a call of known duration (e.g., 2 minutes)
2. End the call
3. Check call history for accurate duration

**Expected Results**:
- Call history shows correct duration
- Duration matches actual call time
- History persists after page refresh

### 4. **WebRTC Integration Tests**

#### Test 4.1: Audio Stream Initialization
**Objective**: Test microphone access and audio setup

**Steps**:
1. Initiate a call
2. Check browser permissions for microphone
3. Monitor console for WebRTC setup logs

**Expected Results**:
- Browser requests microphone permission
- Local audio stream initializes successfully
- Console shows: "WebRTC peer connection initialized"

**Console Logs to Monitor**:
```
VoiceCall: Created peer connection with configuration
VoiceCall: WebRTC peer connection initialized for production call
```

#### Test 4.2: ICE Candidate Handling
**Objective**: Test ICE candidate generation and handling

**Steps**:
1. Establish call connection
2. Monitor console for ICE candidate logs
3. Check connection state changes

**Expected Results**:
- ICE candidates are generated and logged
- Connection states progress properly
- No critical ICE errors (warnings are acceptable)

**Console Logs to Monitor**:
```
VoiceCall: New ICE candidate: [candidate_info]
VoiceCall: ICE gathering state: [state]
VoiceCall: Connection state: [state]
```

#### Test 4.3: Audio Controls
**Objective**: Test mute/unmute and speaker controls

**Steps**:
1. During active call, test mute button
2. Test speaker on/off button
3. Verify visual feedback and functionality

**Expected Results**:
- Mute button toggles microphone (visual indicator changes)
- Speaker button controls audio output
- Toast notifications for each action
- Controls disabled during non-connected states

### 5. **Call History Tests**

#### Test 5.1: Automatic Call Recording
**Objective**: Test automatic saving of call records

**Steps**:
1. Complete various types of calls (answered, missed, failed)
2. Check localStorage for call history
3. Verify all calls are recorded

**Expected Results**:
- All calls saved to localStorage under 'call-history' key
- Records include: ID, type, participants, timestamps, duration, status
- Maximum 100 records maintained

**Console Logs to Monitor**:
```
CallContext: Saved call to history: [call_record]
```

#### Test 5.2: Call Status Classification
**Objective**: Test proper call status assignment

**Steps**:
1. Complete call normally (should be 'completed')
2. Let call timeout (should be 'missed')
3. Have connection fail (should be 'failed')
4. Check history status for each

**Expected Results**:
- Normal hangup → status: 'completed'
- Timeout → status: 'missed' 
- Connection failure → status: 'failed'
- Proper end reasons stored in metadata

#### Test 5.3: History Persistence
**Objective**: Test call history persistence across sessions

**Steps**:
1. Make several calls
2. Refresh the page
3. Check if history is maintained
4. Clear localStorage and verify cleanup

**Expected Results**:
- History persists after page refresh
- Records maintained until localStorage cleared
- No duplicate entries

### 6. **Error Handling Tests**

#### Test 6.1: No Microphone Permission
**Objective**: Test behavior when microphone access denied

**Steps**:
1. Deny microphone permission in browser
2. Attempt to make a call
3. Observe error handling

**Expected Results**:
- Toast error: "Call failed - Could not access microphone"
- Call terminates gracefully
- No UI freezing or crashes

#### Test 6.2: Network Connection Issues
**Objective**: Test handling of network disruptions

**Steps**:
1. Start a call
2. Simulate network disruption (disable WiFi briefly)
3. Observe system behavior and recovery

**Expected Results**:
- Call continues in demo mode if WebRTC fails
- Appropriate error logging
- Graceful degradation of functionality

#### Test 6.3: Multiple Call Attempts
**Objective**: Test call busy state handling

**Steps**:
1. Establish active call
2. Attempt to start another call
3. Receive incoming call while in active call

**Expected Results**:
- Second outgoing call prevented
- Incoming call during active call shows "Already in a call"
- No interference with existing call

### 7. **Integration Tests**

#### Test 7.1: Matrix Event Synchronization
**Objective**: Test Matrix event handling between clients

**Steps**:
1. Use two different browsers/devices
2. Make calls between them
3. Verify events are properly sent and received

**Expected Results**:
- Call invite events properly transmitted
- Answer/hangup events synchronized
- Call states match on both clients

#### Test 7.2: UI State Consistency
**Objective**: Test UI updates match call state

**Steps**:
1. Monitor UI elements during call lifecycle
2. Verify all state transitions reflect in UI
3. Check button states and visibility

**Expected Results**:
- UI elements update correctly with state changes
- Button states match current call status
- No UI elements stuck in wrong state

## 🧪 Quick Test Scenarios

### Scenario A: Complete Call Flow (5 minutes)
1. Start call → Wait for answer → Talk for 1 minute → End call
2. Check: Duration tracking, history recording, proper cleanup

### Scenario B: Missed Call Flow (1 minute)
1. Have someone call you → Don't answer → Wait for timeout
2. Check: Timeout handling, missed call in history

### Scenario C: Failed Call Flow (2 minutes)
1. Call non-existent user or deny microphone permission
2. Check: Error handling, failed call in history

## 🔍 Debugging Tools

### Console Commands for Testing
```javascript
// Check call state
useMatrixCalls().callState

// Check call history
JSON.parse(localStorage.getItem('call-history') || '[]')

// Clear call history
localStorage.removeItem('call-history')

// Simulate incoming call (for testing)
useMatrixCalls().simulateIncomingCall('test-room', '@test:user.com', 'Test User')
```

### Key Console Log Filters
- `CallContext:` - All call context operations
- `VoiceCall:` - WebRTC and UI operations
- `m.call` - Matrix call events

## ✅ Success Criteria

### Must Pass:
- [ ] All call states transition correctly
- [ ] Timeouts work as specified (30s/60s)
- [ ] Duration tracking is accurate
- [ ] Call history records all calls
- [ ] WebRTC initializes without errors
- [ ] Audio controls function properly
- [ ] Error handling prevents crashes

### Should Pass:
- [ ] ICE candidates generate successfully
- [ ] Call quality is acceptable
- [ ] UI remains responsive during calls
- [ ] Multiple browser compatibility
- [ ] Network disruption handling

## 🚨 Critical Issues to Watch For

1. **Call State Stuck**: Call UI doesn't close after call ends
2. **Duration Drift**: Duration counter becomes inaccurate over time
3. **Memory Leaks**: WebRTC connections not properly cleaned up
4. **Event Loops**: Multiple event listeners causing duplicate calls
5. **Storage Bloat**: Call history growing indefinitely
6. **Permission Loops**: Repeated microphone permission requests

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Browser: ___________
OS: ___________

Call State Management: PASS/FAIL
Call Timeouts: PASS/FAIL
Duration Tracking: PASS/FAIL
WebRTC Integration: PASS/FAIL
Call History: PASS/FAIL
Error Handling: PASS/FAIL

Critical Issues Found:
- 
- 

Recommended Actions:
- 
- 
```

---

**Note**: Start with the Quick Test Scenarios to verify basic functionality, then proceed with comprehensive testing if initial tests pass.
