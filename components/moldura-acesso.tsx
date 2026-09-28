import { BellRing, Bot, ClipboardList, FileSpreadsheet } from 'lucide-react'

const DESTAQUES = [
  { icone: ClipboardList, texto: 'Ordens, itens e necessidade de cada OM, direto das exportações do SAP.' },
  { icone: BellRing, texto: 'O que cobrar hoje: ordens paradas, prazos vencidos e ANTECs fora do prazo.' },
  { icone: Bot, texto: 'Assistente que responde pelo número da OM, do PO ou do material.' },
  { icone: FileSpreadsheet, texto: 'Excel de ida e volta: exporta, edita e reimporta o acompanhamento.' },
]

/** Layout das telas de acesso (login e cadastro): painel da marca no desktop, só o formulário no celular. */
export function MolduraAcesso({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#071f38] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black, transparent 75%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 size-[520px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(57 135 229 / 0.35), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-xl ring-1 ring-white/15" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Central de Abastecimento</p>
            <p className="text-xs text-white/60">Manutenção · CSN</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em]">A carteira de manutenção inteira, num lugar só.</h2>
          <ul className="mt-8 space-y-4">
            {DESTAQUES.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-white/80">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icone className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Ferramenta de apoio ao SAP. Os dados oficiais permanecem no SAP.</p>
      </aside>
      <div className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" width={48} height={48} className="size-12 rounded-xl shadow-card" />
            <div>
              <p className="text-lg font-semibold text-ink">Central de Abastecimento</p>
              <p className="text-xs text-muted">Manutenção · CSN</p>
            </div>
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted lg:hidden">Ferramenta de apoio ao SAP. Os dados oficiais permanecem no SAP.</p>
        </div>
      </div>
    </main>
  )
}
