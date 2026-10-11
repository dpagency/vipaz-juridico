-- VIPAZ: auditoria somente leitura. Executar no SQL Editor do projeto correto.
-- Não cria nem modifica políticas.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('generation_jobs','legal_case_inputs','organization_members','generated_documents','source_documents')
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('generation_jobs','legal_case_inputs','organization_members','generated_documents','source_documents')
ORDER BY tablename, policyname;

-- Verificar existência e formato de colunas sem consultar dados de clientes.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('generation_jobs','legal_case_inputs','organization_members')
  AND column_name IN ('id','generation_job_id','organization_id','user_id','status')
ORDER BY table_name, ordinal_position;
