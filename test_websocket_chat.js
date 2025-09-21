#!/usr/bin/env node

// Test WebSocket chat with Qwen through OpenRouter
const WebSocket = require('ws');

console.log('Testing WebSocket chat with Qwen through OpenRouter...');

// Connect to WebSocket endpoint
const ws = new WebSocket('ws://localhost:8082/api/chat/test-project');

ws.on('open', function open() {
  console.log('✅ WebSocket connected');

  // Send a test message to Qwen
  const message = {
    type: 'message',
    content: 'Hello! Please confirm you are using OpenRouter and say hello back.',
    cliType: 'qwen'
  };

  console.log('Sending message:', message);
  ws.send(JSON.stringify(message));
});

ws.on('message', function message(data) {
  try {
    const response = JSON.parse(data.toString());
    console.log('📨 Received:', response);

    if (response.type === 'response' && response.content) {
      console.log('🤖 Qwen response:', response.content);
    }
  } catch (e) {
    console.log('📝 Raw response:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('👋 WebSocket closed');
});

// Close after 30 seconds
setTimeout(() => {
  console.log('⏰ Closing connection...');
  ws.close();
}, 30000);