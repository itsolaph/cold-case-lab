// End-to-end: play the whole case on the demo engine in real Chrome.
//   1. desktop 1440: the intended solve path to a correct accusation, with a reload mid-game
//   2. mobile 390, no on-device model: remote-line routing, then a wrong accusation, then a new case file
//   node scripts/e2e.mjs [--rebuild]
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
  startLab,
  startServer,
} from './harness.mjs';

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

const server = await startServer({ rebuild: process.argv.includes('--rebuild') });
const browser = await launch();
const t0 = Date.now();

try {
  // ---------------------------------------------------------------- run 1
  {
    const { context, page, errors } = await newPage(browser, VIEWPORTS.desktop);
    await openCase(page, server.url);
    check('title opens the case (initializeDeviceModel on click)', await page.locator('.app').isVisible());

    const a1 = await ask(page, { who: 'mara', question: 'Where were you between 01:45 and 02:40?' });
    const chip = await a1.locator('.chip').getAttribute('aria-label');
    check('interrogation route chip reads ON DEVICE · N ms', /^ON DEVICE · \d{3} ms \(demo engine\)$/.test(chip ?? ''), chip ?? 'none');
    await ask(page, { question: 'Who can open the vault? Is there an override PIN?' });
    check('claims and open facts are pinned', (await page.locator('.pins .pin').count()) === 2);

    const bluff = await ask(page, { who: 'felix', question: 'Did you badge out with your card last night?' });
    check('naming evidence you do not hold is a bluff', (await bluff.locator('.stamp--bluff').count()) === 1);

    await startLab(page, {
      exhibit: 'badge-log',
      request: "How was vault V2 opened at 02:14? Check the auth mode, and whether Arden's card 0193 ever left the building.",
    });
    check('spending a lab request tears seal 1 (bag turns blue)', (await page.locator('.seal').first().getAttribute('data-state')) === 'working');
    const labStart = Date.now();
    const r1 = await finishLab(page);
    const labMs = Date.now() - labStart;
    const r1chip = await r1.locator('.chip').getAttribute('aria-label');
    check('lab report route chip reads CLOUD LAB · N s', /^CLOUD LAB · [4-7]\.\d s \(demo engine\)$/.test(r1chip ?? ''), `${r1chip}; waited ${labMs} ms`);
    check('precise badge request certifies 2 findings', (await r1.locator('.finding').count()) === 2);
    check('header shows 2 lab requests left', (await page.locator('.counter--lab .counter__n').textContent()) === '2');

    // reload mid-game: progress must survive
    const pinsBefore = await page.locator('.pins .pin').count();
    await page.reload();
    await page.locator('.cover .btn--primary', { hasText: 'Resume the case' }).click();
    await page.locator('.app').waitFor();
    check('progress survives a reload', (await page.locator('.pins .pin').count()) === pinsBefore, `${pinsBefore} pins`);
    check('docket restored without re-tearing', (await page.locator('.seal').first().getAttribute('data-state')) === 'spent');

    await page.locator('.switch__btn', { hasText: 'Interview room' }).click();
    const crack = await ask(page, { who: 'felix', question: 'Your card 0193 never left the building and opened vault V2 at 02:14. Where was your badge?' });
    check('pressure with pinned evidence cracks Arden', (await crack.getAttribute('data-mood')) === 'cracked');

    await startLab(page, {
      exhibit: 'phone-log',
      request: "Which cell sector was Mara Quill's handset on between 01:45 and 02:40? Did the guard desk handset make any long call?",
    });
    const r2 = await finishLab(page);
    check('precise phone request certifies the cell-sector finding', (await r2.textContent())?.includes('HG-W2') ?? false);

    await page.locator('.switch__btn', { hasText: 'Interview room' }).click();
    const crack2 = await ask(page, { who: 'mara', question: 'Your handset was on the west sector, by the vault, at 02:14.' });
    check('Quill cracks under the cell-sector evidence', (await crack2.getAttribute('data-mood')) === 'cracked');
    await assertNoHorizontalScroll(page, 'desktop game');

    await accuse(page, { suspect: 'mara', facts: ['lab_badge_override', 'lab_phone_cell'] });
    const stamp = await fileAccusation(page);
    check('correct accusation closes the case', /case closed/i.test(stamp ?? ''), stamp);
    const decisive = await page.locator('.call--decisive').count();
    check('result lists the decisive lab calls', decisive === 2, `${decisive} decisive`);
    const asked = await page.locator('.stats dd').first().textContent();
    check('result shows the question count', asked === '5', `${asked} questions`);
    check('no console errors (desktop)', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // ---------------------------------------------------------------- run 2
  {
    const { context, page, errors, mobile } = await newPage(browser, VIEWPORTS.mobile);
    await openCase(page, server.url, '?engine=mock&nano=0&speed=3');
    const notice = await page.locator('.notice').textContent();
    check(
      'no on-device model: honest remote-line notice',
      notice === 'No on-device model in this browser: suspects are on a remote line (slower).',
      notice ?? 'none',
    );
    const a = await ask(page, { who: 'ruth', question: 'What are your rounds?', mobile });
    const chip = await a.locator('.chip').getAttribute('aria-label');
    check('interrogation route chip reads REMOTE LINE · N s', /^REMOTE LINE · \d\.\d s \(demo engine\)$/.test(chip ?? ''), chip ?? 'none');

    await page.locator('.top__reset').click();
    await page.locator('dialog.confirm').waitFor();
    await page.locator('dialog.confirm button', { hasText: 'Keep this case' }).click();
    await page.locator('dialog.confirm').waitFor({ state: 'detached' });
    check('cancelling "New case file" keeps progress', (await page.locator('.transcript .msg--a[data-id]').count()) === 1);

    await startLab(page, { exhibit: 'badge-log', request: 'How was vault V2 opened at 02:14? Which auth mode?', mobile });
    await finishLab(page);
    await startLab(page, { exhibit: 'statement', request: 'Is the courier timeline in the statement consistent?', mobile });
    await finishLab(page);
    await startLab(page, { exhibit: 'receipt', request: 'Anything interesting here?', mobile });
    const vague = await finishLab(page);
    check('a vague request gets a vague report', (await vague.locator('.finding').count()) === 0);
    check('all three seals spent; lab closed', await page.locator('.lab__form button[type="submit"]').isDisabled());
    await assertNoHorizontalScroll(page, 'mobile game');

    await accuse(page, { suspect: 'felix', facts: ['lab_badge_override', 'lab_statement_courier'], mobile });
    const stamp = await fileAccusation(page);
    check('wrong accusation collapses the case', /collapsed/i.test(stamp ?? ''), stamp);
    await assertNoHorizontalScroll(page, 'mobile result');

    await page.locator('.result__actions .btn').click();
    await page.locator('.app').waitFor();
    const sealed = await page.locator('.seal[data-state="sealed"]').count();
    check('New case file resets the docket and board', sealed === 3 && (await page.locator('.pins .pin').count()) === 0);
    check('no console errors (mobile)', errors.length === 0, errors.join(' | '));
    await context.close();
  }
} catch (e) {
  failures++;
  results.push(`FAIL  exception: ${e instanceof Error ? e.message : e}`);
} finally {
  await browser.close();
  await server.close();
}

console.log(results.join('\n'));
console.log(`\n${results.length - failures} passed, ${failures} failed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failures ? 1 : 0);
