# Bebfy — Frontend SaaS para distribuidoras de bebidas

Frontend responsivo do Bebfy, integrado ao backend NestJS na branch
`refactor/codigo-chatgpt`. Desenvolvido em **React 19, TypeScript 6,
Vite 8, Tailwind CSS 4 e Axios**. Interface e mensagens em português do Brasil.

## Primeiros passos

Pré-requisitos: Node.js suportado pelo Vite 8, npm e backend NestJS
funcionando em um ambiente com banco PostgreSQL preparado.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Edite o `.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

## Endereços públicos definidos

- `https://bebfy.com.br/`: landing page principal.
- `https://bebfy.com.br/acessar`: campo para localizar uma distribuidora.
- `https://bebfy.com.br/bebfybdteste`: login da distribuidora de homologação.
- `https://bebfy.com.br/bebfybdteste/dashboard`: painel de sua loja depois do login.
- `https://bebfy.com.br/SaaS/admin`: login da administração SaaS.
- `https://bebfy.com.br/SaaS/painel`: painel global protegido por superadmin.

Uma nova empresa com slug `distribuidora-nova` recebe o acesso
`https://bebfy.com.br/distribuidora-nova` sem configurar DNS individual.
A navegação interna sempre inclui o slug no caminho, e as requisições para
NestJS enviam `x-tenant` derivado desse caminho. A autorização do
administrador SaaS continua protegida pelo backend.

**A hospedagem deve permitir fallback SPA para `index.html` em todas
as rotas React e apontar `bebfy.com.br` para o frontend.** O DNS,
o certificado HTTPS, a API e o banco de dados ainda devem ser
configurados no serviço de hospedagem escolhido. Esta alteração no código
não publica o domínio nem cria a empresa no banco real.

`VITE_TENANT_SLUG` não deve ser configurada na hospedagem central.

## Telas e rotas

| Área | Rota | Funcionalidades |
| --- | --- | --- |
| Página inicial | `/` | Landing premium responsiva com animações e painel demonstrativo |
| Acesso loja | `/{loja}` | Autenticação por operador/CPF |
| Primeiro acesso | `/{loja}/primeiro-acesso` | Troca obrigatória da senha inicial |
| Painel da loja | `/{loja}/dashboard` | KPIs, ranking e atalhos |
| Frente de caixa | `/{loja}/pdv` | Pesquisa, fardos, pagamento dividido, fiado, delivery e recibo não fiscal |
| Vendas | `/{loja}/vendas` | Histórico, detalhes, comprovantes e cancelamentos autorizados |
| Controle de caixas | `/{loja}/caixas` | Abertura, extrato, sangria, suprimento e fechamento |
| Entregas | `/{loja}/delivery` | Pedidos aguardando acerto |
| Produtos | `/{loja}/produtos` | Cadastro, edição, preços, estoque e lotes por ficha |
| Categorias | `/{loja}/categorias` | Cadastro e classificação |
| Lotes | `/{loja}/lotes` | Entrada, datas de validade e histórico |
| Estoque | `/{loja}/estoque` | Posição, alerta, entradas, ajustes e perdas |
| Clientes | `/{loja}/clientes` | Cadastro, edição, limite de crédito |
| Fiados | `/{loja}/fiados` | Histórico, saldo devedor e recebimentos |
| Vasilhames | `/{loja}/vasilhames` | Empréstimo, devolução e extrato por cliente |
| Fornecedores | `/{loja}/fornecedores` | Cadastro comercial |
| Financeiro | `/{loja}/financeiro` | Contas a pagar/receber, conciliação manual e previsão |
| Relatórios | `/{loja}/relatorios` | Indicadores e produtos mais vendidos |
| Funcionários | `/{loja}/funcionarios` | Cadastro, código, senha inicial e permissões |
| Minha conta | `/{loja}/configuracoes` | Perfil e alteração da própria senha |
| Acesso SaaS | `/SaaS/admin` | Login de superadministrador autorizado pelo backend |
| Gestão SaaS | `/SaaS/painel` | Empresas, planos, status e módulos por cliente |

## Segurança e multi-tenant

- A API identifica a distribuidora pelo cabeçalho `x-tenant`, derivado do
  primeiro segmento da URL ou de um login SaaS explicitamente informado.
- Sessões JWT são verificadas no servidor, com uma sessão válida por usuário.
  Havendo sessão ativa, o segundo login exige confirmação para expulsar a anterior.
- Funcionários com senha inicial são obrigados a trocá-la no primeiro acesso.
  **Jamais usar senhas universais curtas em lojas reais.**
- Cadastro de funcionários e financeiro requerem cargos de gestão.
  A permissão real é determinada no backend, não por esconder botões.
- Módulos desativados no backend retornam 403. A aplicação exibe a mensagem
  sem criar acesso alternativo.
- O painel SaaS exige autorização global via `SAAS_ADMIN_USER_IDS` configurado
  no servidor. Esse valor **nunca** deve ir para o frontend.
- Dados pessoais como CPF/CNPJ não estão totalmente criptografados no banco
  legado; ver documentação de segurança do backend.

## Limitações intencionais

- **Sem emissão NF-e/NFC-e**. Os comprovantes são expressamente não fiscais.
- PIX/cartão são registros manuais: não confirmam transações em gateway,
  adquirente ou banco.
- Sem assinatura recorrente e cobrança online de planos; o SaaS permite
  cadastrar planos e atribuí-los às empresas.
- Sem captura de códigos de barras por câmera, integração ESC/POS,
  CSV/Excel, gráficos temporais avançados ou upload de fotos de produtos.
  Essas funções exigem componentes/endpoints e homologação próprios.
- Backend mantém alguns nomes de módulos futuros no catálogo, mas nem todos
  estão operacionalmente implementados. Não comercialize recursos apenas
  porque o seu toggle aparece no SaaS.
- A landing usa fotografias externas; para produção substitua por mídia
  licenciada e otimizada hospedada sob seu controle.

## Validação

```bash
npm run build
```

O GitHub Actions valida TypeScript e Vite a cada commit da branch.
A compilação não substitui os testes de integração em navegador.

Para homologação, verifique em computadores e celulares:
login, primeiro acesso, expulsão de sessão, tenant errado, módulo desativado,
permissões por cargo, todas as operações CRUD, pagamento misto, fiado,
lotes, caixa, comprovantes, receitas/despesas, SaaS e carregamento em
internet lenta. Testar em banco **de homologação**, nunca com dados
reais sem autorização. Não executar merge/deploy automaticamente.

### Repositórios

- Backend: `Bebfy-Tech/bebfy-backend`, branch `refactor/codigo-chatgpt`
- Frontend: `Bebfy-Tech/bebfy-frontend`, branch
  `refactor/conexao-backend-chatgpt`
