import { NextRequest, NextResponse } from 'next/server'
export async function POST(_req: NextRequest, { params }: { params: Promise<{ ai: string }> }) {
  const { ai } = await params
  const res = await fetch(`http://localhost:3001/open-login/${ai}`, { method: 'POST' })
  const data = await res.json()
  return NextResponse.json(data)
}
