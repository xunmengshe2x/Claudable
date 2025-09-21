import { NextRequest, NextResponse } from 'next/server';

// Get the API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Handle preflight CORS requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the API path
    const apiPath = pathSegments.join('/');
    // Add trailing slash only for projects endpoints to avoid redirect issues with FastAPI
    const needsTrailingSlash = apiPath.startsWith('projects');
    const finalPath = needsTrailingSlash && !apiPath.endsWith('/') ? `${apiPath}/` : apiPath;
    const targetUrl = `${API_BASE_URL}/api/${finalPath}`;

    console.log(`[Proxy] ${method} ${request.url} -> ${targetUrl}`);

    // Get request body if it exists
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch (e) {
        // No body or invalid body
        body = undefined;
      }
    }

    // Forward the request to the API server
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
      },
      ...(body && { body }),
    });

    // Get response data
    const responseData = await response.text();

    console.log(`[Proxy] Response: ${response.status} ${response.statusText}`);

    // Return the response with CORS headers
    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('[Proxy] Error:', error);

    return new NextResponse(
      JSON.stringify({
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}