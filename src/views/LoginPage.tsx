import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { authService, AuthError } from '../services/authService';
import { supabase } from '../lib/supabase';

interface LoginPageProps { onLoginSuccess: (tenantSlug: string) => void; onNavigateHome: () => void; initialErrorMessage?: string | null; }
type Mode = 'login' | 'signup' | 'reset';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome, initialErrorMessage }) => {
  const [mode,setMode]=useState<Mode>('login');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(initialErrorMessage||null);
  const [notice,setNotice]=useState<string|null>(null);
  const switchMode=(next:Mode)=>{setMode(next);setError(null);setNotice(null);setPassword('');};
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError(null);setNotice(null);
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail || (mode!=='reset' && !password) || (mode==='signup' && !name.trim())){setError('Preencha os campos obrigatórios.');return;}
    if(mode==='signup' && password.length<12){setError('Escolha uma senha com pelo menos 12 caracteres.');return;}
    setLoading(true);
    try {
      if(mode==='login'){
        const session=await authService.login(cleanEmail,password);
        onLoginSuccess(session.organization.slug);
      } else if(mode==='signup'){
        // Creating an identity does NOT grant membership or create a tenant.
        const {error:signupError}=await supabase.auth.signUp({
          email:cleanEmail,password,
          options:{data:{full_name:name.trim()},emailRedirectTo:window.location.origin+'/login'}
        });
        if(signupError)throw signupError;
        setNotice('Se o cadastro puder ser realizado, você receberá instruções no e-mail. Confirme o endereço e solicite ao administrador um convite para sua organização antes de entrar.');
        setPassword('');
      } else {
        const {error:resetError}=await supabase.auth.resetPasswordForEmail(cleanEmail,{
          redirectTo:window.location.origin+'/redefinir-senha'
        });
        if(resetError)throw resetError;
        setNotice('Se existir uma conta para este e-mail, você receberá instruções para redefinir a senha.');
      }
    }catch(err){
      setError(err instanceof AuthError?err.message:'Não foi possível concluir a solicitação. Tente novamente mais tarde.');
    }finally{setLoading(false);}
  };
  return <div className="min-h-screen bg-[#080b10] text-white grid lg:grid-cols-2">
    <section className="hidden lg:flex p-12 xl:p-16 flex-col justify-between border-r border-white/[.07]">
      <button onClick={onNavigateHome} className="w-fit font-editorial text-2xl font-bold">VIPAZ <span className="font-sans text-[11px] font-medium text-cyan-300">Jurídico</span></button>
      <div className="max-w-lg"><div className="text-[11px] uppercase tracking-[.18em] text-cyan-300 mb-7">Workspace jurídico</div><h1 className="text-5xl xl:text-6xl leading-[.98] tracking-[-.05em] font-semibold">Estrutura para pensar.<br/><span className="text-white/30">Controle para produzir.</span></h1></div>
      <div className="text-[11px] text-white/25">Ambiente profissional privado</div>
    </section>
    <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-[420px]">
        <button onClick={onNavigateHome} className="lg:hidden mb-12 inline-flex items-center gap-2 text-[12px] text-white/45"><ArrowLeft className="w-4 h-4"/>Voltar</button>
        <div className="mb-8"><h2 className="text-3xl tracking-[-.035em] font-semibold">{mode==='signup'?'Criar conta.':mode==='reset'?'Recuperar acesso.':'Bem-vindo.'}</h2><p className="mt-2 text-[13px] text-white/40">{mode==='signup'?'Seu acesso à organização dependerá de autorização.':mode==='reset'?'Enviaremos instruções para seu e-mail.':'Acesse seu ambiente de trabalho.'}</p></div>
        {error&&<div role="alert" className="mb-5 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/[.06] p-3 text-[12px] text-red-200"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
        {notice&&<div role="status" className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] p-3 text-[12px] text-cyan-100">{notice}</div>}
        <form onSubmit={submit} className="space-y-5">
          {mode==='signup'&&<label className="block"><span className="mb-2 block text-[11px] text-white/45">Nome completo</span><input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="w-full h-12 rounded-xl border border-white/10 bg-white/[.035] px-4 text-[13px]" /></label>}
          <label className="block"><span className="mb-2 block text-[11px] text-white/45">E-mail</span><input required autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full h-12 rounded-xl border border-white/10 bg-white/[.035] px-4 text-[13px]" placeholder="nome@escritorio.com.br"/></label>
          {mode!=='reset'&&<label className="block"><span className="mb-2 block text-[11px] text-white/45">Senha {mode==='signup'?'(mínimo de 12 caracteres)':''}</span><input required minLength={mode==='signup'?12:undefined} autoComplete={mode==='signup'?'new-password':'current-password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full h-12 rounded-xl border border-white/10 bg-white/[.035] px-4 text-[13px]" placeholder="Sua senha"/></label>}
          <button disabled={loading} className="w-full h-12 rounded-xl bg-white text-black text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{loading?'Aguarde…':<>{mode==='signup'?'Criar conta':mode==='reset'?'Enviar instruções':'Entrar'} <ArrowRight className="w-4 h-4"/></>}</button>
        </form>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-cyan-200">
          {mode!=='login'&&<button type="button" onClick={()=>switchMode('login')}>Já tenho conta</button>}
          {mode!=='signup'&&<button type="button" onClick={()=>switchMode('signup')}>Criar conta</button>}
          {mode!=='reset'&&<button type="button" onClick={()=>switchMode('reset')}>Esqueci minha senha</button>}
        </div>
        <p className="mt-7 text-center text-[10px] leading-5 text-white/35">O cadastro não concede acesso automático a processos ou organizações. Um administrador deve autorizar a associação.</p>
      </div>
    </section>
  </div>;
};
