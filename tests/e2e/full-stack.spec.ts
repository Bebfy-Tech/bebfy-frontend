import { expect, test } from '@playwright/test';

const SLUG = 'bebfybdteste';
const SENHA_INICIAL = '12345';
const SENHA_ROTACIONADA = 'SenhaForte!Bebfy2026';
const API = process.env.E2E_API_URL || 'http://localhost:3000';

async function entrar(page: import('@playwright/test').Page, senha: string) {
  await page.goto('/login');
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

  await entrar(a, SENHA_INICIAL);
  await expect(a.getByText('Defina sua senha pessoal')).toBeVisible();
  await expect(a).toHaveURL(/primeiro-acesso/);
  const troca = a.locator('input[type="password"]');
  await troca.nth(0).fill(SENHA_INICIAL);
  await troca.nth(1).fill(SENHA_ROTACIONADA);
  await troca.nth(2).fill(SENHA_ROTACIONADA);
  await a.getByRole('button', { name: 'Salvar senha e acessar' }).click();
  await expect(a).toHaveURL(/dashboard/);
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

  await a.goto('/categorias');
  await expect(a.getByRole('heading', { name: 'Categorias' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cervejas QA Browser');
  await a.locator('#cadastro-descricao').fill('Categoria exclusiva de homologação automatizada');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Cervejas QA Browser')).toBeVisible();

  await a.goto('/produtos');
  await expect(a.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cerveja Teste Playwright 350ml');
  await a.locator('#cadastro-precoVendaVarejo').fill('12.50');
  await a.locator('#cadastro-estoqueAtual').fill('30');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Cerveja Teste Playwright 350ml')).toBeVisible();

  await a.goto('/clientes');
  await expect(a.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await a.getByRole('button', { name: 'Novo cadastro' }).click();
  await a.locator('#cadastro-nome').fill('Cliente QA Playwright');
  await a.locator('#cadastro-limiteCredito').fill('250');
  await a.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(a.getByText('Cliente QA Playwright')).toBeVisible();

  await a.goto('/financeiro');
  await expect(a.getByRole('heading', { name: 'Financeiro' })).toBeVisible();

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
  await expect(b).toHaveURL(/dashboard/);
  const revogada = await request.get(API + '/auth/perfil', {
    headers: { 'x-tenant': SLUG, Authorization: 'Bearer ' + tokenAnterior },
  });
  expect(revogada.status()).toBe(401);
  // SaaS administration must not be reachable using a normal employee JWT.
  await b.goto('/saas/painel');
  await expect(b.getByText(/Distribuidoras|Visão geral|Módulos da plataforma/i).first()).toBeVisible();

  // With explicit CI-only superadministrator allow-list, the platform works.
  await b.goto('/saas/acesso');
  await b.getByPlaceholder('minha-distribuidora').fill(SLUG);
  await b.getByPlaceholder('Seu código de acesso').fill('1');
  await b.getByPlaceholder('Digite sua senha').fill(SENHA_ROTACIONADA);
  await b.getByRole('button', { name: 'Entrar no painel' }).click();
  // A live session with this same account must be explicitly taken over.
  const conflict = b.getByRole('dialog', { name: /já existe um acesso/i });
  if (await conflict.isVisible().catch(() => false)) {
    await b.getByRole('button', { name: 'Sim, acessar' }).click();
  }
  await expect(b).toHaveURL(/saas\/painel/);
  await expect(b.locator('body')).toContainText('bebfyBDteste');
  await contextA.close();
  await contextB.close();
});

test('interface em celular: login, navegação, consulta de produtos e PDV', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Jornada mobile executada após a ativação desktop.');
  await entrar(page, SENHA_ROTACIONADA);
  const modal = page.getByRole('dialog', { name: /já está conectado/i });
  if (await modal.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Sim, acessar' }).click();
  }
  await expect(page).toHaveURL(/dashboard/);
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
