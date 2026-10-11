# Auditoria Supabase ao vivo — 11/10/2026

Projeto: `nlovhiejppgktfbxszkd` (VIPAZ Jurídico). Consultas **somente leitura** via integração Supabase.

## Confirmado
- Projeto `ACTIVE_HEALTHY`.
- RLS habilitada em `generation_jobs`, `legal_case_inputs`, `organization_members`, `generated_documents` e `source_documents`.
- `legal_case_inputs` tem três políticas reais:
  - `SELECT`: membro da organização.
  - `INSERT`: `user_id = auth.uid()` e papel `admin`, `senior_lawyer` ou `lawyer` na organização.
  - `UPDATE`: papel `admin`, `senior_lawyer` ou `lawyer` na organização.
- `legal_case_inputs` possui `organization_id`, `generation_job_id` e `user_id`.
- Linter do Supabase: seis funções `SECURITY DEFINER` executáveis por `anon` e `authenticated`; proteção de senhas vazadas desativada.

## Risco e interpretação
- O acesso de leitura dos snapshots é concedido a **todos os membros da organização**, não apenas ao autor. Confirmar se esse compartilhamento é desejado na política de confidencialidade.
- Funções `SECURITY DEFINER` expostas são superfície de ataque. As funções de verificação de organização consultadas usam `auth.uid()`, mas isso não dispensa revisão de privilégios e chamadas RPC.
- `handle_new_user` e `set_updated_at` são funções de trigger; revisar dependências antes de revogar `EXECUTE` a papéis da API.
- RLS ativada e políticas existentes não substituem testes negativos com dois usuários de organizações distintas.

## Ações seguintes
1. Revisar políticas das demais tabelas e permissões de Storage, inclusive downloads assinados.
2. Preparar migração reversível de privilégios das funções privilegiadas e testar em homologação antes de produção.
3. Ativar proteção de senhas vazadas pelo painel de Auth após revisar impacto.
4. Confirmar se todos os membros devem ler todos os casos de sua organização.
5. Executar testes reais de isolamento e integridade dos vínculos job/snapshot/documento.
6. Não ativar o motor n8n de alto custo para testar autenticação: usar respostas simuladas.

Referência do aviso: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
