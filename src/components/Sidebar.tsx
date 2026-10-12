import React from 'react';
import { LayoutDashboard, FolderKanban, BookOpen, BarChart3, Settings2, FileCode2, Plus, LogOut, Scale, PanelLeftClose, PanelLeft, X } from 'lucide-react';
import { Organization, Profile } from '../types';

interface SidebarProps {
  currentPath: string; onNavigate: (path: string) => void; organization: Organization;
  user: Profile | null; onLogout: () => void; onOpenTenantSwitcher: () => void;
  isOpenMobile: boolean; onCloseMobile: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath, onNavigate, organization, user, onLogout, onOpenTenantSwitcher,
  isOpenMobile, onCloseMobile, isCollapsed = false, onToggleCollapse,
}) => {
  const slug = organization.slug;
  const nav = [
    ['Início', `/app/${slug}`, LayoutDashboard, (p:string)=>p===`/app/${slug}`],
    ['Casos', `/app/${slug}/casos`, Scale, (p:string)=>p.includes('/casos')||p.includes('/caso/')],
    ['Documentos', `/app/${slug}/documentos`, FolderKanban, (p:string)=>p.includes('/documentos')],
    ['Biblioteca', `/app/${slug}/biblioteca`, BookOpen, (p:string)=>p.includes('/biblioteca')],
    ['VIPAZ Studio', `/app/${slug}/studio`, FileCode2, (p:string)=>p.endsWith('/studio')],
    ['Indicadores', `/app/${slug}/indicadores`, BarChart3, (p:string)=>p.includes('/indicadores')],
  ] as const;
  const go=(path:string)=>{onNavigate(path);onCloseMobile();};

  return <>
    {isOpenMobile && <button aria-label="Fechar menu" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden" />}
    <aside className={`fixed lg:sticky top-0 z-50 h-screen shrink-0 border-r vipaz-border-subtle bg-[var(--bg-surface)] transition-[width,transform] duration-200 ${isCollapsed?'w-[72px]':'w-[248px]'} ${isOpenMobile?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
      <div className="h-full flex flex-col">
        <div className="h-20 px-5 flex items-center justify-between">
          <button onClick={()=>go(`/app/${slug}`)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[var(--text-primary)] text-[var(--bg-surface)] font-editorial text-lg font-bold">V</span>
            {!isCollapsed && <div className="min-w-0"><div className="text-[15px] font-bold tracking-[-.02em]">VIPAZ <span className="font-medium vipaz-text-brand">Jurídico</span></div><div className="text-[10px] vipaz-text-subtle">Workspace jurídico</div></div>}
          </button>
          {isOpenMobile ? <button onClick={onCloseMobile} className="lg:hidden p-2 vipaz-text-muted"><X className="w-4 h-4"/></button> :
          onToggleCollapse && <button onClick={onToggleCollapse} className="hidden lg:block p-2 vipaz-text-subtle hover:vipaz-text-primary" title={isCollapsed?'Expandir':'Recolher'}>{isCollapsed?<PanelLeft className="w-4 h-4"/>:<PanelLeftClose className="w-4 h-4"/>}</button>}
        </div>

        <div className="px-3 pb-5">
          <button onClick={()=>go(`/app/${slug}/nova-peca`)} className={`vipaz-button-primary w-full ${isCollapsed?'px-0':''}`}>
            <Plus className="w-4 h-4"/>{!isCollapsed && <span>Nova peça</span>}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map(([label,path,Icon,matches])=>{
            const active=matches(currentPath);
            return <button key={label} onClick={()=>go(path)} title={label} className={`w-full h-10 rounded-[10px] flex items-center gap-3 transition-colors ${isCollapsed?'justify-center px-0':'px-3'} ${active?'bg-[var(--bg-surface-subtle)] vipaz-text-primary':'vipaz-text-muted hover:bg-[var(--bg-surface-subtle)] hover:vipaz-text-primary'}`}>
              <Icon className={`w-[17px] h-[17px] shrink-0 ${active?'vipaz-text-brand':''}`}/>{!isCollapsed&&<span className="text-[13px] font-medium">{label}</span>}
            </button>;
          })}
          <div className="my-3 border-t vipaz-border-subtle"/>
          <button onClick={()=>go(`/app/${slug}/admin`)} title="Administração" className={`w-full h-10 rounded-[10px] flex items-center gap-3 transition-colors ${isCollapsed?'justify-center':'px-3'} ${currentPath.includes('/admin')?'bg-[var(--bg-surface-subtle)] vipaz-text-primary':'vipaz-text-muted hover:bg-[var(--bg-surface-subtle)]'}`}>
            <Settings2 className="w-[17px] h-[17px]"/>{!isCollapsed&&<span className="text-[13px] font-medium">Administração</span>}
          </button>
        </nav>

        <div className="p-3 border-t vipaz-border-subtle">
          <button onClick={onOpenTenantSwitcher} title={organization.name} className={`w-full rounded-[12px] hover:bg-[var(--bg-surface-subtle)] transition p-2 ${isCollapsed?'flex justify-center':'text-left'}`}>
            {isCollapsed ? <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--bg-surface-muted)] text-xs font-semibold">{organization.name.charAt(0)}</span> :
            <div className="min-w-0"><div className="text-[12px] font-semibold truncate">{organization.name}</div><div className="text-[10px] vipaz-text-subtle truncate">{user?.full_name || 'Usuário'}</div></div>}
          </button>
          <div className={`mt-1 flex ${isCollapsed?'justify-center':'justify-between items-center px-2'}`}>
            {!isCollapsed && <span className="text-[10px] vipaz-text-subtle">Ambiente privado</span>}
            <button onClick={onLogout} className="p-2 vipaz-text-subtle hover:text-red-500 transition" title="Sair"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </div>
    </aside>
  </>;
};