import { supabase } from '../lib/supabase';
import { authService } from './authService';
import type { DocumentTemplate, DocumentType } from '../types';

export interface CompositionMap { schemaVersion: 2; template: string; bindings: unknown[] }

async function audit(organizationId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const user = authService.getCurrentUser();
  if (!user) throw new Error('Sessão expirada. Entre novamente.');
  const { error } = await supabase.from('audit_events').insert({ organization_id: organizationId, user_id: user.id, action, entity_type: entityType, entity_id: entityId, metadata });
  if (error) throw error;
}

export const legalProductionService = {
  async listTemplates(organizationId: string): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase.from('document_templates').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []) as DocumentTemplate[];
  },

  async saveTemplate(input: { organizationId: string; file: File; name: string; version: string; documentType: DocumentType; map: CompositionMap; submit?: boolean }): Promise<DocumentTemplate> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Sessão expirada. Entre novamente.');
    const templateId = crypto.randomUUID();
    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${input.organizationId}/${templateId}/${safeName}`;
    const { error: uploadError } = await supabase.storage.from('document-templates').upload(storagePath, input.file, { upsert: false, contentType: input.file.type || undefined });
    if (uploadError) throw uploadError;
    const record = {
      id: templateId, organization_id: input.organizationId, document_type: input.documentType,
      name: input.name.trim(), version: input.version.trim(), status: input.submit ? 'in_review' : 'draft',
      storage_path: storagePath, original_filename: input.file.name, mime_type: input.file.type,
      composition_map: input.map, rules_json: input.map, schema_version: 2, created_by: user.id,
    };
    const { data, error } = await supabase.from('document_templates').insert(record).select('*').single();
    if (error) { await supabase.storage.from('document-templates').remove([storagePath]); throw error; }
    await audit(input.organizationId, input.submit ? 'template.submitted' : 'template.saved', 'document_template', templateId, { version: input.version, document_type: input.documentType });
    return data as DocumentTemplate;
  },

  async setTemplateStatus(template: DocumentTemplate, status: 'in_review' | 'approved' | 'deprecated') {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Sessão expirada. Entre novamente.');
    const patch = status === 'approved' ? { status, approved_by: user.id, approved_at: new Date().toISOString() } : { status, approved_by: null, approved_at: null };
    const { error } = await supabase.from('document_templates').update(patch).eq('id', template.id).eq('organization_id', template.organization_id);
    if (error) throw error;
    await audit(template.organization_id, `template.${status}`, 'document_template', template.id, { version: template.version });
  },

  async bindGeneration(jobId: string, template: DocumentTemplate) {
    if (template.status !== 'approved') throw new Error('Somente modelos aprovados podem gerar peças.');
    const { error } = await supabase.from('generation_jobs').update({ template_id: template.id, template_version: template.version }).eq('id', jobId).eq('organization_id', template.organization_id);
    if (error) throw error;
    await audit(template.organization_id, 'generation.template_bound', 'generation_job', jobId, { template_id: template.id, version: template.version });
  },

  async reviewDocument(input: { organizationId: string; documentId: string; jobId: string; status: 'awaiting_review' | 'changes_requested' | 'approved' | 'rejected'; notes?: string }) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Sessão expirada. Entre novamente.');
    const { error } = await supabase.rpc('record_document_review', { p_organization_id: input.organizationId, p_document_id: input.documentId, p_job_id: input.jobId, p_status: input.status, p_notes: input.notes || null });
    if (error) throw error;
    await audit(input.organizationId, `document.${input.status}`, 'generated_document', input.documentId, { generation_job_id: input.jobId });
  },
};
