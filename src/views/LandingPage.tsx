import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, FileText, Layers3, Menu, ShieldCheck, Sparkles, Workflow, X } from 'lucide-react';
import { VipazLogo } from '../components/VipazLogo';
import { LegalFlowCanvas } from '../components/LegalFlowCanvas';

interface LandingPageProps { onNavigate: (path: string) => void; }

const capabilities = [
  { title:'Compreensão estruturada', text:'Autos, partes e fatos transformados em contexto operacional para a equipe.', icon:FileText },
  { title:'Arquitetura jurídica', text:'Regras, teses e blocos validados organizados antes da redação.', icon:Layers3 },
  { title:'Produção assistida', text:'IA aplicada com revisão humana, critérios visíveis e conteúdo editável.', icon:Sparkles },
  { title:'Entrega rastreável', text:'Versões, decisões e documentos preservados do início ao resultado.', icon:ShieldCheck },
] as const;

const layers = [
  { name:'Contexto', kicker:'01 · Compreender', title:'Uma base única para cada caso.', text:'Centralize documentos, dados processuais, partes e informações relevantes antes de qualquer produção.' },
  { name:'Estratégia', kicker:'02 · Decidir', title:'Decisões jurídicas com método.', text:'Aplique regras, teses, preliminares e condicionantes conforme o cenário concreto e os padrões da organização.' },
  { name:'Estrutura', kicker:'03 · Organizar', title:'Veja a peça antes de gerá-la.', text:'Revise a arquitetura, a ordem dos argumentos e os blocos aplicáveis antes da composição documental.' },
  { name:'Documento', kicker:'04 · Entregar', title:'Produção consistente e auditável.', text:'Gere documentos editáveis preservando decisões, autoria, versões e rastreabilidade do processo.' },
] as const;

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const heroRef=useRef<HTMLElement>(null); const heroGlowRef=useRef<HTMLDivElement>(null);
  const [scrolled,setScrolled]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [activeLayer,setActiveLayer]=useState(0);
  useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>24);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);

  return <div className="min-h-screen bg-white text-[#111] selection:bg-[#20D7E8] selection:text-black">
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled?'bg-white text-black shadow-[0_1px_0_rgba(0,0,0,.12)]':'bg-transparent text-white'}`}>
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-6 lg:px-12">
        <button onClick={()=>onNavigate('/')}><VipazLogo inverse={!scrolled}/></button>
        <nav className="hidden items-center gap-9 text-xs font-bold lg:flex">
          {['Plataforma','Soluções','Método','Recursos'].map(item=><a key={item} href={`#${item.toLowerCase().replace('ç','c')}`} className="group flex items-center gap-1.5 transition-opacity hover:opacity-60">{item}<ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180"/></a>)}
        </nav>
        <div className="hidden items-center lg:flex"><button onClick={()=>onNavigate('/login')} className="rounded-xl bg-[#20D7E8] px-6 py-4 text-xs font-bold text-black transition hover:bg-white">Acessar plataforma</button></div>
        <button onClick={()=>setMenuOpen(v=>!v)} className="lg:hidden" aria-label="Alternar menu">{menuOpen?<X/>:<Menu/>}</button>
      </div>
      {menuOpen&&<div className="border-t border-black/10 bg-white p-6 text-black lg:hidden">{['Plataforma','Soluções','Método','Recursos'].map(item=><a key={item} href={`#${item.toLowerCase().replace('ç','c')}`} onClick={()=>setMenuOpen(false)} className="block border-b border-black/10 py-4 text-lg font-semibold">{item}</a>)}<button onClick={()=>onNavigate('/login')} className="mt-6 w-full rounded-xl bg-[#20D7E8] p-4 text-sm font-bold">Acessar plataforma</button></div>}
    </header>

    <main>
      <section ref={heroRef} id="plataforma" onPointerMove={event=>{if(!heroRef.current||!heroGlowRef.current)return;const bounds=heroRef.current.getBoundingClientRect();heroGlowRef.current.style.left=`${((event.clientX-bounds.left)/bounds.width)*100}%`;heroGlowRef.current.style.top=`${((event.clientY-bounds.top)/bounds.height)*100}%`;}} className="relative grid min-h-screen overflow-hidden bg-[#101417] text-white lg:grid-cols-2">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]"/>
        <div ref={heroGlowRef} className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#20D7E8]/15 blur-3xl transition-[left,top] duration-300"/>
        <div className="relative z-10 flex min-h-[70vh] flex-col justify-end border-b border-white/10 px-6 pb-12 pt-32 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-12 lg:pb-16">
          <div className="relative">
            <h1 className="max-w-3xl text-[clamp(3.7rem,6.6vw,7.2rem)] font-medium leading-[.91] tracking-[-.06em]">Produção jurídica de alta performance</h1>
            <p className="mt-8 max-w-xl text-base font-semibold leading-7 text-white/65">O VIPAZ conecta contexto, método e inteligência para transformar conhecimento jurídico em entregas consistentes.</p>
            <a href="#metricas" className="mt-12 flex w-fit items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/45">Explorar <ArrowDown className="h-4 w-4 animate-bounce"/></a>
          </div>
        </div>
        <div className="relative z-10 min-h-[70vh] lg:min-h-screen">
          <div className="absolute inset-0"><LegalFlowCanvas transparent/></div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/55"/>
        </div>
      </section>

      <section id="metricas" className="bg-[#F3F3F0] px-6 py-16 lg:px-12"><div className="mx-auto grid max-w-[1344px] gap-px overflow-hidden rounded-2xl bg-black/15 sm:grid-cols-2 lg:grid-cols-4">{[['100%','Revisável'],['04','Etapas conectadas'],['01','Fonte de verdade'],['24/7','Workspace disponível']].map(([value,label])=><div key={label} className="bg-[#F3F3F0] px-6 py-8"><div className="text-5xl font-medium tracking-[-.06em]">{value}</div><div className="mt-3 text-xs font-bold text-black/55">{label}</div></div>)}</div></section>

      <section id="solucoes" className="px-6 py-24 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1344px]">
        <div className="grid gap-12 lg:grid-cols-12"><h2 className="text-5xl font-medium leading-[.98] tracking-[-.055em] sm:text-7xl lg:col-span-7">Construído na prática.<br/>Preparado para pressão.</h2><div className="lg:col-span-4 lg:col-start-9"><p className="text-base leading-7 text-black/65">Uma plataforma pensada para ambientes jurídicos reais — com prazos, múltiplos casos, critérios institucionais e responsabilidade profissional.</p></div></div>
        <div className="mt-20 grid overflow-hidden rounded-2xl border border-black/15 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(({title,text,icon:Icon},i)=><article key={title} className="group min-h-[330px] border-b border-black/15 p-6 transition-colors hover:bg-[#20D7E8] sm:border-r lg:border-b-0"><div className="flex justify-between"><span className="text-xs font-mono text-black/40">0{i+1}</span><Icon className="h-5 w-5"/></div><div className="mt-32"><h3 className="text-xl font-bold tracking-[-.03em]">{title}</h3><p className="mt-4 text-sm leading-6 text-black/55 group-hover:text-black/70">{text}</p></div></article>)}</div>
      </div></section>

      <section id="metodo" className="bg-[#111] px-6 py-24 text-white lg:px-12 lg:py-32"><div className="mx-auto max-w-[1344px]">
        <div className="grid gap-10 lg:grid-cols-12"><div className="lg:col-span-5"><span className="text-xs font-bold uppercase tracking-[.16em] text-[#20D7E8]">Um ecossistema. Totalmente conectado.</span><h2 className="mt-6 text-5xl font-medium leading-[.98] tracking-[-.05em] sm:text-7xl">Cada camada funciona sozinha. Juntas, mudam a resposta.</h2></div><div className="lg:col-span-6 lg:col-start-7"><div className="border-t border-white/20">{layers.map((layer,i)=><button key={layer.name} onClick={()=>setActiveLayer(i)} className="w-full border-b border-white/20 py-5 text-left"><div className="flex items-center justify-between"><span className={`text-xl font-semibold ${activeLayer===i?'text-[#20D7E8]':'text-white/55'}`}>{layer.name}</span><span className="text-2xl">{activeLayer===i?'−':'+'}</span></div>{activeLayer===i&&<div className="animate-in fade-in slide-in-from-top-2 duration-300"><div className="mt-7 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">{layer.kicker}</div><h3 className="mt-3 text-3xl font-medium">{layer.title}</h3><p className="mt-4 max-w-lg text-sm leading-6 text-white/55">{layer.text}</p></div>}</button>)}</div></div></div>
      </div></section>

      <section id="recursos" className="grid min-h-[720px] lg:grid-cols-2"><div className="relative min-h-[480px] overflow-hidden"><LegalFlowCanvas compact/></div><div className="flex flex-col justify-center bg-[#20D7E8] p-8 sm:p-14 lg:p-20"><Workflow className="h-8 w-8"/><span className="mt-16 text-xs font-bold uppercase tracking-[.16em]">Responsabilidade centralizada</span><h2 className="mt-5 text-5xl font-medium leading-[.95] tracking-[-.055em] sm:text-7xl">Um método.<br/>Uma fonte.<br/>Um resultado.</h2><div className="mt-10 space-y-4">{['Contexto preservado do início ao fim','Conhecimento institucional reutilizável','Decisões visíveis e auditáveis'].map(x=><div key={x} className="flex items-center gap-3 border-t border-black/20 pt-4 text-sm font-bold"><Check className="h-4 w-4"/>{x}</div>)}</div></div></section>

      <section className="bg-[#F3F3F0] px-6 py-24 lg:px-12 lg:py-32"><div className="mx-auto flex max-w-[1344px] flex-col gap-12 lg:flex-row lg:items-end lg:justify-between"><h2 className="max-w-4xl text-5xl font-medium leading-[.95] tracking-[-.055em] sm:text-7xl">Eleve padrão, qualidade e agilidade na entrega de artefatos jurídicos.</h2><div className="max-w-sm"><p className="text-sm leading-6 text-black/60">Comece com um caso e descubra como contexto, estratégia e entrega podem operar em um único sistema.</p><button onClick={()=>onNavigate('/login')} className="mt-7 inline-flex items-center gap-10 rounded-xl bg-black px-6 py-4 text-sm font-bold text-white hover:bg-[#20D7E8] hover:text-black">Acessar o VIPAZ <ArrowRight className="h-4 w-4"/></button></div></div></section>
    </main>

    <footer className="bg-black px-6 py-12 text-white lg:px-12"><div className="mx-auto flex max-w-[1344px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><VipazLogo inverse/><p className="mt-3 text-xs text-white/40">Produção jurídica de alta perfomance.</p></div><div className="text-[10px] text-white/35">© {new Date().getFullYear()} VIPAZ Jurídico · Ambiente profissional privado</div></div></footer>
  </div>;
};
