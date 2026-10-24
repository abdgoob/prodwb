/* eslint-disable @typescript-eslint/no-require-imports -- Browser animation regression check. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1366, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.BASE_URL || 'http://localhost:3000', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: 'detached' });
      await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
      const root = page.locator('.dcc-root');
      await root.waitFor();
      await page.locator('.dcc-idle img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const seek = async position => {
        await page.evaluate(pos => {
          const runway = document.querySelector('#works > div');
          const top = scrollY + runway.getBoundingClientRect().top + pos * innerHeight;
          const event = new CustomEvent('portfolio:scroll-seek', { detail: { top, smooth: false }, cancelable: true });
          if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: 'instant' });
        }, position);
        await page.waitForFunction(pos => {
          const transform = document.querySelector('.dcc-slide')?.style.transform ?? '';
          const factor = transform.match(/calc\(([-\d.]+)/);
          // Native scroll positions round to CSS pixels, including the runway start.
          return factor && Math.abs(Number(factor[1]) + pos * 1.02) < .003;
        }, position).catch(async error => {
          console.log('Failed pose', position, await page.evaluate(() => ({ y: scrollY, transform: document.querySelector('.dcc-slide')?.style.transform, rootTop: document.querySelector('#cd-carousel')?.getBoundingClientRect().top })));
          throw error;
        });
      };
      await seek(.3);
      for (const direction of [1, -1]) {
        for (let step = 0; step <= 40; step++) {
          const raw = direction === 1 ? step / 8 : 5 - step / 8;
          const position = raw > 0 && raw < 5 ? raw + .01 : raw;
          await seek(position);
          const state = await root.evaluate(el => {
            const slides = [...el.querySelectorAll('.dcc-slide')];
            return {
              active: slides.findIndex(slide => slide.hasAttribute('data-active')),
              slides: slides.map(slide => ({
                visibility: slide.style.visibility,
                prepared: slide.hasAttribute('data-prepared'),
                ready: slide.querySelector('img').complete && slide.querySelector('img').naturalWidth > 0,
              })),
            };
          });
          assert.equal(state.active, Math.min(5, Math.round(position)));
          state.slides.forEach((slide, index) => {
            if (Math.abs(index - position) <= 1.75) {
              assert.notEqual(slide.visibility, 'hidden', `Incoming disc ${index} was hidden at position ${position}`);
              assert.ok(slide.prepared && slide.ready, 'Incoming disc was not prepared/decoded');
            }
          });
        }
      }
      await seek(.3);
      await page.waitForFunction(() => !document.querySelector('.dcc-root').hasAttribute('data-motion'));
      await page.evaluate(() => {
        window.__poseWrites = 0;
        window.__poseObserver = new MutationObserver(records => {
          window.__poseWrites += records.filter(record => record.type === 'attributes' && record.attributeName === 'style' && record.target.matches('.dcc-slide,.dcc-roll,.dcc-glint')).length;
        });
        window.__poseObserver.observe(document.querySelector('.dcc-stage'), { subtree: true, attributes: true, attributeFilter: ['style'] });
      });
      await root.focus();
      await page.getByRole('button', { name: 'Tracks' }).click();
      await root.press('Escape');
      await page.waitForTimeout(100);
      const writes = await page.evaluate(() => { window.__poseObserver.disconnect(); return window.__poseWrites; });
      assert.equal(writes, 0, 'React UI updates rewrote an animation-owned pose');
      for (const position of [5, 0, 4, 1, 3, 2, 5]) {
        await seek(position);
        await page.waitForFunction(() => !document.querySelector('.dcc-root').hasAttribute('data-motion'));
        assert.equal(await page.locator('.dcc-count b').textContent(), String(position + 1).padStart(2, '0'));
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: all six discs forward/reverse, boundary preparation, decoded art, UI pose ownership, rapid direction changes`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
