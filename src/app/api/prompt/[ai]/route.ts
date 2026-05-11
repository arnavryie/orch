import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ai: string }> }
) {
  const { ai } = await params
  const body = await req.json()
  const { prompt } = body

  if (!prompt) {
    return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
  }

  try {
    const res = await fetch(`http://localhost:3001/prompt/${ai}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })

    // Forward the SSE stream directly
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Automation server is offline. Run npm run dev.' },
      { status: 503 }
    )
  }
}
