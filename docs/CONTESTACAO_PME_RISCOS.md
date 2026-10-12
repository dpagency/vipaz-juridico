# Auditoria da biblioteca existente de contestação

**Arquitetura:** `src/domain/legal-engine/data/contestacao/architecture.ts`
**Blocos:** `src/domain/legal-engine/data/contestacao/blocks.ts`

## Risco de uso indevido
O bloco `addressing_and_qualification` identifica nominalmente **SUL AMÉRICA COMPANHIA DE SEGURO SAÚDE** e um CNPJ específico. A arquitetura é específica de reajuste de plano coletivo PME e não deve ser apresentada como modelo genérico de Direito do Consumidor.

## Controle exigido
Antes de aceitar uma contestação de outra natureza, criar arquitetura e biblioteca separadas, com qualificação parametrizada, campos obrigatórios e teses condicionadas à prova. Até lá, selecionar somente a arquitetura PME para o cenário PME homologado.

## Limitações da suíte atual
O teste DOCX existente prova montagem e formato do arquivo para um snapshot histórico, mas não prova adequação jurídica, atualização jurisprudencial, validação factual, download real via tenant nem a integridade do caso do usuário. Há fallback histórico para um ID fixo em `loadCaseSnapshot`; não usá-lo como substituto de persistência real na homologação ponta a ponta.

## Verificações obrigatórias antes do lançamento
- Revisão de privilégios `SECURITY DEFINER` e RLS no Supabase
- Teste de não vazamento entre organizações
- Homologação do armazenamento e do link assinado
- Teste do fluxo real com snapshot fictício persistido
- Avaliação jurídica independente da minuta gerada
