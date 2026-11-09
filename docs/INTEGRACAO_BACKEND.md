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
