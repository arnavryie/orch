import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createSession, updateTask, updateSession } from '@/lib/sessions/store'

export async function POST(req: NextRequest) {
  const { prompt, models } = await req.json()
  if (!prompt || !models || models.length === 0) {
    return NextResponse.json({ error: 'prompt and models required' }, { status: 400 })
  }

  const sessionId = uuidv4()
  const session = createSession(sessionId, prompt, models)

  // Fire and forget — run in background
  runOrchestration(sessionId, prompt, models)

  return NextResponse.json({ sessionId, tasks: session.tasks })
}

// ── Role assignments ───────────────────────────────────────────────
function buildSubPrompt(
  prompt: string,
  role: 'research' | 'write' | 'critique' | 'synthesize' | 'solo',
  priorOutputs: { ai: string; text: string }[]
): string {
  const context = priorOutputs
    .map(o => `[${o.ai.toUpperCase()}]:\n${o.text}`)
    .join('\n\n---\n\n')

  switch (role) {
    case 'solo':
      return prompt

    case 'research':
      return `You are a research agent. Your job is to gather key facts, context, trends, and relevant information about the following topic. Be thorough and factual. Do NOT write a full answer — only research.\n\nTopic: ${prompt}`

    case 'write':
      return `You are a writing agent. Using the research below, write a comprehensive, well-structured, high-quality response to the user's original request. Be clear, detailed, and engaging.\n\nUser's original request: ${prompt}\n\nResearch provided:\n\n${context}`

    case 'critique':
      return `You are a critique and improvement agent. Review the content below and improve it — fix any errors, fill gaps, improve clarity and structure.\n\nOriginal request: ${prompt}\n\nContent to improve:\n\n${context}`

    case 'synthesize':
      return `You are a synthesis agent. Combine the following AI outputs into one final, polished, comprehensive answer to the user's request. Remove redundancy, resolve contradictions, and present the best possible unified response.\n\nUser's original request: ${prompt}\n\nInputs to synthesize:\n\n${context}`
  }
}

function getRoles(count: number): Array<'research' | 'write' | 'critique' | 'synthesize' | 'solo'> {
  if (count === 1) return ['solo']
  if (count === 2) return ['research', 'synthesize']
  if (count === 3) return ['research', 'write', 'synthesize']
  // 4+: research, write, critique, synthesize
  return ['research', 'write', 'critique', 'synthesize']
}

const ROLE_LABELS: Record<string, string> = {
  solo: 'Generate Response',
  research: 'Research & Gather Context',
  write: 'Write & Draft',
  critique: 'Critique & Improve',
  synthesize: 'Synthesize Final Answer',
}

export { ROLE_LABELS }

// ── Orchestration runner ───────────────────────────────────────────
async function runOrchestration(sessionId: string, prompt: string, models: string[]) {
  const roles = getRoles(models.length)
  const outputs: { ai: string; text: string }[] = []

  // Update task names to match roles
  updateSession(sessionId, {
    tasks: models.map((ai, i) => ({
      id: `task-${i}`,
      name: ROLE_LABELS[roles[i]],
      ai,
      status: 'pending' as const,
    }))
  })

  for (let i = 0; i < models.length; i++) {
    const ai = models[i]
    const taskId = `task-${i}`
    const role = roles[i]

    // Only pass prior outputs that are relevant (not for research)
    const relevantPrior = role === 'research' ? [] : outputs

    updateTask(sessionId, taskId, { status: 'running' })

    try {
      const subPrompt = buildSubPrompt(prompt, role, relevantPrior)
      const res = await fetch(`http://localhost:3001/prompt/${ai}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: subPrompt }),
        signal: AbortSignal.timeout(180000)
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = data.output || data.error || 'No output'
      outputs.push({ ai, text })
      updateTask(sessionId, taskId, { status: 'done', output: text })
    } catch (err) {
      const errText = `Failed: ${String(err)}`
      outputs.push({ ai, text: errText })
      updateTask(sessionId, taskId, { status: 'error', error: errText })
    }
  }

  // Final output = last AI's output (the synthesizer)
  const finalOutput = outputs.length > 0 ? outputs[outputs.length - 1].text : 'No output generated.'
  updateSession(sessionId, { finalOutput, status: 'done' })
}
