import React, { useState } from 'react';
import { Organization, Profile } from '../types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TenantSwitcherModal } from './TenantSwitcherModal';

interface AppShellProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  organization: Organization;
  user: Profile | null;
  onLogout: () => void;
  onSwitchTenant: (slug: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children, currentPath, onNavigate, organization, user, onLogout, onSwitchTenant,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('vipaz_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleCollapse = () => setIsCollapsed(prev => {
    const next = !prev;
    try { localStorage.setItem('vipaz_sidebar_collapsed', String(next)); } catch {}
    return next;
  });

  return (
    <div className="vipaz-app min-h-screen flex p-0 lg:p-3 lg:gap-3">
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        organization={organization}
        user={user}
        onLogout={onLogout}
        onOpenTenantSwitcher={() => setIsTenantModalOpen(true)}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="min-w-0 flex-1 flex flex-col lg:rounded-[20px] lg:overflow-hidden lg:border vipaz-border-subtle bg-[var(--bg-app)]">
        <Topbar
          organization={organization}
          user={user}
          onOpenTenantSwitcher={() => setIsTenantModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileOpen(v => !v)}
        />
        <main className="flex-1 w-full">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-7 sm:py-8 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      {isTenantModalOpen && (
        <TenantSwitcherModal
          currentOrg={organization}
          onSelectOrg={(slug) => {
            onSwitchTenant(slug);
            onNavigate(`/app/${slug}`);
          }}
          onClose={() => setIsTenantModalOpen(false)}
        />
      )}
    </div>
  );
};
