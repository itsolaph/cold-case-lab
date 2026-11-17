// Renders the receipt exhibit (public/exhibits/receipt.png) by screenshotting
// an HTML scene with headless Chrome. No canvas libraries needed.
//   node scripts/render-receipt.mjs [path-to-chrome]
import { chromium } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'public', 'exhibits', 'receipt.png');
const chrome = process.argv[2] || process.env.CHROME_PATH || '/usr/bin/google-chrome';
mkdirSync(dirname(outFile), { recursive: true });

const ticks = Array.from({ length: 11 }, (_, i) => `<i style="left:${i * 10}%"><b>${i}</b></i>`).join('');
const html = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Mono; src: url('file://${root}/public/fonts/courier-prime-latin-400-normal.woff2'); }
  html,body { margin:0; }
  body {
    width: 900px; height: 1200px; overflow: hidden; position: relative;
    background:
      radial-gradient(ellipse 70% 60% at 48% 46%, #fbfdfe 0%, #eef3f5 55%, #dfe7ea 100%);
    font-family: Mono, monospace;
  }
  /* frosted light-table texture */
  body::before { content:''; position:absolute; inset:0;
    background-image: repeating-linear-gradient(0deg, rgba(28,37,43,.025) 0 1px, transparent 1px 3px),
                      repeating-linear-gradient(90deg, rgba(28,37,43,.02) 0 1px, transparent 1px 4px); }
  .paper {
    position:absolute; left: 230px; top: 120px; width: 420px; padding: 34px 30px 46px;
    background: linear-gradient(90deg, #f6f5f0 0%, #fdfdfa 18%, #fbfaf6 50%, #f3f2ec 100%);
    color: #2c2a29; transform: rotate(-3.2deg);
    box-shadow: 0 2px 3px rgba(28,37,43,.12), 0 18px 40px rgba(28,37,43,.16);
    clip-path: polygon(0 0, 100% 0, 100% 97%, 96% 100%, 92% 97.6%, 88% 100%, 84% 97.8%, 80% 100%, 76% 97.6%, 72% 100%, 68% 97.8%, 64% 100%, 60% 97.6%, 56% 100%, 52% 97.8%, 48% 100%, 44% 97.6%, 40% 100%, 36% 97.8%, 32% 100%, 28% 97.6%, 24% 100%, 20% 97.8%, 16% 100%, 12% 97.6%, 8% 100%, 4% 97.8%, 0 100%);
    font-size: 17px; line-height: 1.45; letter-spacing: .02em;
  }
  /* crease folds and thermal fade */
  .paper::before { content:''; position:absolute; inset:0; pointer-events:none;
    background:
      linear-gradient(178deg, transparent 31%, rgba(0,0,0,.07) 31.3%, rgba(255,255,255,.7) 31.8%, transparent 33%),
      linear-gradient(181deg, transparent 64%, rgba(0,0,0,.06) 64.3%, rgba(255,255,255,.6) 64.8%, transparent 66%),
      linear-gradient(90deg, rgba(255,255,255,.0) 70%, rgba(255,255,255,.45) 100%); }
  .c { text-align:center } .b { font-weight: 600 } .big { font-size: 25px; letter-spacing: .12em }
  .row { display:flex; justify-content:space-between; gap: 12px }
  .rule { border-top: 2px dashed #6b6966; margin: 12px 0 }
  .faint { color: #8d8a85 }
  .note { margin-top: 14px; font-size: 15px }
  .bar { height: 54px; margin: 16px auto 4px; width: 300px;
    background: repeating-linear-gradient(90deg, #2c2a29 0 2px, transparent 2px 4px, #2c2a29 4px 7px, transparent 7px 9px, #2c2a29 9px 10px, transparent 10px 13px); }
  /* forensic scale */
  .scale { position:absolute; left: 120px; top: 1010px; width: 600px; height: 64px; background: #f4f6f7;
    border: 1px solid #b9c4c9; transform: rotate(-1deg); box-shadow: 0 2px 6px rgba(28,37,43,.12); }
  .scale i { position:absolute; top:0; width:1px; height: 26px; background:#1c252b; }
  .scale b { position:absolute; top: 28px; left: -4px; font: 600 13px Mono, monospace; color:#1c252b }
  .scale::after { content:'HG FORENSIC SCALE  cm'; position:absolute; right: 10px; bottom: 6px; font: 600 11px Mono, monospace; letter-spacing:.14em; color:#5b6b73 }
  .tag { position:absolute; right: 56px; top: 860px; z-index: 2; width: 150px; padding: 12px 14px; background:#fff;
    border: 1px solid #c9d2d6; transform: rotate(4deg); font: 600 13px/1.5 Mono, monospace; color:#1c252b;
    box-shadow: 0 2px 6px rgba(28,37,43,.12); }
  .tag .n { font-size: 28px; color:#D7263D; letter-spacing:.06em }
</style></head><body>
  <div class="tag"><div>EXHIBIT</div><div class="n">E-3</div><div>15 MAR 06:20</div><div>R.O.</div></div>
  <div class="paper">
    <div class="c b big">COLDLINE</div>
    <div class="c b">LAB SUPPLY</div>
    <div class="c">Cryogenics, cold chain, rentals</div>
    <div class="c">Unit 4, Kestrel Yard</div>
    <div class="c">Tel 555-0148</div>
    <div class="rule"></div>
    <div class="row"><span>2026-03-14</span><span>18:52</span></div>
    <div class="row"><span>Till 2</span><span>Rcpt 0041187</span></div>
    <div class="rule"></div>
    <div>RENTAL 1 DAY</div>
    <div class="row"><span>CX-1 VAPOUR-PHASE</span><span></span></div>
    <div class="row"><span>DRY SHIPPER 1.5 L</span><span>45.00</span></div>
    <div class="row"><span>LN2 CHARGE 3.6 L</span><span>12.60</span></div>
    <div class="row"><span>DEPOSIT, REFUNDABLE</span><span>150.00</span></div>
    <div class="rule"></div>
    <div class="row b"><span>TOTAL</span><span>207.60</span></div>
    <div class="row"><span>CARD ****0388</span><span>APPROVED</span></div>
    <div class="row faint"><span>AUTH 7Q41C2</span><span>CONTACTLESS</span></div>
    <div class="rule"></div>
    <div class="b">RETURN BY 2026-03-15 10:00</div>
    <div class="note">Keep upright. Never seal airtight.<br>Charged shipper holds -150 C<br>for up to 5 days.</div>
    <div class="bar"></div>
    <div class="c faint">THANK YOU</div>
  </div>
  <div class="scale">${ticks}</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: chrome, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: outFile, type: 'png' });
await browser.close();
console.log(`wrote ${outFile}`);
