import { expect, test } from '@playwright/test';

const SLUG = 'bebfybdteste';
const SENHA_INICIAL = '12345';
const SENHA_ROTACIONADA = 'SenhaForte!Bebfy2026';
const API = process.env.E2E_API_URL || 'http://localhost:3000';

async function entrar(page: import('@playwright/test').Page, senha: string) {
  await page.goto('/'+SLUG);
  await page.getByPlaceholder('Ex: 1, 10').fill('1');
  await page.locator('input[type="password"]').first().fill(senha);
  await page.getByRole('button', { name: 'Autenticar no Bebfy' }).click();
}

test('fluxo integrado: primeira senha, CRUD, API, sessão única e gestão SaaS', async ({ browser, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'A jornada de ativação ocorre uma única vez no banco temporário.');
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await contextA.newPage();

  await a.goto('/');
  await expect(a.locator('body')).toContainText(/Bebfy|bebfy/i);

  await a.goto('/acessar');
  await a.getByLabel('Identificador da loja').fill(SLUG);
  await a.getByRole('button', { name: 'Continuar' }).click();
  await expect(a).toHaveURL(new RegExp('/'+SLUG+'$'));
  await entrar(a, SENHA_INICIAL);
  await expect(a.getByText('Defina sua senha pessoal')).toBeVisible();
  await expect(a).toHaveURL(/primeiro-acesso/);
  const troca = a.locator('input[type="password"]');
  await troca.nth(0).fill('senha-errada');
  await troca.nth(1).fill(SENHA_ROTACIONADA);
  await troca.nth(2).fill(SENHA_ROTACIONADA);
  await a.getByRole('button', { name: 'Salvar senha e acessar' }).click();
  await expect(a.getByRole('alert')).toContainText(/inválid|incorret|senha/i);
  await expect(a).toHaveURL(/primeiro-acesso/);
  // Invalid current password must not kick the user back to the login page.
  await troca.nth(0).fill(SENHA_INICIAL);
  await a.getByRole('button', { name: 'Salvar senha e acessar' }).click();
  await expect(a).toHaveURL(new RegExp('/'+SLUG+'/dashboard'));
  await expect(a.getByRole('heading', { name: 'Visão geral' })).toBeVisible();

  const tokenAnterior = await a.evaluate(() => localStorage.getItem('@Bebfy:token'));
  expect(tokenAnterior).toBeTruthy();

  // The browser uses the same x-tenant and bearer contract as the NestJS API.
  const perf = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(perf.status()).toBe(200);
  const outroTenant = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': 'loja-inexistente', Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(outroTenant.status()).toBeGreaterThanOrEqual(400);

  await a.goto('/'+SLUG+'/categorias');
  await expect(a.getByRole('heading', { name: 'Categorias' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cervejas QA Browser');
  await a.locator('#cadastro-descricao').fill('Categoria exclusiva de homologação automatizada');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.locator('table').getByText('Cervejas QA Browser')).toBeVisible();

  await a.goto('/'+SLUG+'/produtos');
  await expect(a.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cerveja Teste Playwright 350ml');
  await a.locator('#cadastro-precoVendaVarejo').fill('12.50');
  await a.locator('#cadastro-estoqueAtual').fill('30');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Cerveja Teste Playwright 350ml')).toBeVisible();

  await a.goto('/'+SLUG+'/clientes');
  await expect(a.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cliente QA Playwright');
  await a.locator('#cadastro-limiteCredito').fill('250');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Cliente QA Playwright')).toBeVisible();

  // Exercise backend/frontend suppliers contract including previously missing
  // inscrição estadual and address columns; check edit round-trip.
  await a.goto('/'+SLUG+'/fornecedores');
  await expect(a.getByRole('heading', { name: 'Fornecedores' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-razaoSocial').fill('Distribuidora Fornecedor QA');
  await a.locator('#cadastro-cnpj').fill('00000000000199');
  await a.locator('#cadastro-inscricaoEstadual').fill('IE-TESTE-001');
  await a.locator('#cadastro-endereco').fill('Rua QA, 123');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Distribuidora Fornecedor QA')).toBeVisible();
  const suppliersResponse = await request.get(API+'/fornecedores', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(suppliersResponse.status()).toBe(200);
  const supplier = (await suppliersResponse.json() as Array<{
    razaoSocial:string;endereco:string;inscricaoEstadual:string
  }>).find(x=>x.razaoSocial==='Distribuidora Fornecedor QA');
  expect(supplier?.endereco).toBe('Rua QA, 123');
  expect(supplier?.inscricaoEstadual).toBe('IE-TESTE-001');

  await a.goto('/'+SLUG+'/lotes');
  await expect(a.getByRole('heading', { name: 'Lotes e validade' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  const lotForm = a.getByRole('dialog');
  await lotForm.locator('#cadastro-produtoId').selectOption({index:1});
  await lotForm.locator('#cadastro-numeroLote').fill('LOTE-QA-2026');
  await lotForm.locator('#cadastro-quantidade').fill('12');
  await lotForm.locator('#cadastro-dataVencimento').fill('2027-10-15');
  await lotForm.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('LOTE-QA-2026')).toBeVisible();
  const lotResponse = await request.get(API+'/lotes', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(lotResponse.status()).toBe(200);
  expect((await lotResponse.json() as Array<{numeroLote:string}>)
    .some(l=>l.numeroLote==='LOTE-QA-2026')).toBe(true);

  // Real manual inventory adjustment must persist a tenant-scoped movement
  // AND update the product stock atomically.
  const stockBeforeResponse = await request.get(API+'/produtos', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(stockBeforeResponse.status()).toBe(200);
  const stockBefore = (await stockBeforeResponse.json() as Array<{
    id:number;nome:string;estoqueAtual:number
  }>).find(x=>x.nome==='Cerveja Teste Playwright 350ml');
  expect(stockBefore).toBeDefined();
  await a.goto('/'+SLUG+'/estoque');
  await expect(a.getByRole('heading', { name: 'Movimentações de estoque' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  const movement = a.getByRole('dialog');
  await movement.locator('select').first().selectOption(String(stockBefore!.id));
  await movement.locator('select').nth(1).selectOption('AJUSTE_ENTRADA');
  await movement.locator('input[type="number"]').fill('3');
  await movement.getByPlaceholder('Ex.: inventário da loja').fill('Ajuste QA integração');
  await movement.getByRole('button', { name: 'Registrar' }).click();
  await expect(a.getByRole('status')).toContainText('Movimentação lançada');
  const stockAfterResponse = await request.get(API+'/produtos', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(stockAfterResponse.status()).toBe(200);
  const stockAfter = (await stockAfterResponse.json() as Array<{
    id:number;estoqueAtual:number
  }>).find(x=>x.id===stockBefore!.id);
  expect(stockAfter?.estoqueAtual).toBe(stockBefore!.estoqueAtual+3);
  const movementsResponse = await request.get(API+'/movimentacoes-estoque', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(movementsResponse.status()).toBe(200);
  expect((await movementsResponse.json() as Array<{produtoId:number;quantidade:number}>)
    .some(x=>x.produtoId===stockBefore!.id&&x.quantidade===3)).toBe(true);

  await a.goto('/'+SLUG+'/funcionarios');
  await expect(a.getByRole('heading', { name: 'Funcionários' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Operador Cadastro QA');
  await a.locator('#cadastro-cpf').fill('77799911122');
  await a.locator('#cadastro-cargo').selectOption('OPERADOR_CAIXA');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Operador Cadastro QA')).toBeVisible();
  const employees = await request.get(API+'/funcionarios', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(employees.status()).toBe(200);
  const employee = (await employees.json() as Array<{
    id:string;nome:string;ativo:boolean;usuario?:unknown
  }>).find(x=>x.nome==='Operador Cadastro QA');
  expect(employee?.ativo).toBe(true);
  expect(employee?.usuario).toBeNull();
  // The users endpoint must not expose password hashes.
  expect(await employees.text()).not.toMatch(/"senha"\s*:/);

  // Complete real counter sales through the React checkout (cash and fiado).
  await a.goto('/'+SLUG+'/pdv');
  await expect(a.getByRole('heading', { name: 'PDV Bebfy' })).toBeVisible();
  await a.locator('input[type="number"]').first().fill('20');
  await a.getByRole('button', { name: 'Abrir meu caixa' }).click();
  await expect(a.getByPlaceholder('Nome ou código de barras')).toBeVisible();
  await a.getByPlaceholder('Nome ou código de barras').fill('Cerveja Teste Playwright 350ml');
  await a.getByRole('button', { name: 'Unidade' }).click();
  await a.getByLabel('Valor 1').fill('12.50');
  await a.getByRole('button', { name: 'Finalizar venda' }).click();
  await expect(a.getByRole('status')).toContainText(/Venda #.*registrada com sucesso/);
  await expect(a.getByText('COMPROVANTE NÃO FISCAL').first()).toBeVisible();

  await a.getByRole('button', { name: 'Unidade' }).click();
  await a.locator('select').first().selectOption({ index: 1 });
  await a.getByLabel('Forma 1').selectOption('FIADO');
  await a.getByLabel('Valor 1').fill('12.50');
  await a.getByRole('button', { name: 'Finalizar venda' }).click();
  await expect(a.getByRole('status')).toContainText(/Venda #.*registrada com sucesso/);

  const clients = await request.get(API + '/clientes', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(clients.status()).toBe(200);
  const clienteQa = (await clients.json() as Array<{id:string;nome:string;saldoDevedor:number|string}>)
    .find(c=>c.nome==='Cliente QA Playwright');
  expect(clienteQa).toBeDefined();
  expect(Number(clienteQa!.saldoDevedor)).toBe(12.5);

  await a.goto('/'+SLUG+'/fiados');
  await expect(a.getByRole('heading', { name: 'Fiados e recebimentos' })).toBeVisible();
  await a.getByRole('button', { name: 'Registrar recebimento' }).click();
  await a.getByRole('dialog').locator('select').first().selectOption(clienteQa!.id);
  await a.getByRole('dialog').locator('input[type="number"]').fill('12.50');
  await a.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(a.getByRole('status')).toContainText('Pagamento registrado');

  // Delivery API returns a summary envelope: verify that React reads
  // response.vendas and can settle the exact queued sale.
  const caixasResponse = await request.get(API+'/caixa', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(caixasResponse.status()).toBe(200);
  const aberto = (await caixasResponse.json() as Array<{
    id:string;operadorId:string;status:string
  }>).find(c=>c.status==='ABERTO');
  expect(aberto).toBeDefined();
  const headers = {
    'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior,
    'Content-Type':'application/json',
  };
  const vendaDelivery = await request.post(API+'/vendas', {
    headers,
    data: {
      caixaId:aberto!.id,funcionarioId:aberto!.operadorId,
      tipoEntrega:'DELIVERY',enderecoEntrega:'Rua teste 123',
      taxaEntrega:3,
      itens:[{produtoId:stockBefore!.id,quantidade:1,precoUnitario:12.5}],
      pagamentos:[{formaPagamento:'PIX',valor:15.5}],
    },
  });
  expect(vendaDelivery.status()).toBe(201);
  const deliveryId=(await vendaDelivery.json() as {id:string}).id;
  await a.goto('/'+SLUG+'/delivery');
  await expect(a.getByRole('heading', { name:'Entregas e acertos' })).toBeVisible();
  await expect(a.getByText('1', {exact:true}).first()).toBeVisible();
  await a.getByLabel(/Selecionar venda/).first().check();
  await a.getByRole('button',{name:/Confirmar 1 acerto/}).click();
  await expect(a.getByRole('status')).toContainText('Acerto das entregas confirmado');
  const pending = await request.get(API+'/vendas/pendentes-acerto-delivery', {headers});
  expect(pending.status()).toBe(200);
  const pendingBody=await pending.json() as {vendas:Array<{id:string}>};
  expect(pendingBody.vendas.some(v=>v.id===deliveryId)).toBe(false);

  await a.goto('/'+SLUG+'/financeiro');
  await expect(a.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
  await a.getByRole('button', { name: 'Nova conta' }).click();
  const fin = a.getByRole('dialog');
  await fin.getByPlaceholder('Ex.: aluguel do galpão').fill('Conta financeira QA Playwright');
  await fin.locator('input[type="number"]').fill('89.90');
  await fin.locator('input[type="date"]').fill('2027-03-01');
  await fin.getByRole('button', { name: 'Cadastrar conta' }).click();
  await expect(a.getByText('Conta financeira QA Playwright')).toBeVisible();

  // A second session cannot silently evict the first.
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await contextB.newPage();
  await entrar(b, SENHA_ROTACIONADA);
  await expect(b.getByRole('dialog', { name: /já está conectado/i })).toBeVisible();
  await b.getByRole('button', { name: 'Não', exact: true }).click();
  const aindaValida = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(aindaValida.status()).toBe(200);
  await b.getByRole('button', { name: 'Autenticar no Bebfy' }).click();
  await expect(b.getByRole('dialog', { name: /já está conectado/i })).toBeVisible();
  await b.getByRole('button', { name: 'Sim, acessar' }).click();
  await expect(b).toHaveURL(new RegExp('/'+SLUG+'/dashboard'));
  const revogada = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(revogada.status()).toBe(401);
  // Tenant credentials never grant access to the independent platform administration.
  await b.goto('/SaaS/painel');
  await expect(b).toHaveURL(/\/SaaS\/admin/);
  await expect(b.getByRole('heading', { name: 'Administração SaaS' })).toBeVisible();
  const ordinaryTenantToken = await b.evaluate(() => localStorage.getItem('@Bebfy:token'));
  const platformDenied = await request.get(API + '/saas/admin/empresas', {
    headers: { Authorization: 'Bearer ' + ordinaryTenantToken },
  });
  expect(platformDenied.status()).toBe(401);

  // A token belonging to bebfybdteste cannot render another tenant's dashboard.
  await b.goto('/outra-loja/dashboard');
  await expect(b).toHaveURL(/outra-loja/);
  await expect(b.getByRole('heading', { name: 'Visão geral' })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

test('interface em celular: login, navegação, consulta de produtos e PDV', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Jornada mobile executada após a ativação desktop.');
  await entrar(page, SENHA_ROTACIONADA);
  const modal = page.getByRole('dialog', { name: /já está conectado/i });
  await expect(modal).toBeVisible();
  await page.getByRole('button', { name: 'Sim, acessar' }).click();
  await expect(page).toHaveURL(new RegExp('/'+SLUG+'/dashboard'));
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('link', { name: /Produtos/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('link', { name: /Frente de caixa/i }).click();
  await expect(page.getByRole('heading', { name: 'PDV Bebfy' })).toBeVisible();
  // UI must remain usable on narrow screens without the entire page overflowing.
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport + 4);
});
