/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression and performance check. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1366, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 768 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.BASE_URL || 'http://localhost:3000', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: 'detached' });
      await page.waitForTimeout(1800);
      const session = await page.context().newCDPSession(page);
      await session.send('Performance.enable');
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const before = await session.send('Performance.getMetrics');
      const frames = await page.evaluate(() => new Promise(resolve => {
        const samples = []; let last = performance.now(); const start = last;
        function tick(now) { samples.push(now - last); last = now;
          if (now - start < 1600) requestAnimationFrame(tick); else resolve(samples.slice(1)); }
        requestAnimationFrame(tick);
      }));
      const after = await session.send('Performance.getMetrics');
      const metric = name => after.metrics.find(m => m.name === name).value - before.metrics.find(m => m.name === name).value;
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const geometry = await page.evaluate(() => {
        document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 3200; });
        return [...document.querySelectorAll('#hero-title circle')].filter((_,i) => i % 35 === 0).map(circle => {
          const r = circle.getBoundingClientRect(); return [r.x,r.y,r.width,r.height];
        });
      });
      const file = `.next/hero-baseline-${width}.json`;
      if (process.env.HERO_BASELINE) fs.writeFileSync(file, JSON.stringify(geometry));
      else if (fs.existsSync(file)) {
        const baseline = JSON.parse(fs.readFileSync(file,'utf8'));
        assert.equal(geometry.length, baseline.length);
        geometry.forEach((bounds,i) => bounds.forEach((value,j) => assert.ok(Math.abs(value-baseline[i][j])<.2, `Grain geometry changed: ${i}/${j}: ${value} vs ${baseline[i][j]}`)));
      }
      assert.equal(await page.locator('#hero-title circle').count(), 420);
      await page.screenshot({ path: `.next/hero-${process.env.HERO_BASELINE ? 'before' : 'after'}-${width}.png` });
      await page.evaluate(() => document.getAnimations().forEach(a => a.play()));
      const portrait = page.locator('[data-parallax-layer="2"] canvas');
      const box = await portrait.boundingBox();
      assert.ok(box);
      await page.mouse.move(box.x+box.width*.5, box.y+box.height*.4);
      await page.mouse.click(box.x+box.width*.5, box.y+box.height*.4);
      await page.mouse.wheel(0, 950);
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, -1600);
      await page.waitForFunction(() => scrollY < 2);
      await page.setViewportSize({ width: width-20, height: 800 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(150);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, frames:frames.length, median:frames.sort((a,b)=>a-b)[Math.floor(frames.length/2)], within34:frames.filter(t=>t<=34).length/frames.length, layouts:metric('LayoutCount'), layoutMs:metric('LayoutDuration')*1000, styleMs:metric('RecalcStyleDuration')*1000 }));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
