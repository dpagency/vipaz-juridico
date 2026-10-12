import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, BrainCircuit, Building2, ChevronLeft, ChevronRight, HeartPulse, Menu, Scale, ShieldCheck, Sparkles, Workflow, X } from 'lucide-react';

const products = [
  { number: '01', name: 'VIPAZ Jurídico', field: 'Legal OS', summary: 'Do caso ao documento. Com método.', detail: 'Gestão de casos, modelos, produção documental e fluxos jurídicos em um ambiente com revisão profissional.', status: 'Conhecer solução', href: '/juridico/', icon: Scale, accent: 'from-cyan-400/20 via-sky-600/10 to-transparent', live: true },
  { number: '02', name: 'VIPAZ LGPD', field: 'Privacidade & Governança', summary: 'Dados protegidos. Processos responsáveis.', detail: 'Uma proposta de automação para apoiar inventários, controles e rotinas de governança em proteção de dados.', status: 'Em planejamento', href: '', icon: ShieldCheck, accent: 'from-violet-400/20 via-indigo-500/10 to-transparent', live: false },
  { number: '03', name: 'VIPAZ Gestão Pública', field: 'Gestão & Serviços', summary: 'Inteligência para a administração pública.', detail: 'Uma visão de workflows e soluções digitais voltados à eficiência, rastreabilidade e prestação de serviços.', status: 'Em planejamento', href: '', icon: Building2, accent: 'from-amber-300/20 via-orange-500/10 to-transparent', live: false },
  { number: '04', name: 'VIPAZ Saúde', field: 'Saúde & Operações', summary: 'Jornadas mais fluidas. Trabalho conectado.', detail: 'Uma frente futura para automação de processos operacionais e apoio responsável a equipes de saúde.', status: 'Em planejamento', href: '', icon: HeartPulse, accent: 'from-emerald-400/20 via-teal-500/10 to-transparent', live: false },
] as const;

export const PlatformHome: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = products[selected];
  const ActiveIcon = active.icon;
  const change = (offset: number) => setSelected(i => (i + offset + products.length) % products.length);
  return (
    <div className="min-h-screen bg-[#080b12] text-white selection:bg-cyan-300/25">
      <header className="relative z-20 border-b border-white/10">
        <div className="mx-auto max-w-[1440px] px-6 md:px-12 h-20 flex items-center justify-between">
          <a href="/" aria-label="VIPAZ — Página inicial" className="font-editorial text-2xl font-bold tracking-tight">VIPAZ<span className="text-cyan-300">.</span></a>
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-9 text-xs font-semibold tracking-wide text-white/60">
            <a href="#solucoes" className="hover:text-white transition">Soluções</a>
            <a href="#plataforma" className="hover:text-white transition">Plataforma</a>
            <a href="/juridico/" className="hover:text-white transition">VIPAZ Jurídico</a>
          </nav>
          <button aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} className="md:hidden rounded-lg p-2 border border-white/20">{menuOpen ? <X size={19}/> : <Menu size={19}/>}</button>
          <a href="/juridico/" className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold hover:bg-white hover:text-[#080b12] transition">Acessar Jurídico <ArrowUpRight size={14}/></a>
        </div>
        {menuOpen && <nav aria-label="Navegação móvel" className="md:hidden px-6 pb-6 flex flex-col gap-4 text-sm"><a href="#solucoes" onClick={() => setMenuOpen(false)}>Soluções</a><a href="#plataforma" onClick={() => setMenuOpen(false)}>Plataforma</a><a href="/juridico/">VIPAZ Jurídico</a></nav>}
      </header>

      <main>
        <section className="relative overflow-hidden" id="solucoes" aria-labelledby="home-title">
          <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${active.accent} transition-all duration-500`}/>
          <div aria-hidden="true" className="pointer-events-none absolute top-16 right-[-10vw] h-[600px] w-[600px] rounded-full border border-white/[.07] shadow-[0_0_0_85px_rgba(255,255,255,.012),0_0_0_175px_rgba(255,255,255,.012)]"/>
          <div className="relative mx-auto max-w-[1440px] px-6 md:px-12 pt-14 md:pt-24 pb-16 md:pb-24 min-h-[650px] lg:min-h-[720px] flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <p className="text-[11px] uppercase tracking-[.24em] text-cyan-200/80">VIPAZ · Automação & Inteligência Artificial</p>
              <span className="text-[11px] text-white/35">SaaS vertical · Soluções conectadas</span>
            </div>
            <div className="py-16 md:py-20 grid lg:grid-cols-[1fr_250px] gap-12 lg:items-end">
              <div>
                <p className="mb-5 text-sm text-white/50">Tecnologia aplicada a contextos que exigem confiança.</p>
                <h1 id="home-title" className="max-w-[950px] text-[clamp(3.6rem,8.3vw,8.5rem)] font-semibold tracking-[-.07em] leading-[.94]">Automação<span className="text-cyan-300"> & IA.</span><span className="block text-white/40">Feitas para agir.</span></h1>
                <p className="mt-8 max-w-xl text-base md:text-lg text-white/55 leading-relaxed">Uma plataforma para desenvolver soluções SaaS de alta performance em áreas especializadas — unindo processos, inteligência e supervisão humana.</p>
              </div>
              <div className="lg:text-right">
                <BrainCircuit aria-hidden="true" className="h-14 w-14 text-cyan-200/70 lg:ml-auto mb-8"/>
                <p className="text-xs leading-6 text-white/45">Começamos pelo Jurídico. A arquitetura de soluções VIPAZ está sendo concebida para evoluir com novos setores.</p>
              </div>
            </div>
            <div className="border-t border-white/15 pt-7 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <span className="font-mono text-xs text-cyan-200">{active.number} <span className="text-white/30">/ 04</span></span>
                <span className="text-sm text-white/70">{active.field}</span>
              </div>
              <div className="flex gap-2">
                <button aria-label="Solução anterior" onClick={() => change(-1)} className="p-3 rounded-full border border-white/20 hover:bg-white/10"><ChevronLeft size={18}/></button>
                <button aria-label="Próxima solução" onClick={() => change(1)} className="p-3 rounded-full border border-white/20 hover:bg-white/10"><ChevronRight size={18}/></button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0d111a]" aria-labelledby="catalog-heading">
          <div className="mx-auto max-w-[1440px] px-6 md:px-12 py-16 md:py-24 grid lg:grid-cols-[.8fr_1.2fr] gap-12 lg:gap-20">
            <div>
              <p className="text-[11px] uppercase tracking-[.2em] text-cyan-300 mb-5">Ecossistema VIPAZ</p>
              <h2 id="catalog-heading" className="text-4xl md:text-5xl tracking-[-.05em] font-semibold">Uma visão.<br/><span className="text-white/35">Múltiplos setores.</span></h2>
              <p className="max-w-sm text-sm leading-7 text-white/45 mt-6">Escolha uma vertical para conhecer a proposta. Indicamos com transparência quais soluções já podem ser acessadas.</p>
              <div className="mt-10 flex flex-wrap gap-2">
                {products.map((product,i) => <button key={product.number} aria-pressed={selected===i} onClick={() => setSelected(i)} className={`rounded-full px-4 py-2 text-xs border transition ${selected===i?'border-cyan-300 text-cyan-100 bg-cyan-300/10':'border-white/15 text-white/50 hover:text-white'}`}>{product.name.replace('VIPAZ ', '')}</button>)}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#111823] p-8 md:p-12 relative overflow-hidden">
              <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${active.accent}`}/>
              <div className="relative">
                <div className="flex items-center justify-between gap-3"><ActiveIcon className="h-9 w-9 text-cyan-200" aria-hidden="true"/><span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/55">{active.live?'Disponível para conhecer':'Visão de futuro'}</span></div>
                <h3 className="mt-16 text-4xl md:text-5xl font-semibold tracking-[-.05em]">{active.name}</h3>
                <p className="mt-4 text-xl text-white/70">{active.summary}</p>
                <p className="mt-6 max-w-xl text-sm leading-7 text-white/45">{active.detail}</p>
                {active.live ? <a href={active.href} className="mt-10 inline-flex items-center gap-3 rounded-full bg-white text-[#080b12] px-6 py-3 text-sm font-semibold hover:bg-cyan-200 transition">{active.status} <ArrowRight size={17}/></a> : <div className="mt-10 text-xs text-white/45">Em planejamento · Ainda sem acesso público</div>}
              </div>
            </div>
          </div>
        </section>

        <section id="plataforma" className="border-t border-white/10">
          <div className="mx-auto max-w-[1440px] px-6 md:px-12 py-20 md:py-28">
            <div className="flex items-center gap-2 text-cyan-200 text-[11px] tracking-[.2em] uppercase mb-7"><Sparkles size={15}/> Plataforma orientada a resultados</div>
            <div className="grid lg:grid-cols-2 gap-10 mb-16"><h2 className="text-4xl md:text-6xl font-semibold tracking-[-.055em] leading-tight">Menos fricção.<br/>Mais capacidade de entrega.</h2><p className="max-w-md text-sm leading-7 text-white/50 lg:ml-auto">Desenhamos experiências digitais que conectam conhecimento especializado, fluxos automatizados e inteligência artificial com responsabilidade, controle e clareza.</p></div>
            <div className="grid md:grid-cols-3 gap-px border border-white/10 bg-white/10 rounded-2xl overflow-hidden">
              {[{icon:Workflow,title:'Automação de processos',text:'Fluxos estruturados para reduzir retrabalho e organizar operações complexas.'},{icon:BrainCircuit,title:'IA aplicada',text:'Assistência inteligente nos pontos em que ela pode agregar contexto e produtividade.'},{icon:ShieldCheck,title:'Supervisão e governança',text:'Pessoas no controle das decisões e processos com atenção à rastreabilidade.'}].map((item,i)=>{const Icon=item.icon;return <div key={item.title} className="bg-[#080b12] p-8 md:p-10"><span className="text-[10px] text-white/30 font-mono">0{i+1}</span><Icon className="mt-10 h-7 w-7 text-cyan-300"/><h3 className="mt-7 font-semibold text-lg">{item.title}</h3><p className="mt-3 text-sm leading-7 text-white/45">{item.text}</p></div>})}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 px-6 md:px-12 py-10"><div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-5"><span className="font-editorial text-xl font-bold">VIPAZ<span className="text-cyan-300">.</span></span><span className="text-xs text-white/40">Automação & IA · SaaS para setores especializados</span><a href="/juridico/" className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-cyan-200">VIPAZ Jurídico <ArrowUpRight size={14}/></a></div></footer>
    </div>
  );
};
