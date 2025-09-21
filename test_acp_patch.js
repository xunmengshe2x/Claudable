#!/usr/bin/env node

// Simple test to verify the ACP patch is working
const { spawn } = require('child_process');

// Check if OpenRouter environment variables should be set
const testMode = process.argv[2];
if (testMode !== 'fallback') {
  // Set OpenRouter environment variables for normal test
  process.env.OPENAI_API_KEY = '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';
  process.env.OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';
  process.env.OPENAI_MODEL = 'qwen/qwen3-coder-plus';
} else {
  // Remove OpenRouter env vars for fallback test
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
}

console.log('Testing patched Qwen ACP mode...');
console.log('Test mode:', testMode || 'normal (with OpenRouter)');
console.log('Environment variables:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 'not set');
console.log('- OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || 'not set');
console.log('- OPENAI_MODEL:', process.env.OPENAI_MODEL || 'not set');

const qwen = spawn('qwen', ['--experimental-acp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

// Send minimal ACP initialize request
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: 1,
    clientCapabilities: {
      fs: {
        readTextFile: true,
        writeTextFile: true
      }
    }
  }
};

qwen.stdin.write(JSON.stringify(initRequest) + '\n');

let responseData = '';
qwen.stdout.on('data', (data) => {
  responseData += data.toString();
});

qwen.stderr.on('data', (data) => {
  console.error('stderr:', data.toString());
});

qwen.on('close', (code) => {
  console.log('\nQwen process exited with code:', code);

  if (responseData) {
    console.log('\nResponse received:');
    try {
      const response = JSON.parse(responseData.trim());
      console.log(JSON.stringify(response, null, 2));

      if (response.result && response.result.authMethods) {
        console.log('\n=== AUTH METHODS ANALYSIS ===');
        response.result.authMethods.forEach((method, index) => {
          console.log(`${index + 1}. ${method.name} (ID: ${method.id})`);
          if (method.description) {
            console.log(`   Description: ${method.description}`);
          }
        });

        // Check if OpenRouter auth method is present
        const openRouterMethod = response.result.authMethods.find(m =>
          m.name === 'OpenRouter' || m.id === 'USE_OPENAI'
        );

        if (openRouterMethod) {
          console.log('\n✅ SUCCESS: OpenRouter auth method found!');
          console.log('The patch is working correctly.');
        } else {
          console.log('\n❌ FAILURE: OpenRouter auth method not found.');
          console.log('The patch may not be working as expected.');
        }
      }
    } catch (e) {
      console.error('Failed to parse response as JSON:', e.message);
      console.log('Raw response:', responseData);
    }
  } else {
    console.log('No response received');
  }
});

// Send the init request and close after a short delay
setTimeout(() => {
  qwen.stdin.end();
}, 1000);