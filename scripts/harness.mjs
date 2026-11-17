// Shared browser harness for scripts/e2e.mjs and scripts/shoot.mjs.
// Serves the production build with `vite preview` and drives it with
// playwright-core + a locally installed Chrome (no browser download).
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { preview } from 'vite';
import { chromium } from 'playwright-core';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';

export async function startServer({ rebuild = false } = {}) {
  if (rebuild || !existsSync(join(root, 'dist', 'index.html'))) {
    execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_BASE: '/' } });
  }
  const server = await preview({ root, logLevel: 'silent', preview: { port: 4317, strictPort: false, host: '127.0.0.1' } });
  const url = server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:4317/';
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) };
}

export async function launch() {
  return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export async function newPage(browser, viewport) {
  const mobile = viewport.width < 600;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return { context, page, errors, mobile };
}

/** Fails if the page scrolls horizontally. */
export async function assertNoHorizontalScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw !== cw) throw new Error(`${label}: horizontal scroll (scrollWidth ${sw} != clientWidth ${cw})`);
  return { sw, cw };
}

export async function openCase(page, url, query = '?engine=mock') {
  await page.goto(`${url}${query}`);
  await page.locator('.cover .btn--primary').click();
  await page.locator('.app').waitFor();
}

async function tab(page, name, mobile) {
  if (!mobile) return;
  await page.locator('.tabs__btn', { hasText: name }).click();
}

/** Ask the active-or-given person a question and wait for the answer. */
export async function ask(page, { who, question, mobile }) {
  if (who) {
    await tab(page, 'People', mobile);
    await page.locator(`.tag[data-id="${who}"]`).click();
  }
  const answers = page.locator('.transcript .msg--a[data-id], .transcript .msg--notice');
  const before = await answers.count();
  await page.locator('#question').fill(question);
  await page.locator('#question').press('Enter');
  await page.waitForFunction((n) => document.querySelectorAll('.transcript .msg--a[data-id], .transcript .msg--notice').length > n, before, {
    timeout: 15000,
  });
  return answers.last();
}

/** Start a lab request; returns once the lab is working (tape torn). */
export async function startLab(page, { exhibit, request, mobile }) {
  if (mobile) await tab(page, 'Lab', true);
  else await page.locator('.switch__btn--lab').click();
  await page.locator(`.seg__btn[data-id="${exhibit}"]`).click();
  await page.locator('#lab-request').fill(request);
  await page.locator('.lab__form button[type="submit"]').click();
  await page.locator('.report--working').waitFor();
}

export async function finishLab(page) {
  await page.locator('.report--working').waitFor({ state: 'detached', timeout: 15000 });
  return page.locator('.reports .report').first();
}

export async function accuse(page, { suspect, facts, mobile }) {
  await tab(page, 'People', mobile);
  await page.locator('.rail .btn--tamper').click();
  const dialog = page.locator('dialog.accuse');
  await dialog.waitFor();
  await dialog.locator(`input[value="${suspect}"]`).check();
  for (const f of facts) await dialog.locator(`input[value="${f}"]`).check();
  return dialog;
}

export async function fileAccusation(page) {
  await page.locator('dialog.accuse button[type="submit"]').click();
  await page.locator('.result__stamp').waitFor();
  return (await page.locator('.result__stamp').textContent())?.trim();
}
