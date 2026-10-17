import { strict as assert } from 'node:assert';
import { createVipazSupabaseRepository } from '../vipazSupabaseRepository';
const repo = createVipazSupabaseRepository({
  supabaseUrl: 'https://example.supabase.co',
  anonKey: 'example-public-key',
  accessToken: 'invalid-test-token',
  loadExtractedPages: async () => [],
  loadApprovedTheses: async () => [],
});
await assert.rejects(repo.getExtractedPages('case'), /VIPAZ_JOB_NOT_AUTHORIZED/);
await assert.rejects(repo.getApprovedTheses('case'), /VIPAZ_JOB_NOT_AUTHORIZED/);
await assert.rejects(repo.getApprovedTemplate('not-uuid', '1', 'case'), /VIPAZ_INVALID_IDENTIFIER/);
await assert.rejects(repo.assertJobAccess('invalid-id', 'invalid-id'), /VIPAZ_INVALID_IDENTIFIER/);
console.log('VIPAZ Supabase repository: unauthorized and malformed access blocked');
