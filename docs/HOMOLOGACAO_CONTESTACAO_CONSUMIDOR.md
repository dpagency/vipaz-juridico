# Homologação-piloto — Contestação em Direito do Consumidor

## Escopo real encontrado
A arquitetura disponível é `arch_contestacao_pme_v1`, específica de contestação de reajustes de plano de saúde coletivo empresarial (PME), com texto de qualificação da SulAmérica e teses de regulação de saúde suplementar. **Não é modelo genérico de contestação consumerista.** Não reutilizar para outro fornecedor ou litígio sem revisão e parametrização.

## Três portas de aceite
1. **Adequação do modelo:** confirmar expressamente que a parte defendida, contrato, matéria e pedidos correspondem ao caso; se não corresponderem, bloquear o uso da arquitetura PME e elaborar arquitetura consumerista específica, sem transportar identificação de terceiros.
2. **Integridade determinística:** gerar DOCX a partir de snapshot fictício validado, sem chamadas de IA; verificar endereçamento, partes, fatos, fundamentos, pedidos, variáveis não resolvidas, blocos não homologados, repetição e arquivo editável.
3. **Fluxo real e segurança:** validar autenticação, organização, snapshot persistido, job, download, isolamento entre tenants e falhas recuperáveis; exigir revisão jurídica antes de qualquer protocolo.

## Checklist jurídico da contestação
- [ ] Identificação do processo, juízo, réu e autor conferida
- [ ] Prazo e tempestividade conferidos por profissional
- [ ] Narrativa fática vinculada a documentos e respectivas páginas
- [ ] Preliminares e impugnações selecionadas somente quando cabíveis
- [ ] Impugnação específica aos fatos e pedidos da inicial
- [ ] Fundamentos legais e precedentes verificados em fontes oficiais
- [ ] Pedidos finais compatíveis com teses efetivamente sustentadas
- [ ] Ausência de dados reais nos testes automatizados
- [ ] Revisão e aprovação por advogado responsável

## Bloqueios de publicação
Não homologar um documento por mero sucesso de build ou criação do DOCX. Bloquear a aprovação se houver variáveis `{{...}}`, blocos não homologados, dados de parte fixa incompatíveis, fatos não comprovados, referências não verificadas ou acesso entre organizações.

## Evolução de fidelidade visual
O renderizador determinístico passa a utilizar propriedades de tema para tamanho da fonte, cores e quatro margens de página. A validação OOXML verifica essas propriedades, mas **não certifica identidade de paginação com o documento de referência**. Comparação visual humana ainda obrigatória.
