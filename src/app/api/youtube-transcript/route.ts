import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // fetchTranscript accepts a full URL too
    const items = await YoutubeTranscript.fetchTranscript(url)
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Could not fetch transcript. Captions may be disabled for this video.' }, { status: 400 })
    }

    const transcript = items.map((item) => item.text).join(' ')

    return NextResponse.json({ transcript })
  } catch (error: any) {
    console.error('Youtube Transcript API Error:', error)
    return NextResponse.json(
      { error: 'Captions unavailable or failed to fetch transcript.' },
      { status: 500 }
    )
  }
}
