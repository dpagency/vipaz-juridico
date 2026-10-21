import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage({onNavigateLogin}:{onNavigateLogin:()=>void}) {
  const [password,setPassword]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let mounted=true;
    // Supabase processes recovery tokens in the redirect URL.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      if(mounted && event==='PASSWORD_RECOVERY')setReady(true);
    });
    // getSession may already be populated when the listener is registered.
    void supabase.auth.getSession().then(({data})=>{if(mounted && data.session)setReady(true);});
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(password.length<12){setMessage('Use uma senha com pelo menos 12 caracteres.');return;}
    setBusy(true);setMessage('');
    try {
      const {error}=await supabase.auth.updateUser({password});
      if(error)throw error;
      await supabase.auth.signOut();
      setMessage('Senha atualizada. Volte ao login para acessar sua conta.');
      setReady(false);setPassword('');
    }catch{setMessage('Não foi possível redefinir a senha. Solicite um novo link de recuperação.');}
    finally{setBusy(false);}
  };
  return <main className="min-h-screen bg-[#080b10] text-white flex items-center justify-center p-6"><section className="w-full max-w-md space-y-5">
    <h1 className="text-3xl font-semibold">Redefinir senha</h1>
    <p className="text-sm text-white/60">Defina uma nova senha para sua conta VIPAZ.</p>
    {ready?<form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Nova senha (mínimo de 12 caracteres)<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full h-12 rounded-xl border border-white/20 bg-white/5 px-4"/></label>
      <button disabled={busy} className="w-full h-12 rounded-xl bg-white text-black font-semibold disabled:opacity-50">{busy?'Aguarde…':'Salvar nova senha'}</button>
    </form>:<p className="text-sm text-white/60">Abra o link recebido por e-mail. Se ele expirou, solicite outro na página de login.</p>}
    {message&&<p role="status" className="text-sm text-cyan-200">{message}</p>}
    <button onClick={onNavigateLogin} className="text-sm text-cyan-200">Voltar ao login</button>
  </section></main>;
}
