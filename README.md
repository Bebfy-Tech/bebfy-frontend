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
VITE_TENANT_SLUG=bebfybdteste
```

O slug `bebfybdteste` é apenas o identificador previsto para a distribuidora
de homologação. **Só funciona após o cadastro ser executado no banco de
homologação correspondente.** O cadastro não é aplicado automaticamente
pelo deploy deste frontend.

Para produção com subdomínios individuais, configure
`VITE_TENANT_BASE_DOMAIN=seudominio.com.br`, hospede o frontend
em `*.seudominio.com.br` com HTTPS e **não configure um
`VITE_TENANT_SLUG` fixo**, pois ele tem prioridade sobre o hostname.

## Telas e rotas

| Área | Rota | Funcionalidades |
| --- | --- | --- |
| Página inicial | `/` | Landing premium responsiva com animações e painel demonstrativo |
| Acesso loja | `/login` | Autenticação por operador/CPF |
| Primeiro acesso | `/primeiro-acesso` | Troca obrigatória da senha inicial |
| Painel da loja | `/dashboard` | KPIs, ranking e atalhos |
| Frente de caixa | `/pdv` | Pesquisa, fardos, pagamento dividido, fiado, delivery e recibo não fiscal |
| Vendas | `/vendas` | Histórico, detalhes, comprovantes e cancelamentos autorizados |
| Controle de caixas | `/caixas` | Abertura, extrato, sangria, suprimento e fechamento |
| Entregas | `/delivery` | Pedidos aguardando acerto |
| Produtos | `/produtos` | Cadastro, edição, preços, estoque e lotes por ficha |
| Categorias | `/categorias` | Cadastro e classificação |
| Lotes | `/lotes` | Entrada, datas de validade e histórico |
| Estoque | `/estoque` | Posição, alerta, entradas, ajustes e perdas |
| Clientes | `/clientes` | Cadastro, edição, limite de crédito |
| Fiados | `/fiados` | Histórico, saldo devedor e recebimentos |
| Vasilhames | `/vasilhames` | Empréstimo, devolução e extrato por cliente |
| Fornecedores | `/fornecedores` | Cadastro comercial |
| Financeiro | `/financeiro` | Contas a pagar/receber, conciliação manual e previsão |
| Relatórios | `/relatorios` | Indicadores e produtos mais vendidos |
| Funcionários | `/funcionarios` | Cadastro, código, senha inicial e permissões |
| Minha conta | `/configuracoes` | Perfil e alteração da própria senha |
| Acesso SaaS | `/saas/acesso` | Login de superadministrador autorizado pelo backend |
| Gestão SaaS | `/saas/painel` | Empresas, planos, status e módulos por cliente |

## Segurança e multi-tenant

- A API identifica a distribuidora pelo cabeçalho `x-tenant`, derivado do
  subdomínio, da configuração local ou de um login SaaS explicitamente informado.
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
