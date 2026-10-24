/* eslint-disable @typescript-eslint/no-require-imports -- Browser activation/cold waveform check. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const gesture of ['arrow', 'waveform']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.url().includes('/audio/beats/')) requests.push(request.url()); });
      // Model a browser that has not granted automatic playback to the section.
      await page.addInitScript(() => Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: false } }));
      await page.goto(process.env.BASE_URL || 'http://localhost:3000', { waitUntil: 'networkidle' });
      await page.locator('[data-artwork-ready=true]').waitFor();
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
      await page.locator('[data-beat-active]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('[data-beat-deck]').evaluateAll(els => els.every(el => el.paused)), true);
      assert.equal(requests.length, 0, 'Audio downloaded before section activation');
      if (gesture === 'arrow') {
        await page.getByRole('button', { name: 'Next CD', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-beat-active]').src.includes('pink-eyes') && !document.querySelector('[data-beat-active]').paused && document.querySelector('[data-beat-active]').currentTime > .1);
      } else {
        const box = await page.getByRole('slider', { name: 'Seek GEEKED', exact: true }).boundingBox();
        await page.touchscreen.tap(box.x + box.width * .6, box.y + box.height / 2);
        await page.waitForFunction(() => {
          const audio = document.querySelector('[data-beat-active]');
          return !audio.paused && Math.abs(audio.currentTime - 246.91 * .6) < 3;
        });
      }
      assert.deepEqual(errors, []);
      console.log(`PASS mobile ${gesture}: silent before activation, gesture enables playback without clicking CD/Listen, cold media seek/auto-selection works`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
