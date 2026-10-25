import React,{useEffect,useState} from 'react';
import { ArrowUpDown, Download, Eye, FileText, Search } from 'lucide-react';
import { Organization, GeneratedDocument } from '../types';
import { generationService } from '../services/generationService';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';
interface DocumentosViewProps { organization:Organization; onNavigate:(path:string)=>void; }
export const DocumentosView:React.FC<DocumentosViewProps>=({organization,onNavigate})=>{
 const [documents,setDocuments]=useState<GeneratedDocument[]>([]),[search,setSearch]=useState(''),[selectedDoc,setSelectedDoc]=useState<GeneratedDocument|null>(null),[sortAsc,setSortAsc]=useState(false);
 useEffect(()=>{generationService.listDocuments(organization.id,undefined,search).then(setDocuments)},[organization.id,search]);
 const sorted=[...documents].sort((a,b)=>sortAsc?+new Date(a.created_at)-+new Date(b.created_at):+new Date(b.created_at)-+new Date(a.created_at));
 return <WorkspacePage>
  <WorkspacePageHeader eyebrow={organization.name} title="Documentos" description="Peças produzidas e disponíveis no workspace." actions={<button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="vipaz-button-primary"><FileText className="w-4 h-4"/>Nova peça</button>}/>
  <div className="flex flex-col sm:flex-row gap-3 justify-between">
   <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3.5 w-4 h-4 vipaz-text-subtle"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar documentos" className="vipaz-input pl-10"/></div>
   <button onClick={()=>setSortAsc(v=>!v)} className="vipaz-button-secondary text-[11px]"><ArrowUpDown className="w-3.5 h-3.5"/>{sortAsc?'Mais antigos':'Mais recentes'}</button>
  </div>
  <div className="vipaz-card overflow-hidden">{sorted.length===0?<div className="p-12 text-center text-[12px] vipaz-text-muted">Nenhum documento encontrado.</div>:<div className="overflow-x-auto"><table className="w-full text-left text-[11px]">
   <thead className="border-b vipaz-border-subtle vipaz-text-subtle"><tr><th className="px-5 py-3 font-medium">Processo</th><th className="px-5 py-3 font-medium">Peça</th><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 text-right font-medium">Ações</th></tr></thead>
   <tbody>{sorted.map(doc=><tr key={doc.id} className="border-b last:border-0 vipaz-border-subtle hover:bg-[var(--bg-surface-subtle)]"><td className="px-5 py-4"><div className="font-medium">{doc.process_number}</div><div className="text-[9px] vipaz-text-subtle mt-1">{doc.metadata.court}</div></td><td className="px-5 py-4"><div className="font-medium">{doc.document_type}</div><div className="text-[9px] vipaz-text-subtle mt-1">{doc.metadata.subjects.join(' · ')}</div></td><td className="px-5 py-4 vipaz-text-muted">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</td><td className="px-5 py-4 text-right"><button onClick={()=>setSelectedDoc(doc)} className="inline-flex items-center gap-1 vipaz-text-muted hover:vipaz-text-brand"><Eye className="w-3.5 h-3.5"/>Visualizar</button><button onClick={()=>generationService.downloadDocument(doc,'docx')} className="ml-5 inline-flex items-center gap-1 font-medium vipaz-text-brand"><Download className="w-3.5 h-3.5"/>DOCX</button></td></tr>)}</tbody>
  </table></div>}</div>
  {selectedDoc&&<DocumentViewerModal document={selectedDoc} onClose={()=>setSelectedDoc(null)}/>}
 </WorkspacePage>;
};
