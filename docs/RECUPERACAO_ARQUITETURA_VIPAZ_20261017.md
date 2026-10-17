# Recuperação da arquitetura VIPAZ — auditoria de integração (17/10/2026)

## Base protegida
- Branch de recuperação criada a partir de `main` (commit `66b841e5bdba391431016de4ebeb481fc2694a67`).
- Não aplicar merge indiscriminado das branches antigas, nem rollback de banco de dados.

## Constatações verificadas no GitHub
- `main/src/components/Sidebar.tsx` contém somente Início, Casos, Documentos, Biblioteca, Indicadores e Administração. Studio não consta na navegação.
- `main/src/App.tsx` já contém rota autenticada `/app/:slug/studio` e carrega `StudioView` experimental.
- `feat/studio-blocks-ux-20261015/src/views/StudioView.tsx` utiliza `StudioVisualEditor` e `inspectStudioStructure`, em contraste com a interface experimental publicada.
- `feat/studio-blocks-ux-20261015/src/components/StudioVisualEditor.tsx` inclui bindings, regras obrigatórias, diretas, condicionais e combinadas.
- `feat/studio-blocks-ux-20261015` divergiu de `main`: 59 commits à frente e 31 atrás do ancestral comum.
- `feat/vipaz-platform-home` divergiu de `main`: 53 à frente e 31 atrás.
- `feat/delivery-main-integration` está atrás de `main` e não possui commits à frente: o backend Delivery já teve integração parcial.
- `feat/delivery-mcp-quality-contract` divergiu de `main`: 88 à frente e 31 atrás. Não promover essa branch integralmente.

## Plano de recuperação sem regressão
1. Preservar autenticação, multi-organização, rotas e API Delivery atuais de `main`.
2. Reintroduzir navegação Matters/Casos, Studio, Library/Biblioteca e Delivery apenas com rotas reais e controles de acesso.
3. Recuperar seletivamente `StudioView`, `StudioVisualEditor`, `StudioModelConfigurator` e funções do `studioTemplateEngine`, reconciliando APIs e testes com `main`.
4. Verificar persistência, versionamento e aprovação de modelos no banco antes de declarar a Library pronta.
5. Conectar Delivery a casos, documentos e modelos aprovados, sem expor service_role no navegador.
6. Executar testes de build, editor DOCX, autenticação, isolamento por organização e endpoint de revisão antes do merge para `main`.

## Critérios de aceite
- Menus apontam para telas implementadas; nenhuma navegação para telas fictícias.
- Studio abre DOCX, inspeciona blocos e permite configuração visual sem perda silenciosa de formatação.
- Delivery utiliza modelos aprovados e exige revisão humana.
- API `/api/delivery/review` preserva respostas 401 para credenciais ausentes/inválidas.
- Nenhuma alteração destrutiva no Supabase.
