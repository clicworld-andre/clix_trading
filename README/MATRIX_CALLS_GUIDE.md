# Matrix Call System - User Guide

## Overview

I've successfully implemented a comprehensive Matrix call system connected to the phone icon in the top navigation bar. This system allows users to make voice calls through the Matrix protocol integrated into the CLIX trading platform.

## Features

### 🔥 Main Features
- **Phone Icon Integration**: Click the phone icon in the top nav bar to access call functionality
- **Call Menu**: Dropdown menu showing contacts and recent calls
- **Voice Calls**: Full WebRTC-based voice calling with Matrix integration
- **Call Dialog**: Modern call interface with mute, speaker, and hang-up controls
- **Chat Room Integration**: Call buttons directly in chat room headers
- **Demo Mode**: Works with demo calls when no Matrix contacts are available

### 📱 Call Interface Components

#### 1. **Site Header Phone Icon** (`/components/site-header.tsx`)
- Located in the top navigation bar
- Shows active call indicator with green badge when in a call
- Opens call menu popover when clicked

#### 2. **Call Menu** (`/components/call-menu.tsx`)
- Lists available contacts from Matrix rooms
- Shows online status and last seen information
- Search functionality to find contacts
- Demo call option for testing
- Recent calls section (with mock data)

#### 3. **Call Dialog** (`/components/call-dialog.tsx`)
- Full-screen call interface
- Shows caller/recipient avatar and name
- Call controls: mute, hang up, speaker toggle
- Real-time call duration counter
- Accepts incoming calls

#### 4. **Voice Call Component** (`/components/voice-call.tsx`)
- WebRTC audio handling
- Microphone access and control
- Audio stream management
- Visual call status indicators
- Keyboard shortcuts (Ctrl+M to mute, Escape to hang up)

#### 5. **Matrix Call Hook** (`/hooks/use-matrix-calls.ts`)
- Centralized call state management
- Start, answer, and end call functions
- Integration with Matrix messaging
- Toast notifications for call events

## How to Use

### 🎯 Making a Call

1. **From Header**: Click the phone icon in the top navigation bar
2. **Search Contacts**: Use the search bar to find a contact
3. **Select Contact**: Click the call button next to any contact
4. **Demo Call**: Click "Demo Call" to test the functionality without a real contact

### 📞 From Chat Room

1. **Open Chat**: Navigate to any chat room
2. **Call Button**: Click the phone icon in the chat room header
3. **Direct Call**: Instantly starts a call with the other room participant

### 🎧 During a Call

- **Mute/Unmute**: Click the microphone button or press `Ctrl+M`
- **Speaker**: Toggle speaker on/off with the speaker button
- **End Call**: Click the red hang-up button or press `Escape`
- **Duration**: View real-time call duration

### 📲 Receiving Calls

- **Notification**: Toast notification appears for incoming calls
- **Call Dialog**: Full-screen interface with accept/decline options
- **Accept**: Green phone button to answer
- **Decline**: Red hang-up button to decline

## Technical Implementation

### Architecture
```
SiteHeader (Phone Icon)
    ↓
CallMenu (Contact List)
    ↓
useMatrixCalls (State Management)
    ↓
CallDialog (Call Interface)
    ↓
VoiceCall (WebRTC Audio)
```

### Key Files Created/Modified

1. **`/hooks/use-matrix-calls.ts`** - Core call management logic
2. **`/components/call-menu.tsx`** - Call interface menu
3. **`/components/site-header.tsx`** - Updated with phone icon functionality
4. **`/components/chat-room.tsx`** - Added call button in chat headers
5. **`/components/voice-call.tsx`** - Enhanced with keyboard shortcuts

### Matrix Integration

- Sends Matrix events when calls start/end
- Integrates with existing Matrix client context
- Uses room member information for contact details
- Respects Matrix room permissions and user presence

### WebRTC Features

- **Audio Only**: Focused on voice calls for trading scenarios
- **STUN Servers**: Google and Twilio STUN servers for NAT traversal
- **Media Stream**: Proper audio stream management and cleanup
- **Error Handling**: Graceful handling of microphone permissions

## Demo Mode

The system includes a demo mode that works without actual Matrix contacts:

- **Demo Contacts**: Creates virtual contacts for testing
- **Demo Calls**: Simulates complete call experience
- **No Matrix Messages**: Demo calls don't send actual Matrix events
- **Full UI**: All interface elements work identically to real calls

## Keyboard Shortcuts

- **`Ctrl+M` / `Cmd+M`**: Toggle mute during calls
- **`Escape`**: End active call
- **`Enter`**: Answer incoming call (when call dialog is focused)

## Browser Support

- **Chrome/Edge**: Full WebRTC support
- **Firefox**: Full WebRTC support  
- **Safari**: WebRTC support with some limitations
- **Mobile**: Works on mobile browsers with microphone access

## Security & Privacy

- **Microphone Permissions**: Requests user permission before accessing microphone
- **Local Audio**: Local audio is automatically muted to prevent echo
- **Secure Streams**: All audio streams use secure WebRTC protocols
- **Matrix Encryption**: Integrates with Matrix's end-to-end encryption when available

## Testing the System

1. **Demo Call**: Use the "Demo Call" button to test without real contacts
2. **Multiple Browsers**: Open multiple browser tabs to test call simulation
3. **Microphone**: Ensure microphone permissions are granted
4. **Audio Output**: Test with headphones to avoid audio feedback

The Matrix call system is now fully integrated and ready for use! Users can click the phone icon in the header to start making voice calls through the Matrix protocol.