# VIPAZ — bloqueios de segurança e custo para homologação

## Evidências observadas em 11/10/2026
- Motor n8n CAW: várias etapas usam o modelo `gpt-5.6-sol`, inclusive leitura de PDF, estruturação, redação, auditoria e revisão.
- Webhooks de geração e DOCX não exigem autenticação no n8n na versão examinada.
- O fluxo de IA jurídica já usa autenticação no webhook, mas deve ter sua configuração compatibilizada com o backend.
- A existência de RLS no repositório não prova que as políticas estejam instaladas no Supabase remoto.
- Os workflows examinados estavam desativados.

## Segurança: critérios obrigatórios
1. Executar `supabase/audits/vipaz_security_readonly.sql` no projeto de homologação e revisar RLS efetiva.
2. Confirmar acesso de `legal_case_inputs` apenas por membros autorizados da mesma organização.
3. Configurar webhooks n8n com credenciais Header Auth, com o **mesmo nome e valor de header** enviados pelo backend. A mera presença de `X-VIPAZ-Secret` no backend não protege o webhook.
4. Configurar URLs e segredos exclusivamente no ambiente do servidor; não usar prefixo `VITE_` para segredos.
5. Confirmar proteção contra jobs duplicados, reexecução e vazamento entre organizações.
6. Testar 401 sem token, 403 com outro usuário/tenant, 409 em job não pendente, 202 em job autorizado.
7. Testar renderização DOCX e download assinado usando dados fictícios.
8. Executar `npm run lint`, `npm test`, `npm run build` e teste de integração antes do merge.

## Redução de custo sem perda de qualidade
1. **Não executar o motor completo em cada edição**: separar preparação dos autos, redação e renderização.
2. Extrair texto de PDF localmente quando possível; usar OCR apenas em páginas digitalizadas. Preservar número de página e origem.
3. Criar um único dossiê estruturado por processo com fatos, alegações, decisões, evidências e lacunas. Reutilizar o dossiê nas etapas seguintes.
4. Aplicar seleção de teses e montagem documental determinísticas antes de chamar IA.
5. Consolidar as etapas de estruturação e planejamento quando a avaliação jurídica permitir; evitar múltiplas chamadas com o mesmo contexto.
6. Usar modelo mais econômico para tarefas delimitadas; reservar modelo mais capaz para análise difícil e auditoria de alto risco. Escolher modelos por teste de qualidade e preço **atual**, não apenas por nome.
7. Usar prompts com trechos recuperados e citações de páginas, em vez de reenviar o PDF completo repetidamente.
8. Instrumentar por job: modelo, tokens de entrada/saída, custo estimado, duração, etapa, tentativas e status. Não registrar conteúdo sensível em logs de telemetria.
9. Definir orçamento máximo por job e bloquear repetição automática cara; exigir aprovação para exceções.
10. Avaliar um conjunto de casos fictícios/anonimizados com revisão por advogado: fidelidade aos autos, completude, teses permitidas, ausência de fatos/jurisprudência inventados, clareza e formatação.

## Política de publicação
Sem testes e sem configuração dos webhooks/segredos, manter o PR como rascunho. Não ativar o workflow caro para testes de segurança: usar dados sintéticos e mocks.
