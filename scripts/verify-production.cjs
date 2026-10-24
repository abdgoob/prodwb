/* eslint-disable @typescript-eslint/no-require-imports -- Production browser smoke check. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const device of [
      { name: 'desktop', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
      { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
      { name: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    ]) {
      const { name, ...options } = device;
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const errors = [];
      const failedResources = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin)
          failedResources.push(`${response.status()} ${new URL(response.url()).pathname}`);
      });
      await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('[aria-label="PRODWB audio introduction"][data-artwork-ready="true"]').waitFor();
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: 'detached' });
      await page.locator('[data-parallax-layer="2"] canvas').waitFor();
      assert.equal(await page.getByRole('link', { name: /opens in a new tab/ }).count(), 3);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page overflows horizontally');
      const session = await context.newCDPSession(page);
      const swipe = async () => {
        const x = options.viewport.width / 2;
        const y = options.viewport.height * .78;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 12; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 25 }] });
          await page.waitForTimeout(16);
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      if (options.hasTouch) {
        await page.touchscreen.tap(options.viewport.width / 2, options.viewport.height * .4);
        await swipe();
        await page.waitForFunction(() => scrollY > 20);
      }
      await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
      await page.locator('.dcc-root').waitFor();
      const images = await page.locator('.dcc-idle img').evaluateAll(async images => {
        await Promise.all(images.map(image => image.decode()));
        return images.every(image => image.naturalWidth > 0);
      });
      assert.ok(images, 'Disc artwork did not decode');
      await page.evaluate(() => {
        const runway = document.querySelector('#works > div');
        const top = scrollY + runway.getBoundingClientRect().top + 6 * innerHeight;
        const event = new CustomEvent('portfolio:scroll-seek', { detail: { top, smooth: false }, cancelable: true });
        if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: 'instant' });
      });
      await page.waitForFunction(() => document.querySelector('.dcc-count b')?.textContent === '06');
      if (options.hasTouch) await swipe();
      else { await page.mouse.move(600, 400); await page.mouse.wheel(0, 300); }
      await page.waitForFunction(() => document.querySelector('#testimonials').getBoundingClientRect().left < innerWidth - 20);
      assert.equal(await page.locator('.dcc-count b').textContent(), '06', 'Transition looped past CD six');
      for (const asset of ['/matrix-rain-worker.js', '/hero-artist.jpg', '/audio/prodwbtag.mp3', '/_next/image?url=%2Fworks%2Fbeat-face-6.png&w=640&q=90']) {
        const response = await context.request.get(base + asset);
        assert.ok(response.ok(), `${response.status()} ${asset}`);
      }
      assert.deepEqual(failedResources, [], 'Production resources failed');
      assert.deepEqual(errors, [], 'Browser runtime error');
      console.log(`PASS ${name}: assets, artwork, hero, ${options.hasTouch ? 'native touch scrolling' : 'wheel scrolling'}, CD six boundary, horizontal transition`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
