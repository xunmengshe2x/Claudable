#!/usr/bin/env node

// Full integration test to verify OpenRouter works through patched ACP
const { spawn } = require('child_process');

// Set OpenRouter environment variables
process.env.OPENAI_API_KEY = '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';
process.env.OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';
process.env.OPENAI_MODEL = 'qwen/qwen3-coder-plus';

console.log('Testing full OpenRouter integration through patched Qwen ACP...');

const qwen = spawn('qwen', ['--experimental-acp'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let step = 0;
let sessionId = null;

qwen.stderr.on('data', (data) => {
  console.error('stderr:', data.toString());
});

qwen.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (!response) return;

  console.log(`\nStep ${step} Response:`, response);

  try {
    const parsed = JSON.parse(response);

    if (step === 0) {
      // Step 1: Initialize
      console.log('✅ Initialize successful');
      if (parsed.result?.authMethods?.some(m => m.name === 'OpenRouter')) {
        console.log('✅ OpenRouter auth method available');

        // Step 2: Authenticate with OpenRouter
        const authRequest = {
          jsonrpc: "2.0",
          id: 2,
          method: "authenticate",
          params: {
            methodId: "openai"  // Use the OpenRouter auth method
          }
        };
        console.log('\nSending authenticate request...');
        qwen.stdin.write(JSON.stringify(authRequest) + '\n');
        step = 1;
      }
    } else if (step === 1) {
      // Step 2: Authentication response
      if (parsed.result) {
        console.log('✅ Authentication successful');

        // Step 3: Create new session
        const sessionRequest = {
          jsonrpc: "2.0",
          id: 3,
          method: "newSession",
          params: {
            cwd: "/tmp",
            mcpServers: []
          }
        };
        console.log('\nSending newSession request...');
        qwen.stdin.write(JSON.stringify(sessionRequest) + '\n');
        step = 2;
      } else if (parsed.error) {
        console.log('❌ Authentication failed:', parsed.error.message);
        qwen.kill();
      }
    } else if (step === 2) {
      // Step 3: Session creation response
      if (parsed.result?.sessionId) {
        sessionId = parsed.result.sessionId;
        console.log('✅ Session created:', sessionId);

        // Step 4: Send a simple prompt
        const promptRequest = {
          jsonrpc: "2.0",
          id: 4,
          method: "prompt",
          params: {
            sessionId: sessionId,
            prompt: [
              {
                type: "text",
                text: "Say hello and confirm you're using OpenRouter. Keep response short."
              }
            ]
          }
        };
        console.log('\nSending prompt request...');
        qwen.stdin.write(JSON.stringify(promptRequest) + '\n');
        step = 3;
      } else if (parsed.error) {
        console.log('❌ Session creation failed:', parsed.error.message);
        qwen.kill();
      }
    } else if (step === 3) {
      // Step 4: Prompt response
      if (parsed.result) {
        console.log('✅ Prompt completed successfully');
        console.log('✅ FULL INTEGRATION TEST PASSED!');
        qwen.kill();
      } else if (parsed.error) {
        console.log('❌ Prompt failed:', parsed.error.message);
        qwen.kill();
      }
    }
  } catch (e) {
    console.log('Non-JSON response (might be streaming):', response);
  }
});

qwen.on('close', (code) => {
  console.log('\nQwen process exited with code:', code);
});

// Step 1: Send initialize request
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

console.log('Sending initialize request...');
qwen.stdin.write(JSON.stringify(initRequest) + '\n');