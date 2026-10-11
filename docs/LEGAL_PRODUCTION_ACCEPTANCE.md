# VIPAZ — Plano de homologação operacional de peças jurídicas

## Objetivo
Produzir uma contestação DOCX consistente e baixável a partir de dados estruturados, sem chamadas pagas de IA no caminho determinístico. Depois, testar IA seletiva com orçamento por peça.

## Linha de produção priorizada
1. **Entrada**: usuário autenticado cadastra processo, parte representada e documentos; guardar PDF em bucket privado.
2. **Dossiê**: estruturar fatos, pedidos, provas, datas e lacunas com referência a páginas; não afirmar dados não comprovados.
3. **Montagem**: reutilizar `assembleDocumentFromSnapshot` e `buildCawDocxPayload`, com blocos e teses autorizados; evitar IA na renderização.
4. **Renderização**: n8n/Carbone gera DOCX, registra `generated_documents`, backend confirma tenant/job e emite URL assinada.
5. **Controle de qualidade**: validar presença de identificação, narrativa, fundamentos, pedidos, correspondência de evidências e marcação de pendências; advogado revisa antes do protocolo.

## Cenários mínimos de teste
- Caso fictício completo: DOCX produzido, registrado e baixável.
- Caso com provas insuficientes: marcar lacunas; não inventar fatos ou jurisprudência.
- Caso sem snapshot: retornar erro explícito, sem conteúdo de exemplo.
- Documento registrado sem URL assinada: erro recuperável, não sucesso falso.
- Usuário de outra organização: acesso negado.
- Webhook indisponível: job preservado, erro compreensível e sem duplicação de custos.

## Política de custo
- Primeira homologação: **zero chamadas à OpenAI**; validar a montagem determinística.
- Somente depois habilitar análise assistida em amostras fictícias e por etapa, medindo tokens, latência, custo e taxa de correções humanas.
- Não reenviar PDF completo em cada etapa; reutilizar extração e trechos referenciados.
- Não executar redação, auditoria e revisão com modelos caros por padrão.
- Definir teto de custo por peça e modo sem IA; bloquear reexecuções automáticas caras.
- Não usar material confidencial em serviços de terceiros sem avaliação contratual e de proteção de dados.

## Bloqueios concretos antes de teste de ponta a ponta
- Webhook n8n DOCX autenticado e ativo em homologação, credencial Supabase Storage validada.
- Variáveis server-side configuradas.
- Um snapshot fictício persistido em `legal_case_inputs` e job compatível.
- Build, lint e testes passando.

## Métricas de aceite
- Documento íntegro e efetivamente baixável.
- Zero afirmações factuais não suportadas no cenário de teste.
- Blocos condicionais não convertidos em fatos provados.
- Custo de API OpenAI igual a zero no fluxo determinístico.
- Duração, erros e custo total de infraestrutura medidos por documento.
