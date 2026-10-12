import React, { useEffect, useState } from 'react';
import { authService, AuthSession } from './services/authService';
import { LandingPage } from './views/LandingPage';
import { LoginPage } from './views/LoginPage';
import { AppShell } from './components/AppShell';
import { DashboardView } from './views/DashboardView';
import { NovaPecaView } from './views/NovaPecaView';
import { GeracaoView } from './views/GeracaoView';
import { DocumentosView } from './views/DocumentosView';
import { CasosListView } from './views/CasosListView';
import { CaseWorkspaceView } from './views/case-workspace/CaseWorkspaceView';
import { BibliotecaView } from './views/BibliotecaView';
import { IndicadoresView } from './views/IndicadoresView';
import { AdminToolsView } from './views/AdminToolsView';
import { StudioView } from './views/StudioView';
import { ThemeProvider } from './contexts/ThemeContext';
import { ShieldAlert, LogOut, ArrowRight, Loader2 } from 'lucide-react';

const isVipazDomain = ['vipaz.com.br', 'www.vipaz.com.br'].includes(window.location.hostname);
const appPrefix = isVipazDomain ? '/juridico' : '';
const toPublicPath = (path: string) => appPrefix && path.startsWith('/') ? appPrefix + path : path;
const toInternalPath = (path: string) => appPrefix && (path === appPrefix || path.startsWith(appPrefix + '/')) ? (path.slice(appPrefix.length) || '/') : path;

function AppContent() {
  const [session, setSession] = useState<AuthSession | null>(authService.getSession());
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(authService.isInitialLoading());
  const [userWithoutOrg, setUserWithoutOrg] = useState<boolean>(authService.isUserWithoutOrg());
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return toInternalPath(window.location.pathname || '/');
  });

  // Listen for auth state changes from Supabase
  useEffect(() => {
    const unsubscribe = authService.subscribe((newSession) => {
      setSession(newSession);
      setIsLoadingAuth(authService.isInitialLoading());
      setUserWithoutOrg(authService.isUserWithoutOrg());
    });
    return unsubscribe;
  }, []);

  // Listen for browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(toInternalPath(window.location.pathname || '/'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate helper with history pushState
  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', toPublicPath(path));
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleSwitchTenant = (slug: string) => {
    try {
      authService.switchTenant(slug);
      navigate(`/app/${slug}`);
    } catch {
      // Ignora tentativa para tenant não autorizado
    }
  };

  // The legal workspace is mounted at /juridico on the institutional domain.
  // The root remains a separate institutional entry point.
  if (isVipazDomain && (window.location.pathname === '/' || window.location.pathname === '/index.html')) {
    return <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center"><h1 className="text-5xl font-bold">VIPAZ</h1><a className="mt-8 rounded-lg bg-cyan-600 px-6 py-3" href="/juridico">Acessar VIPAZ Jurídico</a></main>;
  }

  // Initial Auth Loading Screen
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-[#070C18] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-editorial text-2xl font-bold text-white">VIPAZ</span>
          <span className="text-xs uppercase tracking-widest font-semibold text-cyan-400 font-sans border-l border-slate-700 pl-2">
            Jurídico
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono-tech">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>Verificando credenciais e integridade da sessão...</span>
        </div>
      </div>
    );
  }

  // User Authenticated in Supabase but without active organization
  if (userWithoutOrg) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-[#070C18] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
        <div className="w-full max-w-md bg-white dark:bg-[#0B1325] border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white font-sans">
              Organização Não Localizada
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Seu usuário está autenticado, mas ainda não possui acesso a uma organização do VIPAZ Jurídico. Entre em contato com o administrador.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wider uppercase transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão / Voltar ao Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route 1: Landing Page
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage onNavigate={navigate} />;
  }

  // Route 2: Login Page
  if (currentPath === '/login') {
    if (session) {
      const target = `/app/${session.organization.slug}`;
      window.history.replaceState({}, '', toPublicPath(target));
      return (
        <AppShell
          currentPath={target}
          onNavigate={navigate}
          organization={session.organization}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <DashboardView organization={session.organization} onNavigate={navigate} />
        </AppShell>
      );
    }

    return (
      <LoginPage
        onLoginSuccess={(tenantSlug) => {
          navigate(`/app/${tenantSlug}`);
        }}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // Authenticated Area Protection: /app/*
  if (currentPath.startsWith('/app')) {
    if (!session) {
      window.history.replaceState({}, '', toPublicPath('/login'));
      return (
        <LoginPage
          onLoginSuccess={(tenantSlug) => {
            navigate(`/app/${tenantSlug}`);
          }}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    const currentOrg = session.organization;

    // Normalizes /app or /app/ without tenant to the user's active tenant
    if (currentPath === '/app' || currentPath === '/app/') {
      const target = `/app/${currentOrg.slug}`;
      window.history.replaceState({}, '', toPublicPath(target));
      return (
        <AppShell
          currentPath={target}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <DashboardView organization={currentOrg} onNavigate={navigate} />
        </AppShell>
      );
    }

    // Extract tenant slug from URL: /app/:slug/...
    const slugMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)/);
    const requestedSlug = slugMatch ? slugMatch[1] : '';

    // Validate tenant association in Supabase
    if (requestedSlug && !authService.hasAccessToTenant(requestedSlug)) {
      return (
        <div className="min-h-screen bg-slate-900 dark:bg-[#070C18] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 text-center selection:bg-cyan-500/30">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h1 className="text-xl font-bold font-sans text-white">Acesso Não Autorizado</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seu usuário não possui associação ativa com o ambiente da organização solicitada (<code className="text-rose-300 font-mono-tech font-bold">{requestedSlug}</code>).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => navigate(`/app/${currentOrg.slug}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
            >
              <span>Ir para {currentOrg.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Encerrar Sessão
            </button>
          </div>
        </div>
      );
    }

    // Match /app/:slug/geracoes/:id
    const geracoesMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/geracoes\/([a-zA-Z0-9_-]+)$/);
    if (geracoesMatch) {
      const jobId = geracoesMatch[2];
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <GeracaoView
            jobId={jobId}
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/caso/:id
    const casoMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/caso\/([a-zA-Z0-9_-]+)$/);
    if (casoMatch) {
      const caseId = casoMatch[2];
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <CaseWorkspaceView
            caseId={caseId}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/casos
    const casosMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/casos$/);
    if (casosMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <CasosListView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/biblioteca
    const bibliotecaMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/biblioteca$/);
    if (bibliotecaMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <BibliotecaView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/indicadores
    const indicadoresMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/indicadores$/);
    if (indicadoresMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <IndicadoresView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // VIPAZ Studio experimental workspace, accessible only to authenticated tenant members.
    const studioMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/studio$/);
    if (studioMatch) {
      return (
        <AppShell currentPath={currentPath} onNavigate={navigate} organization={currentOrg}
          user={session.user} onLogout={handleLogout} onSwitchTenant={handleSwitchTenant}>
          <StudioView />
        </AppShell>
      );
    }

    // Match /app/:slug/admin
    const adminMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/admin$/);
    if (adminMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <AdminToolsView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/nova-peca
    const novaPecaMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/nova-peca$/);
    if (novaPecaMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <NovaPecaView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug/documentos
    const documentosMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)\/documentos$/);
    if (documentosMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <DocumentosView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }

    // Match /app/:slug (Início)
    const dashboardMatch = currentPath.match(/^\/app\/([a-zA-Z0-9_-]+)$/);
    if (dashboardMatch) {
      return (
        <AppShell
          currentPath={currentPath}
          onNavigate={navigate}
          organization={currentOrg}
          user={session.user}
          onLogout={handleLogout}
          onSwitchTenant={handleSwitchTenant}
        >
          <DashboardView
            organization={currentOrg}
            onNavigate={navigate}
          />
        </AppShell>
      );
    }
  }

  // Fallback / 404 Route
  return (
    <div className="min-h-screen bg-slate-900 dark:bg-[#070C18] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 text-center">
      <div className="text-cyan-400 font-mono-tech text-xs uppercase tracking-wider">
        VIPAZ JURÍDICO
      </div>
      <h1 className="text-4xl font-bold font-sans">404 — Página não encontrada</h1>
      <p className="text-xs text-slate-400 max-w-sm">
        O endereço solicitado não existe ou você não possui autorização neste tenant.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
      >
        Voltar à página inicial
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
