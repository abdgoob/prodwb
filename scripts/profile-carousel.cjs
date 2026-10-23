/* eslint-disable @typescript-eslint/no-require-imports -- Browser performance diagnostic. */
const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1366,height:768}});
    await page.goto(process.env.BASE_URL || 'http://localhost:3000', {waitUntil:'networkidle'});
    const skip = page.getByRole('button',{name:'Skip intro'});
    await skip.waitFor({state:'visible'});
    await page.locator('[aria-label="PRODWB audio introduction"][data-artwork-ready="true"]').waitFor();
    await skip.click({force:true});
    await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({state:'detached'});
    await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
    await page.locator('.dcc-root').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.dcc-idle img')].map(i=>i.decode()));});
    await page.waitForTimeout(800);
    const session=await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    await session.send('Emulation.setCPUThrottlingRate',{rate:4});
    const before=await session.send('Performance.getMetrics');
    const trace=[];
    session.on('Tracing.dataCollected',e=>trace.push(...e.value));
    await session.send('Tracing.start',{categories:'devtools.timeline',transferMode:'ReportEvents'});
    await page.evaluate(()=>{
      window.__frames=[];let last=performance.now();
      window.__sample=true;
      function sample(now){if(!window.__sample)return;window.__frames.push(now-last);last=now;requestAnimationFrame(sample);}
      requestAnimationFrame(sample);
      const runway=document.querySelector('#works > div');
      const top=scrollY+runway.getBoundingClientRect().top+5*innerHeight;
      window.dispatchEvent(new CustomEvent('portfolio:scroll-seek',{detail:{top,smooth:true},cancelable:true}));
    });
    await page.waitForTimeout(1800);
    const frames=await page.evaluate(()=>{window.__sample=false;return window.__frames.slice(1);});
    const after=await session.send('Performance.getMetrics');
    const done=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));
    await session.send('Tracing.end');await done;
    const sum={};for(const e of trace)if(e.ph==='X')sum[e.name]=(sum[e.name]||0)+(e.dur||0)/1000;
    const metric={};for(const m of after.metrics){const b=before.metrics.find(x=>x.name===m.name);if(b&&/Duration|Count/.test(m.name))metric[m.name]=m.value-b.value;}
    console.log(JSON.stringify({frames:frames.length,within34:frames.filter(x=>x<=34).length/frames.length,median:frames.sort((a,b)=>a-b)[Math.floor(frames.length/2)],metrics:metric,trace:Object.entries(sum).sort((a,b)=>b[1]-a[1]).slice(0,15)},null,2));
    await session.send('Emulation.setCPUThrottlingRate',{rate:1});
    await page.locator('.dcc-root').screenshot({path:`.next/${process.env.PROFILE_OUT||'profile'}.png`});
    fs.writeFileSync(`.next/${process.env.PROFILE_OUT||'profile'}-trace.json`,JSON.stringify(trace));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
