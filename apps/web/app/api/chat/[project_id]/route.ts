import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';

export async function POST(
  request: NextRequest,
  { params }: { params: { project_id: string } }
) {
  const projectId = params.project_id;

  try {
    const body = await request.json();

    // Forward the instruction to the backend's /chat endpoint
    const response = await fetch(`${API_BASE_URL}/api/chat/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruction: body.instruction,
        conversation_id: body.conversation_id,
        cli_preference: body.cli_preference,
        fallback_enabled: body.fallback_enabled,
        images: body.images || [],
        is_initial_prompt: body.is_initial_prompt || false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to send message to backend', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Chat Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}