/* eslint-disable @typescript-eslint/no-require-imports -- One-off artwork build script. */
const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
    await page.goto("http://localhost:3000/?bake-disc-faces", { waitUntil: "domcontentloaded" });
    const skip = page.getByRole("button", { name: "Skip intro" });
    if (await skip.isVisible()) await skip.click({ force: true });
    await page.locator(".dcc-idle").first().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('.dcc-idle img')].map((image) => image.decode()));
    });
    for (let i = 0; i < 6; i++) {
      await page.evaluate((index) => {
        document.querySelector('[data-disc-bake]')?.remove();
        const source = document.querySelectorAll('.dcc-idle')[index];
        const clone = source.cloneNode(true);
        clone.setAttribute('data-disc-bake', '');
        Object.assign(clone.style, {
          position: 'fixed', left: '0', top: '0', width: '1200px', height: '1200px',
          borderRadius: '50%', overflow: 'hidden', transform: 'none', zIndex: '999999',
          webkitMask: 'radial-gradient(circle closest-side,transparent 16.6%,#000 17.1%)',
          mask: 'radial-gradient(circle closest-side,transparent 16.6%,#000 17.1%)',
        });
        for (const child of clone.children) Object.assign(child.style, {
          position: 'absolute', inset: '0', width: '100%', height: '100%', maxWidth: 'none',
          display: 'block', objectFit: 'cover',
        });
        document.querySelector('main').style.visibility = 'hidden';
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
        document.body.append(clone);
      }, i);
      await page.screenshot({ path: path.join(__dirname, '..', 'public', 'works', `face-${i + 1}.png`),
        clip: { x: 0, y: 0, width: 1200, height: 1200 }, omitBackground: true });
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
