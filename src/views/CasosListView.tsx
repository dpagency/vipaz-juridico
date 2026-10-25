import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  Building2,
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Organization } from '../types';
import { HOMOLOGATED_CASE_WORKSPACE } from '../services/caseWorkspaceService';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';

interface CasosListViewProps {
  organization: Organization;
  onNavigate: (path: string) => void;
}

export const CasosListView: React.FC<CasosListViewProps> = ({
  organization,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [filterCourt, setFilterCourt] = useState('all');

  const cases = [HOMOLOGATED_CASE_WORKSPACE];

  const filteredCases = cases.filter((c) => {
    const term = search.toLowerCase();
    const matchSearch =
      c.process_number.toLowerCase().includes(term) ||
      c.client.toLowerCase().includes(term) ||
      c.opposing_party.toLowerCase().includes(term) ||
      c.court.toLowerCase().includes(term);

    const matchCourt = filterCourt === 'all' || c.court_type === filterCourt;
    return matchSearch && matchCourt;
  });

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow={organization.name}
        title="Matters"
        description="Organize processos, contexto e documentos em um único workspace."
        actions={
        <button
          onClick={() => onNavigate(`/app/${organization.slug}/nova-peca`)}
          className="vipaz-button-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Novo caso</span>
        </button>
        }
      />

      {/* Barra de Filtro e Busca */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por número do processo, parte, comarca..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCourt}
            onChange={(e) => setFilterCourt(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">Todas as Varas</option>
            <option value="Vara Cível">Vara Cível</option>
            <option value="Juizado Especial Cível">Juizado Especial Cível</option>
          </select>
        </div>
      </div>

      {/* Lista de Casos */}
      <div className="space-y-4">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            onClick={() => onNavigate(`/app/${organization.slug}/caso/${c.id}`)}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/60 dark:hover:border-cyan-500/40 transition cursor-pointer group space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono-tech font-bold text-sm text-slate-900 dark:text-white">
                  {c.process_number}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-medium">
                  {c.court_type}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{c.relevant_deadline}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Cliente (Demandado)
                </span>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {c.client}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Parte Adversa (Autor)
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                  {c.opposing_party}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Vara & Foro
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {c.court}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {c.pieces.length} peça em elaboração • {c.documents.length} documentos nos autos
              </span>

              <div className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Abrir caso</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </WorkspacePage>
  );
};
