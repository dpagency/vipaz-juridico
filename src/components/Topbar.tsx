import React from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { Organization, Profile } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps { organization: Organization; user: Profile | null; onOpenTenantSwitcher: () => void; onToggleMobileMenu: () => void; }

export const Topbar: React.FC<TopbarProps> = ({ organization, user, onOpenTenantSwitcher, onToggleMobileMenu }) => (
  <header className="sticky top-0 z-30 h-16 vipaz-glass border-b vipaz-border-subtle px-5 sm:px-7 lg:px-8 flex items-center justify-between">
    <div className="flex items-center gap-3 min-w-0">
      <button onClick={onToggleMobileMenu} className="lg:hidden p-2 -ml-2 vipaz-text-muted" aria-label="Abrir navegação"><Menu className="w-5 h-5"/></button>
      <button onClick={onOpenTenantSwitcher} className="min-w-0 flex items-center gap-2 rounded-full border vipaz-border-subtle bg-[var(--bg-surface)] px-3 py-2 text-[11px] font-bold vipaz-text-secondary hover:vipaz-text-primary transition">
        <span className="h-2 w-2 rounded-full bg-[#20D7E8] ring-1 ring-black/20"/><span className="truncate max-w-[220px]">{organization.name}</span><ChevronDown className="w-3.5 h-3.5 vipaz-text-subtle"/>
      </button>
    </div>
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l vipaz-border-subtle">
        <div className="text-right"><div className="text-[11px] font-semibold">{user?.full_name || 'Usuário'}</div>{user?.oab && <div className="text-[9px] vipaz-text-subtle">{user.oab}</div>}</div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--bg-surface-muted)] text-[11px] font-bold">{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
      </div>
    </div>
  </header>
);
