// Screenshots for review: title, interrogation mid-game, lab request in progress,
// lab report, accusation result, at 1440x900 and 390x844 (demo engine).
//   node scripts/shoot.mjs [--rebuild]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  VIEWPORTS,
  accuse,
  ask,
  assertNoHorizontalScroll,
  fileAccusation,
  finishLab,
  launch,
  newPage,
  openCase,
  root,
  startLab,
  startServer,
} from './harness.mjs';

const outDir = join(root, 'shots');
mkdirSync(outDir, { recursive: true });

const server = await startServer({ rebuild: process.argv.includes('--rebuild') });
const browser = await launch();
const written = [];
let failed = false;

async function shot(page, name, vpName, opts = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(opts.settle ?? 350);
  const scroll = await assertNoHorizontalScroll(page, `${name}@${vpName}`);
  const file = join(outDir, `${name}-${vpName}.png`);
  await page.screenshot({ path: file, fullPage: !!opts.fullPage });
  written.push(`${file.replace(`${root}/`, '')}  (scrollWidth ${scroll.sw} = clientWidth ${scroll.cw})`);
}

try {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const { context, page, errors, mobile } = await newPage(browser, viewport);

    await page.goto(`${server.url}?engine=mock`);
    await page.locator('.cover').waitFor();
    // The lamp comes up and the headline settles in about 1.4 s.
    await shot(page, '01-title', vpName, { settle: 1600 });

    await openCase(page, server.url);
    await ask(page, { who: 'mara', question: 'Where were you between 01:45 and 02:40?', mobile });
    await ask(page, { question: 'Who can open the vault? Is there an override PIN?', mobile });
    await ask(page, { who: 'felix', question: 'Did you badge out with your card last night?', mobile });

    await startLab(page, {
      exhibit: 'badge-log',
      request: "How was vault V2 opened at 02:14? Check the auth mode, and whether Arden's card 0193 ever left the building.",
      mobile,
    });
    await page.waitForTimeout(900);
    if (mobile) await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await shot(page, '03-lab-in-progress', vpName, { settle: 100 });
    await finishLab(page);
    if (mobile) await page.locator('.reports .report').first().scrollIntoViewIfNeeded();
    await shot(page, '04-lab-report', vpName);

    if (!mobile) await page.locator('.switch__btn', { hasText: 'Interview room' }).click();
    await ask(page, { who: 'felix', question: 'Your card 0193 never left the building and opened vault V2 at 02:14. Where was your badge?', mobile });
    // New answers type on character by character; wait for the last one to finish and its stamp to land.
    await page.waitForFunction(() => !document.querySelector('.msg.is-typing'), null, { timeout: 5000 });
    await shot(page, '02-interrogation', vpName, { settle: 600 });

    await startLab(page, {
      exhibit: 'phone-log',
      request: "Which cell sector was Mara Quill's handset on between 01:45 and 02:40? Did the guard desk handset make any long call?",
      mobile,
    });
    await finishLab(page);
    if (!mobile) await page.locator('.switch__btn', { hasText: 'Interview room' }).click();
    await ask(page, { who: 'mara', question: 'Your handset was on the west sector, by the vault, at 02:14.', mobile });

    if (mobile) {
      await page.locator('.tabs__btn', { hasText: 'Board' }).click();
      await shot(page, '02b-board', vpName);
    }

    await accuse(page, { suspect: 'mara', facts: ['lab_badge_override', 'lab_phone_cell'], mobile });
    await shot(page, '05a-accuse-dialog', vpName);
    await fileAccusation(page);
    await shot(page, '05-accusation-result', vpName, { settle: 600 });
    await shot(page, '05-accusation-result-full', vpName, { fullPage: true, settle: 100 });

    if (errors.length) {
      failed = true;
      console.error(`${vpName}: console errors\n  ${errors.join('\n  ')}`);
    }
    await context.close();
  }
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
  await server.close();
}

console.log(`Screenshots:\n  ${written.join('\n  ')}`);
process.exit(failed ? 1 : 0);
