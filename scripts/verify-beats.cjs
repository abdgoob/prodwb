/* eslint-disable @typescript-eslint/no-require-imports -- Standalone audio/browser regression check. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const tracks = [
  ['GEEKED', 'geeked', 246.91], ['PINK EYES', 'pink-eyes', 127.06],
  ['30 FOR 30', '30-for-30', 141.79], ['SRT', 'srt', 160.05],
  ['SMILIN', 'smilin', 148.19], ['DIAMONDS', 'diamonds', 162.27],
];

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [1366, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 }, hasTouch: width === 390, isMobile: width === 390,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__waveAudioReads = 0;
        window.__waveAudioMaximum = 0;
        const read = AnalyserNode.prototype.getByteFrequencyData;
        AnalyserNode.prototype.getByteFrequencyData = function(buffer) {
          read.call(this, buffer);
          if (document.querySelector('[data-audio-reactive]')) {
            window.__waveAudioReads++;
            window.__waveAudioMaximum = Math.max(window.__waveAudioMaximum, ...buffer);
          }
        };
      });
      page.setDefaultTimeout(30000);
      const errors = [], failed = [], requested = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
      });
      page.on('request', request => {
        if (request.url().includes('/audio/beats/')) requested.push(request.url());
      });
      await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('[aria-label="PRODWB audio introduction"][data-artwork-ready="true"]').waitFor();
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: 'detached' });
      await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
      await page.locator('.dcc-root').waitFor();
      const audio = page.locator('[data-beat-active]');
      assert.equal(await audio.count(), 1);
      assert.equal(await page.locator('[data-beat-deck]').count(), 2);
      await page.waitForFunction(() => !document.querySelector('[data-beat-active]').paused && document.querySelector('[data-beat-active]').currentTime > .1);
      await page.getByRole('button', { name: 'Pause GEEKED', exact: true }).click();

      const waveform = page.locator('[data-beat-waveform]');
      assert.equal(await waveform.locator('canvas[data-audio-reactive]').count(), 1, 'Waveform should use one isolated audio-reactive canvas');
      const firstSeek = page.getByRole('slider', { name: 'Seek GEEKED', exact: true });
      const box = await firstSeek.boundingBox();
      const start = tracks[0][2] * .65;
      // Selecting a waveform position previews without clicking the CD or Listen.
      if (width === 390) {
        await page.touchscreen.tap(box.x + box.width * .65, box.y + box.height / 2);
      } else {
        await firstSeek.click({ position: { x: box.width * .65, y: box.height / 2 } });
      }
      await page.waitForFunction(target => {
        const audio = document.querySelector('[data-beat-active]');
        return !audio.paused && Math.abs(audio.currentTime - target) < 3;
      }, start);
      await page.waitForFunction(() => window.__waveAudioReads > 5 && window.__waveAudioMaximum > 0);
      await page.getByRole('button', { name: 'Pause GEEKED', exact: true }).click();
      const stoppedReads = await page.evaluate(() => window.__waveAudioReads);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => window.__waveAudioReads), stoppedReads, 'Live analyser loop continued while paused');
      await firstSeek.focus();
      await firstSeek.press('Home');
      await page.waitForFunction(() => document.querySelector('[data-beat-active]').currentTime < .1);
      assert.equal(await audio.evaluate(el => el.paused), true, 'Keyboard seeking should not force playback');

      // Real pointer drag, then release to preview at the selected position.
      if (width === 390) {
        const session = await context.newCDPSession(page);
        const y = box.y + box.height / 2;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .2, y }] });
        for (let step = 0; step < 6; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * (.2 + step * .1), y }] });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2, { steps: 8 });
        await page.mouse.up();
      }
      await page.waitForFunction(target => {
        const audio = document.querySelector('[data-beat-active]');
        return !audio.paused && Math.abs(audio.currentTime - target) < 3;
      }, tracks[0][2] * .7);
      await page.getByRole('button', { name: 'Pause GEEKED', exact: true }).click();
      await firstSeek.focus();
      await firstSeek.press('Home');
      assert.equal(await page.locator('.dcc-count b').textContent(), '01', 'Waveform gestures navigated the CDs');

      for (let index = 0; index < tracks.length; index++) {
        const [title, filename, duration] = tracks[index];
        if (index) {
          // Leave the preceding beat playing: the next CD crossfades automatically.
          const previous = await audio.elementHandle();
          await page.getByRole('button', { name: 'Tracks', exact: true }).click();
          await page.locator('.dcc-opt').nth(index).click();
          await page.waitForFunction(number => document.querySelector('.dcc-count b')?.textContent === String(number).padStart(2, '0'), index + 1);
          await page.waitForFunction(el => el.paused, previous);
          assert.equal(await previous.evaluate(el => el.paused), true, 'Previous beat continued after crossfade');
          await previous.dispose();
        }
        await page.waitForFunction(() => !document.querySelector('.dcc-root').hasAttribute('data-motion'));
        assert.equal(await page.locator('.dcc-title').textContent(), title);
        assert.equal(await audio.getAttribute('src'), `/audio/beats/${filename}.mp3`);
        if (!index) await page.getByRole('button', { name: `Play ${title}`, exact: true }).click();
        await page.waitForFunction(() => {
          const el = document.querySelector('[data-beat-active]');
          return !el.paused && el.currentTime > .1;
        });
        assert.ok(Math.abs(await audio.evaluate(el => el.duration) - duration) < .3, `Incorrect runtime: ${title}`);
        assert.equal(await page.locator('audio').evaluateAll(els => els.filter(el => !el.paused).length), 1);
        await page.getByRole('button', { name: `Pause ${title}`, exact: true }).click();
        assert.equal(await audio.evaluate(el => el.paused), true);
        const seek = page.getByRole('slider', { name: `Seek ${title}`, exact: true });
        await seek.focus();
        const before = await audio.evaluate(el => el.currentTime);
        await seek.press('ArrowRight');
        assert.ok(await audio.evaluate(el => el.currentTime) > before, 'Seek keyboard control did not seek');
        assert.equal(await page.locator('.dcc-count b').textContent(), String(index + 1).padStart(2, '0'), 'Seek key navigated the carousel');

        // Timer state belongs to the player, not the imperative 3D pose renderer.
        await page.evaluate(() => {
          window.__beatPoseWrites = 0;
          window.__beatObserver = new MutationObserver(records => {
            window.__beatPoseWrites += records.filter(record => record.target.matches('.dcc-slide,.dcc-roll,.dcc-glint')).length;
          });
          window.__beatObserver.observe(document.querySelector('.dcc-stage'), { subtree: true, attributes: true, attributeFilter: ['style'] });
        });
        await page.getByRole('button', { name: `Play ${title}`, exact: true }).click();
        await page.waitForTimeout(500);
        const writes = await page.evaluate(() => { window.__beatObserver.disconnect(); return window.__beatPoseWrites; });
        assert.equal(writes, 0, 'Audio timer rewrote the CD pose');
        if (!index) {
          await page.screenshot({ path: `.next/beats-${width}.png` });
          await page.locator('.dcc-slide[data-active]').click({ force: true });
          assert.equal(await audio.evaluate(el => el.paused), true, 'Clicking the selected CD did not pause');
          await page.locator('.dcc-slide[data-active]').click({ force: true });
          await page.waitForFunction(() => !document.querySelector('[data-beat-active]').paused);
        }
        const range = await context.request.get(`${base}/audio/beats/${filename}.mp3`, { headers: { Range: 'bytes=0-1023' } });
        assert.equal(range.status(), 206, `Byte-range seeking unsupported for ${title}`);
        assert.equal((await range.body()).length, 1024);
      }
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await audio.evaluate(el => el.paused), true, 'Hidden tab did not pause audio');
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForFunction(() => !document.querySelector('[data-beat-active]').paused);
      await page.getByRole('button', { name: 'Continue to reviews' }).click();
      await page.waitForFunction(() => Math.abs(document.querySelector('#testimonials').getBoundingClientRect().left) < 1).catch(async error => {
        console.log('Review transition state', await page.evaluate(() => ({ y: scrollY, left: document.querySelector('#testimonials').getBoundingClientRect().left, hidden: document.hidden, visibility: document.visibilityState, scrollers: [...document.querySelectorAll('*')].filter(el => el.scrollLeft).map(el => ({ tag: el.tagName, cls: el.className, left: el.scrollLeft })), focus: document.activeElement?.outerHTML.slice(0, 300) })));
        throw error;
      });
      await page.waitForFunction(() => document.querySelector('[data-beat-active]').paused);
      assert.deepEqual(errors, [], 'Browser runtime error');
      assert.deepEqual(failed, [], 'Failed resource');
      console.log(`PASS ${width}px: live audio-reactive bars, analyser sleeps on pause, first-interaction seeking, ${width === 390 ? 'touch' : 'mouse'} dragging/preview, six tracks, playback/runtime, two bounded decks with automatic crossfade, keyboard seek, CD click, no pose resets, range requests, hidden/offscreen pause`);
      if (width === 390) {
        // Apply the preference before loading: changing it mid-test also rebuilds
        // the hero's scroll runway, correctly pausing media that moves offscreen.
        const reducedPage = await context.newPage();
        await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
        await reducedPage.addInitScript(() => {
          window.__waveAudioReads = 0;
          const read = AnalyserNode.prototype.getByteFrequencyData;
          AnalyserNode.prototype.getByteFrequencyData = function(buffer) { window.__waveAudioReads++; read.call(this, buffer); };
        });
        await reducedPage.goto(base, { waitUntil: 'networkidle' });
        await reducedPage.locator('[aria-label="PRODWB audio introduction"][data-artwork-ready="true"]').waitFor();
        await reducedPage.getByRole('button', { name: 'Skip intro' }).click();
        await reducedPage.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: 'detached' });
        await reducedPage.locator('#cd-carousel').scrollIntoViewIfNeeded();
        
        await reducedPage.waitForFunction(() => document.querySelector('[data-beat-active]').currentTime > .1);
        await reducedPage.waitForTimeout(350);
        assert.equal(await reducedPage.evaluate(() => window.__waveAudioReads), 0, 'Reduced motion should suppress live bar animation');
        assert.equal(await reducedPage.locator('[data-beat-waveform] i').first().evaluate(el => getComputedStyle(el).animationName), 'none', 'Reduced motion should suppress playhead pulsing');
        await reducedPage.getByRole('slider', { name: 'Seek GEEKED', exact: true }).press('ArrowRight');
        assert.equal(await reducedPage.locator('.dcc-count b').textContent(), '01');
        await reducedPage.close();
        console.log('PASS reduced motion: no live bar/pulse animation, audio and keyboard seeking still work');
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
