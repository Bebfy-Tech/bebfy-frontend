import { expect, test } from '@playwright/test';

const SLUG = 'bebfybdteste';
const SENHA_INICIAL = '12345';
const SENHA_ROTACIONADA = 'SenhaForte!Bebfy2026';
const API = process.env.E2E_API_URL || 'http://localhost:3000';

async function entrar(page: import('@playwright/test').Page, senha: string) {
  await page.goto('/'+SLUG);
  await page.getByLabel('Código do funcionário').fill('1');
  await page.locator('input[type="password"]').first().fill(senha);
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();
}

test('fluxo integrado: primeira senha, CRUD, API, sessão única e gestão SaaS', async ({ browser, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'A jornada de ativação ocorre uma única vez no banco temporário.');
  test.setTimeout(240_000);
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await contextA.newPage();
  a.setDefaultTimeout(15_000);

  await a.goto('/');
  await expect(a.locator('body')).toContainText(/Bebfy|bebfy/i);

  await a.goto('/acessar');
  await a.getByLabel('Identificador da distribuidora').fill(SLUG);
  await a.getByRole('button', { name: 'Continuar para o login' }).click();
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
  await a.getByRole('button', { name: 'Nova categoria' }).click();
  await a.locator('#cadastro-nome').fill('Cervejas QA Browser');
  await a.locator('#cadastro-descricao').fill('Categoria exclusiva de homologação automatizada');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.locator('table').getByText('Cervejas QA Browser')).toBeVisible();

  await a.goto('/'+SLUG+'/produtos');
  await expect(a.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo produto', exact: true }).click();
  await a.locator('#produto-nome').fill('Cerveja Teste Playwright 350ml');
  await a.getByLabel('Unidade de estoque').selectOption({label:'UN — Unidade'});
  await a.getByRole('button', {name:'Comercial',exact:true}).click();
  await a.locator('#produto-precoVendaVarejo').fill('12,50');
  await a.getByRole('button', {name:'Estoque',exact:true}).click();
  await a.locator('#produto-estoqueAtual').fill('30');
  await a.getByRole('button', {name:'Salvar produto'}).click();
  await expect(a.getByText('Produto salvo com sucesso.')).toBeVisible();
  await a.getByRole('button', {name:'Produtos / Ficha do produto'}).click();
  await expect(a.locator('table').getByText('Cerveja Teste Playwright 350ml')).toBeVisible();

  await a.goto('/'+SLUG+'/clientes');
  await expect(a.getByRole('heading', {name: 'Clientes',exact: true})).toBeVisible();
  await a.getByRole('button', { name: 'Novo cliente' }).click();
  const customerForm = a.getByRole('dialog');
  await customerForm.getByLabel(/Nome \/ razão social/).fill('Cliente QA Playwright');
  await customerForm.getByLabel('Modalidade de crédito').selectOption('LIMITADO');
  await customerForm.getByLabel('Limite de crédito (R$)').fill('250,00');
  await customerForm.getByRole('button', { name: 'Salvar cliente' }).click();
  await expect(a.getByRole('heading', {name: 'Cliente QA Playwright', exact: true})).toBeVisible();
  await a.getByRole('button', {name: 'Voltar aos clientes',exact: true}).click();
  await expect(a.locator('table').getByText('Cliente QA Playwright')).toBeVisible();

  // Exercise backend/frontend suppliers contract including previously missing
  // inscrição estadual and address columns; check edit round-trip.
  await a.goto('/'+SLUG+'/fornecedores');
  await expect(a.getByRole('heading', { name: 'Fornecedores', exact: true })).toBeVisible();
  await a.getByRole('button', { name: 'Novo fornecedor' }).click();
  const supplierForm = a.getByRole('dialog');
  await supplierForm.getByLabel('Razão social').fill('Distribuidora Fornecedor QA');
  await supplierForm.getByLabel('CNPJ',{exact:true}).fill('00000000000199');
  await supplierForm.getByLabel('Inscrição estadual').fill('IE-TESTE-001');
  await supplierForm.getByLabel('Endereço completo').fill('Rua QA, 123');
  await supplierForm.getByRole('button', { name: 'Salvar fornecedor' }).click();
  await expect(a.getByRole('heading', {name: 'Distribuidora Fornecedor QA',exact: true})).toBeVisible();
  await a.getByRole('button', {name: 'Fornecedores / Ficha',exact: true}).click();
  await expect(a.locator('table') .getByText('Distribuidora Fornecedor QA')).toBeVisible();

  const suppliersResponse = await request.get(API+'/fornecedores', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior },
  });
  expect(suppliersResponse.status()).toBe(200);
  const supplier = (await suppliersResponse.json() as Array<{
    razaoSocial:string;endereco:string;inscricaoEstadual:string
  }>).find(x=>x.razaoSocial==='Distribuidora Fornecedor QA');
  expect(supplier?.endereco).toBe('Rua QA, 123');
  expect(supplier?.inscricaoEstadual).toBe('IE-TESTE-001');

  // SaaS toggle must immediately govern both tenant navigation and server APIs.
  const adminLogin = await request.post(API+'/saas/auth/login', {
    data: { codigo: Number(process.env.E2E_SAAS_CODE), senha: process.env.E2E_SAAS_PASSWORD },
  });
  expect(adminLogin.status()).toBe(200);
  const platformToken = (await adminLogin.json() as {access_token:string}).access_token;
  const adminHeaders = { Authorization:'Bearer '+platformToken };
  const companies = await request.get(API+'/saas/admin/empresas',{headers:adminHeaders});
  expect(companies.status()).toBe(200);
  const enterprise = (await companies.json() as Array<{id:number;slug:string}>)
    .find(c=>c.slug===SLUG);
  expect(enterprise).toBeTruthy();
  const moduleToggle = API+'/saas/admin/empresas/'+enterprise!.id+'/modulos';
  const disabled = await request.patch(moduleToggle,{
    headers:adminHeaders,data:{modulo:'COMPRAS_FORNECEDORES',ativo:false},
  });
  expect(disabled.status()).toBe(200);
  try {
    const disabledModules = await request.get(API+'/auth/modulos',{
      headers:{'x-tenant':SLUG,Authorization:'Bearer '+tokenAnterior},
    });
    expect(disabledModules.status()).toBe(200);
    expect((await disabledModules.json() as {modulos:Record<string,boolean>}).modulos.COMPRAS_FORNECEDORES).toBe(false);
    // Even an already-authenticated user cannot open the disabled supplier page.
    await a.reload();
    await expect(a.getByRole('complementary',{name:'Menu da distribuidora'})
      .getByRole('link',{name:/Fornecedores/})).toHaveCount(0);
    await expect(a.getByRole('heading',{name:'Fornecedores', exact: true})).toHaveCount(0);
    await a.goto('/'+SLUG+'/fornecedores');
    await expect(a.getByRole('heading',{name:'Módulo não disponível'})).toBeVisible();
    const denied = await request.get(API+'/fornecedores',{
      headers:{'x-tenant':SLUG,Authorization:'Bearer '+tokenAnterior},
    });
    expect(denied.status()).toBe(403);
  } finally {
    const restored = await request.patch(moduleToggle,{
      headers:adminHeaders,data:{modulo:'COMPRAS_FORNECEDORES',ativo:true},
    });
    expect(restored.status()).toBe(200);
  }
  await a.reload();
  await expect(a.getByRole('heading',{name:'Fornecedores', exact:true })).toBeVisible();
  await expect(a.getByRole('complementary',{name:'Menu da distribuidora'})
    .getByRole('link',{name:/Fornecedores/})).toBeVisible();

  await a.goto('/'+SLUG+'/lotes');
  await expect(a.getByRole('heading', { name: 'Lotes e validade' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo lote' }).click();
  const lotForm = a.getByRole('dialog');
  await lotForm.locator('#cadastro-produtoId').selectOption({index:1});
  await lotForm.locator('#cadastro-numeroLote').fill('LOTE-QA-2026');
  await lotForm.locator('#cadastro-quantidade').fill('12');
  await lotForm.locator('#cadastro-dataVencimento').fill('2027-10-15');
  await lotForm.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.locator('table').getByText('LOTE-QA-2026')).toBeVisible();
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
  await expect(a.getByRole('heading', { name: 'Gestão de Estoque e Inventário' })).toBeVisible();
  await a.getByRole('button', { name: 'Ajuste de estoque', exact:true }).click();
  const movement = a.getByRole('dialog');
  await movement.locator('select').first().selectOption(String(stockBefore!.id));
  await movement.locator('select').nth(1).selectOption('AJUSTE_ENTRADA');
  await movement.locator('input[type="number"]').fill('3');
  await movement.getByLabel('Motivo',{exact:true}).fill('Ajuste QA integração');
  await movement.getByRole('button', { name: 'Registrar movimentação' }).click();
  await expect(a.getByRole('status')).toContainText('Movimentação registrada e saldo atualizado.');
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
  await expect(a.getByRole('heading', { name: 'Funcionários e permissões' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo funcionário' }).click();
  const employeeForm=a.getByRole('dialog');
  await employeeForm.getByLabel(/Nome completo/).fill('Operador Cadastro QA');
  await employeeForm.getByLabel(/CPF/).fill('77799911122');
  await employeeForm.getByLabel(/Cargo/).selectOption('OPERADOR_CAIXA');
  await employeeForm.getByLabel('Configurar acesso logo após salvar').uncheck();
  await employeeForm.getByRole('button', { name: 'Salvar funcionário' }).click();
  await expect(a.locator('table').getByText('Operador Cadastro QA')).toBeVisible();

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

  // Complete real counter sales through the current two-step checkout.
  await a.goto('/'+SLUG+'/pdv');
  await expect(a.getByRole('heading', { name: 'Frente de Caixa' })).toBeVisible();
  await a.getByLabel('Saldo inicial (R$)').fill('20,00');
  await a.getByRole('button', { name: 'Abrir meu caixa' }).click();
  const search = a.getByLabel('Buscar produto ou código de barras');
  await search.fill('Cerveja Teste Playwright 350ml');
  await a.getByRole('button', { name: 'Adicionar unidade de Cerveja Teste Playwright 350ml' }).click();
  await a.getByRole('button', { name: 'Receber venda' }).click();
  const pay = a.getByRole('dialog', {name:'Recebimento da venda'});
  await pay.getByRole('button', {name:'Dinheiro',exact:true}).click();
  await pay.getByRole('button', { name: 'Confirmar venda' }).click();
  await expect(a.getByText(/Venda #.*registrada com sucesso/)).toBeVisible();
  await expect(a.getByRole('dialog',{name:'Venda realizada'}).getByText(/COMPROVANTE NÃO FISCAL/i).first()).toBeVisible();
  await a.getByRole('button',{name:'Iniciar nova venda'}).click();

  await search.fill('Cerveja Teste Playwright 350ml');
  await a.getByRole('button', { name: 'Adicionar unidade de Cerveja Teste Playwright 350ml' }).click();
  const customerOptions = a.getByLabel(/Cliente \(obrigatório para fiado\)/);
  const qaOption = customerOptions.locator('option').filter({hasText:'Cliente QA Playwright'});
  await expect(qaOption).toHaveCount(1);
  await customerOptions.selectOption(await qaOption.getAttribute('value') as string);
  await a.getByRole('button', {name:'Receber venda'}).click();
  await pay.getByRole('button', {name:'Fiado',exact:true}).click();
  await pay.getByRole('button', {name:'Confirmar venda'}).click();
  await expect(a.getByText(/Venda #.*registrada com sucesso/)).toBeVisible();
  await a.getByRole('button',{name:'Iniciar nova venda'}).click();

  const clients = await request.get(API + '/clientes', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(clients.status()).toBe(200);
  const clienteQa = (await clients.json() as Array<{id:string;nome:string;saldoDevedor:number|string}>)
    .find(c=>c.nome==='Cliente QA Playwright');
  expect(clienteQa).toBeDefined();
  expect(Number(clienteQa!.saldoDevedor)).toBe(12.5);

  await a.goto('/'+SLUG+'/fiados');
  await expect(a.getByRole('heading', { name: /Fiados e recebimentos/i })).toBeVisible();
  await a.getByRole('button', { name: 'Receber pagamento',exact:true }).click();
  const receive=a.getByRole('dialog',{name:'Receber pagamento de fiado'});
  await receive.getByLabel('Cliente',{exact:true}).selectOption(clienteQa!.id);
  await receive.getByRole('button',{name:'Quitar total'}).click();
  await receive.getByRole('button',{name:'Dinheiro',exact:true}).click();
  await receive.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(a.getByText('Recebimento registrado.',{exact:true})).toBeVisible();
  const afterCredit = await request.get(API+'/clientes',{headers:{'x-tenant':SLUG,Authorization:'Bearer '+tokenAnterior}});
  expect(afterCredit.status()).toBe(200);
  expect(Number((await afterCredit.json() as Array<{id:string;saldoDevedor:number|string}>).find(c=>c.id===clienteQa!.id)?.saldoDevedor)).toBe(0);

  // Delivery now requires an assigned employee, delivery lifecycle and explicit settlement.
  const headers = {'x-tenant': SLUG, Authorization: 'Bearer '+tokenAnterior};
  const driverResponse=await request.post(API+'/funcionarios',{headers,data:{nome:'Entregador QA Browser',cpf:'55566677788',cargo:'ENTREGADOR',descontoMaximo:0}});
  expect(driverResponse.status()).toBe(201);
  const driver=(await driverResponse.json() as {id:string}).id;
  await a.goto('/'+SLUG+'/pdv');
  await expect(a.getByRole('heading',{name:'Frente de Caixa'})).toBeVisible();
  await a.getByLabel('Buscar produto ou código de barras').fill('Cerveja Teste Playwright 350ml');
  await a.getByRole('button',{name:'Adicionar unidade de Cerveja Teste Playwright 350ml'}).click();
  await a.getByLabel('Tipo de entrega').selectOption('DELIVERY');
  await a.getByLabel('Taxa de entrega').fill('3,00');
  await a.getByLabel('Endereço',{exact:true}).fill('Rua teste 123');
  await a.getByRole('button',{name:'Receber venda'}).click();
  await a.getByRole('dialog',{name:'Recebimento da venda'}).getByRole('button',{name:'PIX',exact:true}).click();
  await a.getByRole('button',{name:'Confirmar venda'}).click();
  await expect(a.getByText(/Venda #.*registrada com sucesso/)).toBeVisible();
  await a.getByRole('button',{name:'Iniciar nova venda'}).click();
  await a.goto('/'+SLUG+'/delivery');
  await expect(a.getByRole('heading', {name:'Entregas e Delivery'})).toBeVisible();
  const deliveryRow=a.getByRole('row').filter({hasText:'Rua teste 123'});
  await deliveryRow.getByRole('button',{name:'Separando',exact:true}).click();
  await a.getByRole('button',{name:'Confirmar situação'}).click();
  await deliveryRow.getByRole('button',{name:'Em rota',exact:true}).click();
  await a.getByRole('dialog').getByLabel('Entregador').selectOption(driver);
  await a.getByRole('button',{name:'Confirmar situação'}).click();
  await deliveryRow.getByRole('button',{name:'Entregue',exact:true}).click();
  await a.getByRole('button',{name:'Confirmar situação'}).click();
  await a.getByRole('button',{name:'Acertos financeiros'}).click();
  await deliveryRow.getByRole('button',{name:'Acertar',exact:true}).click();
  const settlement=a.getByRole('dialog',{name:'Conferência de acerto'});
  await settlement.getByLabel('Dinheiro físico conferido (R$)').fill('0,00');
  await settlement.getByLabel(/Conferi dinheiro/).check();
  await settlement.getByRole('button',{name:'Confirmar acerto'}).click();
  await expect(a.getByText('Acerto confirmado.',{exact:true})).toBeVisible();
  const deliveries = await request.get(API+'/vendas/delivery',{headers});
  expect(deliveries.status()).toBe(200);
  expect((await deliveries.json() as {vendas:Array<{enderecoEntrega:string;statusAcerto:string}>}).vendas.find(v=>v.enderecoEntrega==='Rua teste 123')?.statusAcerto).toBe('CONCLUIDO');

  await a.goto('/'+SLUG+'/financeiro');
  await expect(a.getByRole('heading', { name: 'Gestão Financeira' })).toBeVisible();
  await a.getByRole('button',{name:'Contas a pagar',exact:true}).click();
  await a.getByRole('button', { name: 'Novo lançamento' }).click();
  const fin = a.getByRole('dialog');
  await fin.getByLabel('Descrição',{exact:true}).fill('Conta financeira QA Playwright');
  await fin.getByLabel('Classificação').selectOption({index:1});
  await fin.getByLabel('Valor total').fill('89,90');
  await fin.getByLabel('Primeiro vencimento').fill('2027-03-01');
  await fin.getByRole('button', { name: 'Confirmar',exact:true }).click();
  await expect(a.getByText('Operação registrada com sucesso.',{exact:true})).toBeVisible();
  await expect(a.locator('table').getByText('Conta financeira QA Playwright')).toBeVisible();

  // A second session cannot silently evict the first.
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await contextB.newPage();
  await entrar(b, SENHA_ROTACIONADA);
  await expect(b.getByRole('dialog', { name: /já está conectado/i })).toBeVisible();
  await b.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const aindaValida = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(aindaValida.status()).toBe(200);
  await b.getByRole('button', { name: 'Entrar no sistema' }).click();
  await expect(b.getByRole('dialog', { name: /já está conectado/i })).toBeVisible();
  await b.getByRole('button', { name: 'Continuar e desconectar' }).click();
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
  await page.getByRole('button', { name: 'Continuar e desconectar' }).click();
  await expect(page).toHaveURL(new RegExp('/'+SLUG+'/dashboard'));
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('link', { name: /Produtos/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page.getByRole('link', { name: /Frente de caixa/i }).click();
  await expect(page.getByRole('heading', { name: 'Frente de Caixa' })).toBeVisible();
  // UI must remain usable on narrow screens without the entire page overflowing.
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport + 4);
});
