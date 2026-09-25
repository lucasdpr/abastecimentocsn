import { NextResponse } from 'next/server';
import { answerOmsChat, extractSummary, type ChatMessage } from '@/lib/oms-system-prompt';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (!messages.length) return NextResponse.json({ error: 'Envie ao menos uma mensagem.' }, { status: 400 });
    const result = await answerOmsChat(messages);
    return NextResponse.json({ ...result, summary: result.summary ?? extractSummary(result.message) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível processar a mensagem.' }, { status: 500 });
  }
}
