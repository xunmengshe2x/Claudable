import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8081';

export async function GET(
  request: NextRequest,
  { params }: { params: { project_id: string } }
) {
  const projectId = params.project_id;
  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get('conversation_id');
  const limit = searchParams.get('limit') || '100';

  try {
    let url = `${API_BASE_URL}/api/chat/${projectId}/messages?limit=${limit}`;
    if (conversationId) {
      url += `&conversation_id=${conversationId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: errorText },
        { status: response.status }
      );
    }

    const messages = await response.json();
    return NextResponse.json(messages);
  } catch (error) {
    console.error('[Messages Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}