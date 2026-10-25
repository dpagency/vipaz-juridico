import React from 'react';
import { LayoutDashboard, FolderKanban, BookOpen, FilePenLine, Send, BarChart3, Settings2, Plus, LogOut, Scale, PanelLeftClose, PanelLeft, X } from 'lucide-react';
import { Organization, Profile } from '../types';
import { VipazLogo } from './VipazLogo';

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
    ['Matters', `/app/${slug}/casos`, Scale, (p:string)=>p.includes('/casos')||p.includes('/caso/')],
    ['Studio', `/app/${slug}/studio`, FilePenLine, (p:string)=>p.endsWith('/studio')],
    ['Library', `/app/${slug}/biblioteca`, BookOpen, (p:string)=>p.includes('/biblioteca')],
    ['Delivery', `/app/${slug}/nova-peca`, Send, (p:string)=>p.includes('/nova-peca')||p.includes('/geracoes/')],
    ['Documentos', `/app/${slug}/documentos`, FolderKanban, (p:string)=>p.includes('/documentos')],
    ['Indicadores', `/app/${slug}/indicadores`, BarChart3, (p:string)=>p.includes('/indicadores')],
  ] as const;
  const go=(path:string)=>{onNavigate(path);onCloseMobile();};

  return <>
    {isOpenMobile && <button aria-label="Fechar menu" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden" />}
    <aside className={`fixed lg:sticky top-0 lg:top-3 z-50 h-screen lg:h-[calc(100vh-1.5rem)] shrink-0 border-r lg:border vipaz-border-subtle bg-[var(--bg-surface)] lg:rounded-[16px] lg:overflow-hidden transition-[width,transform] duration-200 ${isCollapsed?'w-[76px]':'w-[252px]'} ${isOpenMobile?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
      <div className="h-full flex flex-col">
        <div className="h-20 px-5 flex items-center justify-between">
          <button onClick={()=>go(`/app/${slug}`)} className="flex min-w-0 items-center gap-3 text-left">
            <VipazLogo compact={isCollapsed}/>
          </button>
          {isOpenMobile ? <button onClick={onCloseMobile} className="lg:hidden p-2 vipaz-text-muted"><X className="w-4 h-4"/></button> :
          onToggleCollapse && <button onClick={onToggleCollapse} className="hidden lg:block p-2 vipaz-text-subtle hover:vipaz-text-primary" title={isCollapsed?'Expandir':'Recolher'}>{isCollapsed?<PanelLeft className="w-4 h-4"/>:<PanelLeftClose className="w-4 h-4"/>}</button>}
        </div>

        <div className="px-3 pb-5">
          <button onClick={()=>go(`/app/${slug}/nova-peca`)} className={`vipaz-button-primary w-full !rounded-lg ${isCollapsed?'px-0':''}`}>
            <Plus className="w-4 h-4"/>{!isCollapsed && <span>Iniciar no Delivery</span>}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map(([label,path,Icon,matches])=>{
            const active=matches(currentPath);
            return <button key={label} onClick={()=>go(path)} title={label} className={`w-full h-11 rounded-xl flex items-center gap-3 transition-colors ${isCollapsed?'justify-center px-0':'px-3'} ${active?'bg-[#111] text-white':'vipaz-text-muted hover:bg-[var(--bg-surface-subtle)] hover:vipaz-text-primary'}`}>
              <Icon className={`w-[17px] h-[17px] shrink-0 ${active?'text-[#20D7E8]':''}`}/>{!isCollapsed&&<span className="text-[12px] font-bold">{label}</span>}
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
