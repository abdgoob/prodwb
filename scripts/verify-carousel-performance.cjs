/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS browser check. */
// Run with: node scripts/verify-carousel-performance.cjs [path to an installed playwright module]
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");

const percentile = (values, point) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * point))];
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.BASE_URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });

    const skip = page.getByRole("button", { name: "Skip intro" });
    if (await skip.isVisible()) {
      await page.locator('[aria-label="PRODWB audio introduction"][data-artwork-ready="true"]').waitFor();
      await skip.click({ force: true, noWaitAfter: true });
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: "detached", timeout: 10_000 });
    }

    const carousel = page.locator(".dcc-root");
    await page.locator("#cd-carousel").scrollIntoViewIfNeeded();
    await carousel.waitFor();
    const decoded = await page.locator(".dcc-idle img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      return images.map((image) => image.complete && image.naturalWidth > 0);
    });
    assert.ok(decoded.every(Boolean), "One or more optimized disc images failed to decode");

    const initial = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    const stage = await page.locator(".dcc-stage").boundingBox();
    assert.ok(stage, "Carousel stage was not measurable");
    const firstDisc = page.locator(".dcc-slide").first();
    const positions = [];

    await page.mouse.move(stage.x + stage.width * 0.92, stage.y + stage.height * 0.5);
    await page.mouse.down();
    for (let step = 0; step < 32; step += 1) {
      const progress = step / 31;
      await page.mouse.move(
        stage.x + stage.width * (0.92 - progress * 0.84),
        stage.y + stage.height * 0.5,
      );
      await page.waitForTimeout(20);
      positions.push(await firstDisc.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41));
    }
    await page.mouse.up();
    await page.waitForFunction((oldLabel) => document.querySelector('.dcc-slide[aria-current="true"]')?.getAttribute('aria-label') !== oldLabel, initial);
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));

    const finalActive = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    assert.notEqual(finalActive, initial, "Drag did not settle on a new disc");
    for (let index = 1; index < positions.length; index += 1) {
      assert.ok(positions[index] <= positions[index - 1] + 2, "Disc reversed during a slow drag");
    }

    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.evaluate(() => {
      const root = document.querySelector(".dcc-root");
      const matrix = document.querySelector("#works canvas");
      const glow = document.querySelector("body > canvas");
      const state = { running: true, last: performance.now(), frames: [], constrained: false, matrixPaused: false, glowPaused: false };
      window.__carouselPerf = state;
      const sample = (now) => {
        if (!state.running) return;
        state.frames.push({ duration: now - state.last, moving: root?.hasAttribute("data-motion") ?? false });
        state.last = now;
        state.constrained ||= root?.getAttribute("data-performance") === "constrained";
        state.matrixPaused ||= matrix?.hasAttribute("data-paused") ?? false;
        state.glowPaused ||= glow ? !glow.hasAttribute("data-enabled") : false;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await page.mouse.move(stage.x + stage.width * 0.08, stage.y + stage.height * 0.5);
    await page.mouse.down();
    for (let step = 0; step < 24; step += 1) {
      const progress = step / 23;
      await page.mouse.move(
        stage.x + stage.width * (0.08 + progress * 0.84),
        stage.y + stage.height * 0.5,
      );
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));

    const beforeKey = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    await carousel.press("ArrowRight");
    await page.waitForFunction((oldLabel) => document.querySelector('.dcc-slide[aria-current="true"]')?.getAttribute('aria-label') !== oldLabel, beforeKey);
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));
    assert.notEqual(
      await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label"),
      beforeKey,
      "Keyboard navigation did not settle on a new disc",
    );

    const perf = await page.evaluate(() => {
      window.__carouselPerf.running = false;
      return window.__carouselPerf;
    });
    const frames = perf.frames
      .slice(1)
      .filter((frame) => frame.moving && frame.duration < 250)
      .map((frame) => frame.duration);
    const withinBudget = frames.filter((frame) => frame <= 34).length / frames.length;
    let repeatedLongFrames = 0;
    let run = 0;
    for (const frame of frames) {
      run = frame > 100 ? run + 1 : 0;
      repeatedLongFrames = Math.max(repeatedLongFrames, run);
    }

    const metrics = {
      frames: frames.length,
      withinBudget: `${(withinBudget * 100).toFixed(1)}%`,
      median: percentile(frames, 0.5).toFixed(1),
      p95: percentile(frames, 0.95).toFixed(1),
      max: Math.max(...frames).toFixed(1),
    };
    console.log(JSON.stringify(metrics));

    assert.equal(perf.matrixPaused, false, "Matrix animation paused during carousel motion");
    assert.equal(perf.glowPaused, false, "Glow cursor paused during carousel motion");
    assert.ok(withinBudget >= 0.9, `Only ${(withinBudget * 100).toFixed(1)}% of frames met the 34ms budget`);
    assert.ok(repeatedLongFrames <= 1, "Carousel produced repeated frames longer than 100ms");
    assert.equal(await carousel.getAttribute("data-motion"), null, "Carousel remained in its moving state");
    assert.equal(await page.locator("#works canvas").getAttribute("data-paused"), null, "Matrix did not resume after settling");
    assert.notEqual(await page.locator("body > canvas").getAttribute("data-enabled"), null, "Glow cursor did not resume after settling");
    const restingEffects = await carousel.evaluate((root) => {
      const inactiveDisc = root.querySelector(".dcc-slide:not([data-active]) .dcc-disc");
      const activeSheen = root.querySelector(".dcc-slide[data-active] .dcc-sheen");
      const activeEdge = root.querySelector(".dcc-slide[data-active] .dcc-edge");
      return {
        filter: inactiveDisc ? getComputedStyle(inactiveDisc).filter : "",
        mask: inactiveDisc ? getComputedStyle(inactiveDisc).maskImage : "",
        baked: inactiveDisc?.hasAttribute('data-baked') ?? false,
        sheen: activeSheen ? getComputedStyle(activeSheen).display : "none",
        edge: activeEdge ? getComputedStyle(activeEdge).display : "none",
      };
    });
    assert.match(restingEffects.filter, /blur/, "Full-quality resting blur was not restored");
    assert.ok(restingEffects.baked || restingEffects.mask !== "none", "The resting disc lost its centre cutout");
    assert.notEqual(restingEffects.sheen, "none", "Full-quality resting sheen was not restored");
    assert.notEqual(restingEffects.edge, "none", "Full-quality resting disc edge was not restored");
    assert.deepEqual(errors, []);

    await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    const beforeWheel = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    const rootBox = await carousel.boundingBox();
    assert.ok(rootBox, "Carousel root was not measurable");
    await page.mouse.move(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
    await page.mouse.wheel(90, 0);
    await page.waitForFunction(
      (previous) => {
        const root = document.querySelector(".dcc-root");
        return !root?.hasAttribute("data-motion") && root?.querySelector('[aria-current="true"]')?.getAttribute("aria-label") !== previous;
      },
      beforeWheel,
    );

    const beforeFlick = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    const currentStage = await page.locator(".dcc-stage").boundingBox();
    assert.ok(currentStage, "Carousel stage disappeared before flick testing");
    await page.mouse.move(currentStage.x + currentStage.width * 0.88, currentStage.y + currentStage.height / 2);
    await page.mouse.down();
    await page.mouse.move(currentStage.x + currentStage.width * 0.12, currentStage.y + currentStage.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));
    assert.notEqual(
      await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label"),
      beforeFlick,
      "Fast flick did not settle on a new disc",
    );

    const beforeReverse = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    await carousel.press("ArrowLeft");
    await page.waitForTimeout(50);
    await carousel.press("ArrowRight");
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));
    assert.equal(
      await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label"),
      beforeReverse,
      "A rapid direction reversal settled on the wrong disc",
    );

    const widthBeforeResize = (await page.locator(".dcc-stage").boundingBox())?.width;
    await page.setViewportSize({ width: 1024, height: 700 });
    await page.waitForTimeout(300);
    const widthAfterResize = (await page.locator(".dcc-stage").boundingBox())?.width;
    assert.ok(widthBeforeResize && widthAfterResize && widthAfterResize !== widthBeforeResize, "Carousel did not respond to resize");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const beforeReduced = await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label");
    const reducedStarted = Date.now();
    await carousel.press("ArrowRight");
    await page.waitForFunction(() => !document.querySelector(".dcc-root")?.hasAttribute("data-motion"));
    assert.ok(Date.now() - reducedStarted < 500, "Reduced-motion navigation did not settle immediately");
    assert.notEqual(
      await carousel.locator('.dcc-slide[aria-current="true"]').getAttribute("aria-label"),
      beforeReduced,
      "Reduced-motion navigation did not change the active disc",
    );

    assert.deepEqual(errors, []);
    console.log("PASS: performance, slow drag, flick, wheel, keyboard, reversal, resize, and reduced motion.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
