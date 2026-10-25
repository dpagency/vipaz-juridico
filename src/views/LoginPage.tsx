import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { authService, AuthError } from '../services/authService';
import { VipazLogo } from '../components/VipazLogo';

interface LoginPageProps { onLoginSuccess: (tenantSlug: string) => void; onNavigateHome: () => void; initialErrorMessage?: string | null; }

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome, initialErrorMessage }) => {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(initialErrorMessage||null);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!email.trim()||!password){setError('Informe e-mail e senha para continuar.');return;}setLoading(true);setError(null);try{const s=await authService.login(email,password);onLoginSuccess(s.organization.slug);}catch(err){setError(err instanceof AuthError?err.message:'Não foi possível autenticar. Verifique suas credenciais.');}finally{setLoading(false);}};
  return <main className="min-h-screen bg-[#F2F4F3] p-4 text-[#11161A] sm:p-6">
    <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1400px] gap-4 lg:grid-cols-12 sm:min-h-[calc(100vh-3rem)]">
      <section className="vipaz-bento-card relative hidden overflow-hidden bg-[#11161A] p-10 text-white lg:col-span-7 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <button onClick={onNavigateHome} className="relative z-10"><VipazLogo inverse/></button>
        <div className="relative z-10 max-w-2xl"><span className="vipaz-kicker text-[#20D7E8]">Workspace jurídico</span><h1 className="vipaz-display mt-6 text-6xl leading-[.84] xl:text-8xl">Estrutura para<br/><span className="text-[#20D7E8]">pensar melhor.</span></h1><div className="mt-10 grid grid-cols-3 gap-3">{['Contexto','Método','Controle'].map(x=><div key={x} className="border-t border-white/25 py-4"><Check className="mb-5 h-4 w-4 text-[#20D7E8]"/><span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{x}</span></div>)}</div></div>
        <p className="relative z-10 text-[10px] text-white/35">Ambiente profissional privado</p>
      </section>
      <section className="vipaz-bento-card flex items-center justify-center bg-white p-6 sm:p-10 lg:col-span-5 xl:p-14"><div className="w-full max-w-[420px]">
        <button onClick={onNavigateHome} className="mb-12 inline-flex items-center gap-2 text-xs font-semibold text-[#687284] lg:hidden"><ArrowLeft className="h-4 w-4"/>Voltar</button>
        <div className="mb-10"><div className="mb-5 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center border border-[#C6CECB] text-black"><ShieldCheck className="h-4 w-4"/></span><span className="vipaz-kicker text-black">Acesso seguro</span></div><h2 className="vipaz-display text-5xl leading-none">Bem-vindo<br/>de volta.</h2><p className="mt-4 text-xs leading-6 text-[#657078]">Entre para acessar o ambiente da sua organização.</p></div>
        {error&&<div className="mb-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="mb-2 block text-[11px] font-bold text-[#3F494F]">E-mail profissional</span><input autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="h-13 w-full rounded-xl border border-[#C6CECB] bg-[#F2F4F3] px-4 text-sm outline-none transition focus:border-black focus:ring-4 focus:ring-[#20D7E8]/50" placeholder="nome@escritorio.com.br"/></label>
          <label className="block"><span className="mb-2 block text-[11px] font-bold text-[#3F494F]">Senha</span><input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="h-13 w-full rounded-xl border border-[#C6CECB] bg-[#F2F4F3] px-4 text-sm outline-none transition focus:border-black focus:ring-4 focus:ring-[#20D7E8]/50" placeholder="Sua senha"/></label>
          <button disabled={loading} className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-black text-xs font-extrabold text-white transition hover:bg-[#20D7E8] hover:text-black disabled:opacity-50">{loading?'Entrando…':<>Entrar no workspace <ArrowRight className="h-4 w-4"/></>}</button>
        </form>
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#9299A5]"><Sparkles className="h-3 w-3"/>Acesso destinado a usuários autorizados</div>
      </div></section>
    </div>
  </main>;
};
