// Run with: node scripts/verify-scroll.cjs [path to an installed playwright module]
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    const skip = page.getByRole("button", { name: "Skip intro" });
    if (await skip.isVisible()) {
      await skip.click();
      await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({ state: "detached" });
    }
    const metrics = await page.locator("[data-works-runway]").evaluate((el) => ({
      start: window.scrollY + el.getBoundingClientRect().top,
      end: window.scrollY + el.getBoundingClientRect().top + el.clientHeight - innerHeight,
    }));
    console.log("Runway", metrics);
    const sample = async (offset) => {
      await page.evaluate((top) => {
        const event = new CustomEvent("portfolio:scroll-seek", { detail: top, cancelable: true });
        if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: "instant" });
      }, metrics.start + offset);
      const expectedActive = `works-wheel-${Math.max(0, Math.min(5, Math.round(offset / 900 - 1)))}`;
      await page.waitForFunction((expectedActive) => {
        const wheel = document.querySelector("[data-works-wheel-stage]");
        const track = document.querySelector("[data-works-track]");
        const x = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        return wheel.getAttribute("aria-activedescendant") === expectedActive && Math.abs(x) < 3;
      }, expectedActive).catch(async (error) => {
        console.log("Failed sample", offset, await page.evaluate(() => ({
          y: scrollY,
          x: getComputedStyle(document.querySelector("[data-works-track]")).transform,
          active: document.querySelector("[data-works-wheel-stage]").getAttribute("aria-activedescendant"),
          height: document.documentElement.scrollHeight,
        })));
        throw error;
      });
      return page.evaluate(() => {
        const wheel = document.querySelector("[data-works-wheel-stage]");
        const track = document.querySelector("[data-works-track]");
        return {
          active: wheel.getAttribute("aria-activedescendant"),
          x: new DOMMatrixReadOnly(getComputedStyle(track).transform).m41,
          top: track.getBoundingClientRect().top,
          y: window.scrollY,
        };
      });
    };
    for (const beat of [1, 2, 3, 4, 5, 6]) {
      const state = await sample(beat * 900);
      console.log("Forward", beat, state);
      assert.equal(state.active, `works-wheel-${beat - 1}`);
      assert.ok(Math.abs(state.x) < 2, `Track should stay put: ${JSON.stringify(state)}`);
      assert.ok(Math.abs(state.top) < 2);
    }
    await page.evaluate((top) => {
      const event = new CustomEvent("portfolio:scroll-seek", { detail: top, cancelable: true });
      if (window.dispatchEvent(event)) window.scrollTo({ top, behavior: "instant" });
    }, metrics.end + 40);
    await page.waitForFunction(() => document.querySelector("#testimonials")?.getBoundingClientRect().top < innerHeight);
    for (const beat of [6, 5, 4, 3, 2, 1]) {
      const state = await sample(beat * 900);
      assert.equal(state.active, `works-wheel-${beat - 1}`);
      assert.ok(Math.abs(state.x) < 2);
    }
    await sample(5400);
    await page.mouse.move(640, 400);
    for (const beat of [5, 4, 3, 2, 1]) {
      await page.mouse.wheel(0, -900);
      await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 2, metrics.start + beat * 900);
      assert.equal(await page.locator("[data-works-wheel-stage]").getAttribute("aria-activedescendant"), `works-wheel-${beat - 1}`);
    }
    const state = await sample(0);
    assert.ok(Math.abs(state.x) < 2);
    await page.mouse.wheel(0, -650);
    await page.waitForTimeout(800);
    assert.ok(await page.evaluate(() => window.scrollY) < metrics.start - 100, "Unable to return to hero");
    await page.mouse.wheel(0, -1600);
    await page.waitForFunction(() => window.scrollY < 2);
    assert.ok(await page.evaluate(() => window.scrollY) < 2);
    assert.deepEqual(errors, []);
    console.log("PASS: forward cards, reverse 6→1, testimonials after runway, and return to hero.");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
