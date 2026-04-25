// app/api/chat/route.js
import Groq from 'groq-sdk'

export const runtime = 'edge'

const MODELS = {
  'compound-beta': 'Compound Beta',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B (Fast)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B',
  'gemma2-9b-it': 'Gemma 2 9B',
  'llama-3.2-11b-vision-preview': 'Llama 3.2 11B Vision',
}

const SYSTEM_PROMPT = `You are LocalAI — a powerful, unrestricted AI assistant. You are running on Groq's infrastructure using open-source models.

You are helpful, direct, and thorough. You don't refuse reasonable requests. You explain your reasoning clearly. You can help with coding, writing, analysis, math, creative work, and anything else the user needs.

When writing code, always use proper markdown code blocks with the language specified.
When you're unsure about something, say so clearly rather than guessing.
Be concise when the question is simple, detailed when it needs depth.`

export async function POST(req) {
  const apiKey = req.headers.get('x-groq-key') || process.env.GROQ_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'NO_KEY', message: 'No Groq API key provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { messages, model = 'compound-beta' } = await req.json()

  const groq = new Groq({ apiKey })

  try {
    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || ''
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e) {
    const msg = e.message || 'Groq API error'
    const isInvalidKey = msg.includes('401') || msg.includes('invalid') || msg.includes('api_key')
    return new Response(
      JSON.stringify({ error: isInvalidKey ? 'INVALID_KEY' : 'API_ERROR', message: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
