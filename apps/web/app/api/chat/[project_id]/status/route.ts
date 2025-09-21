import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: { project_id: string } }
) {
  const projectId = params.project_id;

  try {
    // Get active session status
    const response = await fetch(`${API_BASE_URL}/api/chat/${projectId}/active-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // No active session
      return NextResponse.json({ hasActiveSession: false });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch session status', details: errorText },
        { status: response.status }
      );
    }

    const session = await response.json();
    return NextResponse.json({
      hasActiveSession: true,
      session: session
    });
  } catch (error) {
    console.error('[Status Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}