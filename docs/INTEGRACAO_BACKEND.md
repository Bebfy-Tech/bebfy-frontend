# Bebfy — React conectado ao backend NestJS

A branch `refactor/conexao-backend-chatgpt` preserva o código atual do frontend e
prepara os contratos tipados para desenvolver Dashboard, PDV, Estoque e Clientes.
O backend correspondente é `Bebfy-Tech/bebfy-backend`,
branch `refactor/codigo-chatgpt`.

## Configuração local

1. Configure PostgreSQL e as variáveis do backend em `DATABASE_URL`,
   `JWT_SECRET` e `FRONTEND_URL=http://localhost:5173`.
2. No frontend, copie `.env.example` para `.env.local`.
3. Configure **VITE_TENANT_SLUG** com o subdomínio/slug de uma empresa **existente**.
4. Instale dependências com `npm ci` e inicie o frontend com `npm run dev`.
5. O frontend usa `VITE_API_URL=http://localhost:3000` por padrão.

Para um único frontend atendendo várias distribuidoras, configure também
`VITE_TENANT_BASE_DOMAIN=bebfy.com.br`. O slug passa a ser reconhecido
automaticamente em `loja.bebfy.com.br`. Os hosts reservados `api`, `app` e
`www` não são interpretados como lojas. Em desenvolvimento, mantenha
`VITE_TENANT_SLUG` para escolher a empresa de teste.

O cliente HTTP `src/services/api.ts` envia automaticamente o JWT em
`Authorization: Bearer ...` e o slug no cabeçalho `x-tenant`. Na primeira
autenticação, não existe JWT: portanto o `x-tenant` deve ser definido antes
do login. Não confunda o slug da loja com o ID numérico da empresa.

## Contratos disponíveis

Os serviços tipados ficam em `src/services/bebfy.ts`.

| Tela | Método | API |
| --- | --- | --- |
| Login | `login` no AuthContext | `POST /auth/login` |
| Sessão | `GET` | `/auth/perfil` |
| Supervisor | `validarGerente` no AuthContext | `POST /auth/validar-gerente` |
| Dashboard | `bebfy.dashboard()` | `GET /relatorios/dashboard` |
| Produtos | `bebfy.produtos.listar/buscar/codigoBarras/detalhe` | `/produtos/*` |
| Clientes | `bebfy.clientes.listar/detalhe` | `/clientes/*` |
| Caixa | `bebfy.caixa.abrir/fechar/listar/abertoPorOperador/extrato` | `/caixa/*` |
| PDV | `bebfy.vendas.registrar/listar/detalhe/cancelar` | `/vendas/*` |
| Comprovante | `bebfy.vendas.comprovante(id)` | `GET /vendas/:id/comprovante` |

O endpoint de comprovante retorna JSON em vez de PDF, permitindo um componente
React específico para impressão em 58 mm ou 80 mm com CSS. Ele se identifica
como **COMPROVANTE NÃO FISCAL**. Não são emitidas NF-e, NFC-e ou DANFE.
**Não usar logotipos, numerações ou layout que sugiram documento fiscal.**

## Integração do operador

Após login, `AuthContext` guarda usuário, distribuidora e token. Ao carregar
uma sessão persistida, consulta `/auth/perfil`; em caso de 401, o interceptador
remove a sessão e redireciona para `/login`. O backend é a autoridade para
cargos/permissões. Ocultar botões no frontend não substitui autorização da API.

Para o PDV, envie `NovaVenda` com preços e pagamentos numéricos. O cálculo
monetário deve ser revisado de acordo com regras finais de preços e alçadas.
Não tente emitir documentos fiscais a partir do comprovante interno.

## Acompanhamento

O workflow de frontend executa `npm ci` e `npm run build`. O backend executa
testes automatizados e integração com PostgreSQL 16. Antes do lançamento real,
executar homologação cruzada de API e UI com dados de teste, política de
precificação e migração segura do banco de produção.


## Telas iniciais implementadas

- `/dashboard` consulta `GET /relatorios/dashboard` e exibe faturamento, vendas,
  fiado, produtos mais vendidos e caixas abertos, com estados de carregamento/erro.
- `/pdv` obtém produtos da empresa, consulta/abre o caixa do operador, pesquisa
  por código de barras ou nome, monta carrinho, registra venda com pagamento
  simples e recupera o comprovante **não fiscal** para impressão pelo navegador.
- `/login` já usa `x-tenant` e o serviço de autenticação.

**Limites do primeiro PDV:** não suporta pagamentos divididos, fiado (requer
seleção de cliente), fardos, descontos aprovados por supervisor, cancelamento,
fechamento de caixa ou impressoras térmicas ESC/POS diretamente. Esses fluxos
precisam das interfaces específicas e de homologação de ponta a ponta.
No momento PIX e cartão representam registros de pagamento informados pelo
operador; **não há integração com adquirentes nem confirmação automática**.

Os workflows validam compilação TypeScript/Vite, mas ainda não realizam testes
automatizados de interface em navegador real.


## Landing page pública e administração SaaS

A rota `/` agora mostra a landing page responsiva `src/pages/LandingPage.tsx`,
com vitrine ilustrativa em 3D CSS, efeitos sutis de movimento, seções
comerciais, FAQ, imagens externas do Unsplash e acesso à plataforma.
Todo o conteúdo demonstrativo do gráfico é ilustrativo, não estatísticas reais
de clientes. O sistema não emite NF-e ou NFC-e nesta fase.

### Acesso do proprietário do SaaS

- Acesse `/saas/acesso`.
- Informe o **slug da distribuidora vinculada ao usuário administrador**,
  código/CPF e senha. O endpoint `POST /auth/login` usa `x-tenant` para
  identificar a empresa inicial.
- O cliente testa `GET /saas/admin/empresas` para confirmar a autorização
  global; o backend usa `SAAS_ADMIN_USER_IDS` com o **UUID do usuário**.
  Ter cargo `PROPRIETARIO` em uma distribuidora não é suficiente.
- Se autorizado, o usuário acessa `/saas/painel`.

### Telas administrativas disponíveis

- Visão geral: empresas cadastradas, ativas, em teste, distribuição por status
  e **receita mensal potencial** obtida da soma dos valores dos planos.
  Isso **não equivale a mensalidades efetivamente recebidas**.
- Distribuidoras: pesquisa, filtro, cadastro com proprietário inicial,
  painel detalhado, troca de status e troca de plano.
- Planos: listagem, criação e edição (tipo, nome e preço mensal).
  O backend não executa a cobrança recorrente.
- Módulos: catálogo com os nomes do Prisma, atribuição de permissões por
  empresa e indicação de quais estão ativos. Para `CAIXA_PDV`, `FIADOS`,
  `VASILHAMES_RETORNAVEIS`, `ESTOQUE_LOTES` e
  `COMPRAS_FORNECEDORES`, o backend já bloqueia rotas correspondentes
  quando a empresa possui o módulo explicitamente desativado.
  Os demais módulos futuros ainda precisam de implementação específica,
  mesmo que suas atribuições possam ser registradas.

### Configuração de backend

```env
JWT_SECRET=uma-chave-forte-com-mais-de-32-caracteres
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:5173
SAAS_ADMIN_USER_IDS=uuid-do-usuario-admin-da-plataforma
```

Configure `SAAS_ADMIN_USER_IDS` diretamente no servidor, nunca no
`.env` Vite. Não expor UUIDs autorizados, senhas ou segredos no frontend.
As rotas administrativas permanecem protegidas por JWT e autorização
servidor; um link ou botão escondido não concede segurança.

## Homologação recomendada antes do deploy público

Testar em celular e desktop, autenticação e expiração de sessão,
cadastro de planos e empresas, alterações de módulo, acesso negado
para operadores comuns, bloqueio real de módulos e migrações em banco
de homologação. O pipeline atual cobre build e integrações de backend,
mas não substitui testes visuais em navegador.


## Primeiro acesso e proteção contra login simultâneo

A autenticação agora pode retornar `{ trocaSenhaObrigatoria: true, tokenTroca }`.
O frontend encaminha para `/primeiro-acesso`, onde o funcionário informa
a senha temporária atual, a nova senha e a confirmação. A API valida e,
após alterar a senha, entrega o primeiro JWT de sessão normal.

Se um login retornar HTTP **409** com código `SESSAO_ATIVA`, as telas
`/login` e `/saas/acesso` apresentam os botões **Não** e **Sim, acessar**.
Não mantém a sessão anterior; Sim envia `assumirSessao: true` com
credenciais verificadas. O backend invalida imediatamente o JWT anterior.

O cliente valida o JWT a cada 15 segundos e ao retornar à aba; quando
o servidor retornar 401, volta ao login. Nenhuma senha temporária é salva
no localStorage. Antes de publicar, valide o fluxo em dois computadores.

Para testes, o subdomínio planejado é `bebfybdteste`. É um slug de
homologação, não um domínio DNS publicado automaticamente. Veja o script
de cadastro do backend e as orientações de infraestrutura em
`docs/EMPRESA_TESTE.md` do repositório backend.

**A credencial inicial curta 12345 só é permitida por opção explícita
em banco de testes isolado**, nunca automaticamente para todos os
clientes reais.
