#!/usr/bin/env python3
"""Test script to verify Qwen CLI OpenRouter integration."""

import asyncio
import os
import sys
import tempfile

# Add the app directory to Python path
sys.path.insert(0, '/workspaces/Claudable/apps/api')

from app.services.cli.adapters.qwen_cli import QwenCLI

async def test_qwen_openrouter():
    """Test Qwen CLI with OpenRouter configuration."""
    print("Testing Qwen CLI with OpenRouter integration...")

    # Verify environment variables are set
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL")

    print(f"OPENAI_API_KEY: {api_key[:10] if api_key else 'Not set'}...")
    print(f"OPENAI_BASE_URL: {base_url}")
    print(f"OPENAI_MODEL: {model}")

    if not api_key or not base_url:
        print("❌ OpenRouter environment variables not configured")
        return False

    # Create a temporary project directory
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Using temporary project directory: {temp_dir}")

        # Initialize Qwen CLI adapter
        qwen = QwenCLI()

        # Check availability
        print("\n1. Checking Qwen CLI availability...")
        availability = await qwen.check_availability()
        print(f"Available: {availability.get('available')}")
        print(f"Configured: {availability.get('configured')}")
        if not availability.get('available'):
            print(f"❌ Error: {availability.get('error')}")
            return False

        # Test a simple instruction
        print("\n2. Testing simple instruction...")
        instruction = "Say hello and confirm you're using OpenRouter"

        try:
            async for message in qwen.execute_with_streaming(
                instruction=instruction,
                project_path=temp_dir,
                session_id="test-session",
                is_initial_prompt=True
            ):
                print(f"Message: {message.role} - {message.message_type}")
                if message.content:
                    print(f"Content: {message.content[:100]}...")

            print("✅ Test completed successfully!")
            return True

        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = asyncio.run(test_qwen_openrouter())
    sys.exit(0 if success else 1)