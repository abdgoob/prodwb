/* eslint-disable @typescript-eslint/no-require-imports -- Real-browser audio automation regression. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390, isMobile: width === 390 });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__audioDecks = [];
        const gains = [];
        const makeGain = AudioContext.prototype.createGain;
        const makeSource = AudioContext.prototype.createMediaElementSource;
        AudioContext.prototype.createGain = function() { const gain = makeGain.call(this); gains.push(gain); return gain; };
        AudioContext.prototype.createMediaElementSource = function(audio) {
          const source = makeSource.call(this, audio);
          window.__audioDecks.push({ audio, gain: gains[gains.length - 1] });
          return source;
        };
      });
      let release;
      const ready = new Promise(resolve => { release = resolve; });
      await page.route('**/audio/beats/pink-eyes.mp3', async route => { await ready; await route.continue().catch(() => {}); });
      await page.goto(process.env.BASE_URL || 'http://localhost:3000', { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('[data-artwork-ready=true]').waitFor();
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-beat-active]')?.currentTime > .2);
      await page.waitForFunction(() => window.__audioDecks.some(({ audio, gain }) => !audio.paused && gain.gain.value > .99));
      assert.equal(await page.locator('[data-beat-deck]').count(), 2);
      await page.getByRole('button', { name: 'Next CD', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-beat-active]').getAttribute('src').includes('pink-eyes'));
      await page.waitForTimeout(300);
      const waiting = await page.evaluate(() => window.__audioDecks.find(({ audio }) => audio.src.includes('geeked'))?.gain.gain.value);
      assert.ok(waiting > .99, 'Outgoing audio faded before the new audio was ready');
      await page.evaluate(() => {
        window.__fadeSamples = [];
        window.__sampling = true;
        const sample = () => {
          if (!window.__sampling) return;
          window.__fadeSamples.push(window.__audioDecks.map(({ audio, gain }) => ({ src: audio.getAttribute('src'), value: gain.gain.value, paused: audio.paused })));
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      release();
      await page.waitForFunction(() => {
        const pink = window.__audioDecks.find(({ audio }) => audio.src.includes('pink-eyes'));
        const old = window.__audioDecks.find(({ audio }) => !audio.src.includes('pink-eyes'));
        return pink && pink.gain.gain.value > .99 && !pink.audio.paused && old.audio.paused;
      });
      const samples = await page.evaluate(() => { window.__sampling = false; return window.__fadeSamples; });
      const overlap = samples.filter(frame => frame.every(deck => !deck.paused && deck.value > .02 && deck.value < .98));
      assert.ok(overlap.length >= 3, 'No real overlapping fade was measured');
      for (const frame of overlap) assert.ok(Math.abs(frame[0].value + frame[1].value - 1) < .025, 'Crossfade gain introduced a volume spike/dip');
      const incoming = overlap.map(frame => frame.find(deck => deck.src.includes('pink-eyes')).value);
      for (let index = 1; index < incoming.length; index++) assert.ok(incoming[index] >= incoming[index - 1] - .003, 'Incoming fade was not monotonic');

      const seek = async position => {
        await page.evaluate(value => {
          const runway = document.querySelector('#works > div');
          const top = scrollY + runway.getBoundingClientRect().top + value * innerHeight;
          const event = new CustomEvent('portfolio:scroll-seek', { detail: { top, smooth: false }, cancelable: true });
          if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: 'instant' });
        }, position);
      };
      await seek(2);
      await page.waitForFunction(() => document.querySelector('[data-beat-active]').src.includes('30-for-30') && !document.querySelector('[data-beat-active]').paused);
      // Fast reversals while the two gains are still moving: latest selection wins.
      for (const position of [1, 3, 4, 1, 5, 2]) { await seek(position); await page.waitForTimeout(70); }
      await page.waitForFunction(() => document.querySelector('.dcc-count b').textContent === '03');
      await page.waitForFunction(() => {
        const playing = window.__audioDecks.filter(({ audio }) => !audio.paused);
        return playing.length === 1 && playing[0].audio.src.includes('30-for-30') && playing[0].gain.gain.value > .99;
      });
      const final = await page.locator('[data-beat-deck]').evaluateAll(els => els.filter(el => !el.paused).map(el => el.getAttribute('src')));
      assert.deepEqual(final, ['/audio/beats/30-for-30.mp3'], 'A stale transition left the wrong track playing');
      assert.equal(await page.evaluate(() => window.__audioDecks.length), 2, 'New audio nodes were allocated for each CD');

      await page.getByRole('button', { name: 'Pause 30 FOR 30', exact: true }).click();
      await seek(3);
      await page.waitForTimeout(900);
      assert.equal(await page.locator('[data-beat-deck]').evaluateAll(els => els.every(el => el.paused)), true, 'Manual pause was ignored during selection');
      await page.getByRole('button', { name: 'Play SRT', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[data-beat-active]').paused);
      await seek(4);
      await page.waitForTimeout(180);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(await page.locator('[data-beat-deck]').evaluateAll(els => els.every(el => el.paused)), true, 'Hidden tab retained a crossfade tail');
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await seek(5);
      await page.waitForFunction(() => document.querySelector('.dcc-count b').textContent === '06' && !document.querySelector('[data-beat-active]').paused);
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('.dcc-count b').textContent(), '06', 'Audio navigation looped beyond CD six');
      await page.getByRole('button', { name: 'Continue to reviews' }).click();
      await page.waitForFunction(() => Math.abs(document.querySelector('#testimonials').getBoundingClientRect().left) < 1);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-beat-deck]')].every(el => el.paused));
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: automatic entry, delayed-network handoff, measured monotonic overlapping gain curves, constant total gain, scroll/arrow selection, rapid reversals, two-node reuse, manual pause, hidden-tab cancellation, CD six boundary, exit fade`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
