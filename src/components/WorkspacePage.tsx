import React from 'react';

interface WorkspacePageProps {
  children: React.ReactNode;
  className?: string;
}

interface WorkspacePageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function WorkspacePage({ children, className = '' }: WorkspacePageProps) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] space-y-8 animate-in fade-in duration-200 ${className}`}>
      {children}
    </div>
  );
}

export function WorkspacePageHeader({ eyebrow, title, description, actions }: WorkspacePageHeaderProps) {
  return (
    <header className="flex min-h-[142px] flex-col justify-between gap-6 border-b vipaz-border-subtle pb-6 sm:flex-row sm:items-end">
      <div className="max-w-3xl">
        <div className="vipaz-eyebrow mb-3">{eyebrow}</div>
        <h1 className="vipaz-page-title">{title}</h1>
        <p className="vipaz-page-description">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
