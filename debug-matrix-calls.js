// Matrix Call Event Debugging Script
// Add this to your browser console to monitor Matrix call events

console.log('🔧 Matrix Call Debug Script Loaded');

// Monitor all Matrix events in the browser console
if (typeof window !== 'undefined') {
  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Enhanced logging for call-related events
  const logCallEvent = (level, message, ...args) => {
    if (typeof message === 'string' && 
        (message.includes('CallContext:') || 
         message.includes('m.call.') || 
         message.includes('VoiceCall:') ||
         message.includes('call_id') ||
         message.includes('party_id'))) {
      
      const timestamp = new Date().toISOString();
      const logPrefix = `[${timestamp}] 📞 CALL DEBUG:`;
      
      if (level === 'error') {
        originalError.call(console, logPrefix, message, ...args);
      } else if (level === 'warn') {
        originalWarn.call(console, logPrefix, message, ...args);
      } else {
        originalLog.call(console, logPrefix, message, ...args);
      }
    } else {
      // Regular logging for non-call events
      if (level === 'error') {
        originalError.call(console, message, ...args);
      } else if (level === 'warn') {
        originalWarn.call(console, message, ...args);
      } else {
        originalLog.call(console, message, ...args);
      }
    }
  };

  // Override console methods
  console.log = (...args) => logCallEvent('log', ...args);
  console.error = (...args) => logCallEvent('error', ...args);
  console.warn = (...args) => logCallEvent('warn', ...args);

  console.log('✅ Call event logging enhanced');
}

// Function to manually test call answer event
window.debugCallAnswer = (callId, roomId) => {
  console.log('🧪 MANUAL TEST: Simulating call answer event');
  
  const mockAnswerEvent = {
    call_id: callId || 'test_call_123',
    party_id: 'debug_party_id_' + Date.now(),
    version: 1,
    answer: {
      type: "answer",
      sdp: "v=0\r\no=- 1234567890 1234567891 IN IP4 127.0.0.1\r\n..."
    }
  };

  console.log('📤 Mock answer event:', JSON.stringify(mockAnswerEvent, null, 2));
  
  // Dispatch the custom event to trigger our handlers
  window.dispatchEvent(new CustomEvent('debug-call-answer', {
    detail: mockAnswerEvent
  }));
};

// Function to check current call state
window.debugCallState = () => {
  console.log('📊 Current Call State Debug:');
  
  // Try to access call state from React context if available
  const elements = document.querySelectorAll('[data-call-active]');
  if (elements.length > 0) {
    console.log('📱 Found call-related elements:', elements.length);
    elements.forEach((el, index) => {
      console.log(`Element ${index}:`, el.dataset);
    });
  } else {
    console.log('❌ No active call elements found');
  }
  
  // Check for Matrix client in window
  if (window.matrixClient) {
    console.log('🔗 Matrix client found:', typeof window.matrixClient);
  } else {
    console.log('❌ No Matrix client found in window');
  }
};

console.log('🎯 Debug commands available:');
console.log('  debugCallAnswer(callId, roomId) - Simulate answer event');
console.log('  debugCallState() - Check current call state');
console.log('  Enable console logging and watch for call events');
