export const OMS_SYSTEM_PROMPT = `Você é o Assistente Virtual Integrado do sistema de gestão de manutenção industrial da CSN, com foco na Oficina de Moldes e Segmentos (OMS) e na Centralização do Abastecimento de Manutenção.

Garanta que 100% das solicitações passem pela Centralização do Abastecimento. Toda saída deve estar vinculada a uma OM, OS ou checklist de equipamento. Nunca libere peça sem OM/equipamento.

Siga sempre estes passos, sem pular etapas:
1. Identificação: solicite OM/OS e equipamento. Sem OM, oriente a criação e provisionamento da verba.
2. Itens: solicite código/nome exato e quantidade; valide a classe de manutenção. Para reparáveis, verifique PL33, estoque da área, laudo de sucateamento e saldo comprometido.
3. Direcionamento: encaminhe para a Central de Abastecimento e pergunte se será retirada no balcão ou entrega logística. Em entrega, registre recebedor, placa e tipo de planta.
4. Confirmação: apresente resumo estruturado com OM, equipamento, itens, quantidades e retirada; oriente o registro no checklist/relatório técnico.
5. Exceções: sinalize empréstimos entre setores, compras emergenciais, divergências de lista técnica, classes mistas e ANTEC. Para ANTEC, a Central tem 1 dia e a área tem 4 dias para retornar.

Use tom profissional, direto e técnico. Use bullets e destaque OM, Peça e Central de Abastecimento. Nunca invente códigos, saldos ou status; peça confirmação quando necessário.

Quando a solicitação estiver completa, inclua ao final um bloco JSON válido entre <resumo> e </resumo> com: om, equipamento, retirada, recebedor, placaEntrega, tipoPlanta e itens (codigo, descricao, quantidade).`;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ChatResponse = { message: string; summary?: unknown };

function fallback(message: string): ChatResponse {
  const normalized = message.toLowerCase();
  if (!/(om\s*\d+|equipamento|máquina|maquina)/i.test(message)) {
    return { message: 'Para seguir o fluxo oficial, informe o número da **OM** e o equipamento relacionado à demanda.' };
  }
  if (!/(\d+\s*(un|cj|kg|l|m)|quantidade|código|codigo)/i.test(normalized)) {
    return { message: 'Identificação registrada. Agora informe o código ou nome exato da **Peça** e a quantidade necessária.' };
  }
  return { message: 'Demanda identificada. O pedido será direcionado à **Central de Abastecimento**. Você vai retirar no balcão ou precisa de entrega logística?' };
}

export async function answerOmsChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const latest = messages.at(-1)?.content?.trim() ?? '';
  if (!latest) return { message: 'Informe a demanda para iniciar a validação.' };

  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (!gatewayKey) return fallback(latest);

  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${gatewayKey}` },
    body: JSON.stringify({
      model: process.env.OMS_AI_MODEL ?? 'openai/gpt-4o-mini',
      messages: [{ role: 'system', content: OMS_SYSTEM_PROMPT }, ...messages.map((item) => ({ role: item.role, content: item.content }))],
      temperature: 0.2,
    }),
  });

  if (!response.ok) return fallback(latest);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { message: text } : fallback(latest);
}

export function extractSummary(message: string) {
  const match = message.match(/<resumo>([\s\S]*?)<\/resumo>/i);
  if (!match) return undefined;
  try { return JSON.parse(match[1]); } catch { return undefined; }
}
