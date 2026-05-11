import { NextRequest, NextResponse } from 'next/server'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ai: string }> }) {
  const { ai } = await params
  const res = await fetch(`http://localhost:3001/check-login/${ai}`)
  const data = await res.json()
  return NextResponse.json(data)
}
