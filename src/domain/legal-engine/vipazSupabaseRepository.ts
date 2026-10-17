import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VipazApprovedTemplateBlock } from './vipazReviewedDocxRenderer';
import type { VipazApprovedThesis, VipazPage } from './vipazMcpQualityTools';
import type { VipazTrustedCaseRepository } from './vipazProductionPipeline';

export type VipazTrustedRepositoryOptions = {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  /** Approved, page-indexed PDF extraction must be supplied by a trusted backend. */
  loadExtractedPages?: (processId: string, organizationId: string) => Promise<VipazPage[]>;
  /** Approved, versioned thesis registry must be supplied by a trusted backend. */
  loadApprovedTheses?: (processId: string, organizationId: string) => Promise<VipazApprovedThesis[]>;
};
type AuthorizedContext = { organizationId: string; processId: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireUuid(value: string): void {
  if (!UUID.test(value)) throw new Error('VIPAZ_INVALID_IDENTIFIER');
}
/**
 * Uses the caller's JWT and Supabase RLS; never uses service_role.
 * The callbacks are explicit because production does not yet contain
 * a verified page-extraction index or a versioned thesis registry.
 */
export function createVipazSupabaseRepository(options: VipazTrustedRepositoryOptions): VipazTrustedCaseRepository {
  const client: SupabaseClient = createClient(options.supabaseUrl, options.anonKey, {
    global: { headers: { Authorization: 'Bearer ' + options.accessToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorized = new Map<string, AuthorizedContext>();
  async function context(processId: string): Promise<AuthorizedContext> {
    const result = authorized.get(processId);
    if (!result) throw new Error('VIPAZ_JOB_NOT_AUTHORIZED');
    return result;
  }
  return {
    async assertJobAccess(jobId, processId) {
      requireUuid(jobId);
      requireUuid(processId);
      const { data: identity, error: identityError } = await client.auth.getUser(options.accessToken);
      if (identityError || !identity.user) throw new Error('VIPAZ_UNAUTHENTICATED');
      const { data: job, error } = await client.from('generation_jobs')
        .select('id,organization_id,process_id,user_id')
        .eq('id', jobId).eq('process_id', processId).maybeSingle();
      if (error || !job || job.user_id !== identity.user.id) throw new Error('VIPAZ_JOB_NOT_AUTHORIZED');
      const { data: member, error: memberError } = await client.from('organization_members')
        .select('user_id').eq('organization_id', job.organization_id).eq('user_id', identity.user.id).maybeSingle();
      if (memberError || !member) throw new Error('VIPAZ_JOB_NOT_AUTHORIZED');
      authorized.set(processId, { organizationId: job.organization_id, processId });
    },
    async getApprovedTemplate(templateId, version, processId) {
      requireUuid(templateId);
      const ctx = await context(processId);
      const { data, error } = await client.from('document_templates')
        .select('id,organization_id,version,status,rules_json')
        .eq('id', templateId).eq('organization_id', ctx.organizationId)
        .eq('version', version).eq('status', 'approved').maybeSingle();
      if (error || !data || !Array.isArray(data.rules_json)) return null;
      const rules = data.rules_json as VipazApprovedTemplateBlock[];
      if (rules.some(rule => !rule || typeof rule.blockId !== 'string' || typeof rule.kind !== 'string')) return null;
      return rules;
    },
    async getExtractedPages(processId) {
      const ctx = await context(processId);
      const pages = options.loadExtractedPages
        ? await options.loadExtractedPages(processId, ctx.organizationId)
        : await (async () => {
          const { data, error } = await client.from('vipaz_extracted_pages')
            .select('source_document_id,page_number,content')
            .eq('organization_id', ctx.organizationId).eq('process_id', processId)
            .order('page_number', { ascending: true });
          if (error) throw new Error('VIPAZ_PAGES_NOT_AVAILABLE');
          return (data ?? []).map(row => ({ documentId: row.source_document_id, page: row.page_number, text: row.content }));
        })();
      if (!Array.isArray(pages)) throw new Error('VIPAZ_PAGES_NOT_AVAILABLE');
      return pages;
    },
    async getApprovedTheses(processId) {
      const ctx = await context(processId);
      const theses = options.loadApprovedTheses
        ? await options.loadApprovedTheses(processId, ctx.organizationId)
        : await (async () => {
          const { data, error } = await client.from('vipaz_approved_theses')
            .select('id,title,version').eq('organization_id', ctx.organizationId).eq('status', 'approved');
          if (error) throw new Error('VIPAZ_THESES_NOT_AVAILABLE');
          return (data ?? []).map(row => ({ id: row.id, title: row.title, sourceVersion: row.version }));
        })();
      if (!Array.isArray(theses)) throw new Error('VIPAZ_THESES_NOT_AVAILABLE');
      return theses;
    },
  };
}
