/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser verification. */
const {chromium}=require(process.argv[2] || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  for(const width of process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [1280,390]) {
   const page=await browser.newPage({viewport:{width,height:844}});
   page.setDefaultTimeout(20000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'networkidle',timeout:90000});
   const skip=page.getByRole('button',{name:'Skip intro'});if(await skip.isVisible()) await skip.click();
   await page.locator('[aria-label="PRODWB audio introduction"]').waitFor({state:'detached'});
   await page.locator('#cd-carousel').scrollIntoViewIfNeeded();
   const root=page.locator('.dcc-root');await root.waitFor();
   assert.equal(await page.locator('.dcc-frame').count(),0);
   const seekUnit=async(unit)=>page.evaluate((step)=>{
    const runway=document.querySelector('#works > div');
    const top=scrollY+runway.getBoundingClientRect().top+step*innerHeight;
    const event=new CustomEvent('portfolio:scroll-seek',{detail:{top,smooth:false},cancelable:true});
    if(window.dispatchEvent(event))window.scrollTo({top,behavior:'instant'});
   },unit);
   for(let disc=0;disc<6;disc++){
    await seekUnit(disc);
    await page.waitForFunction((number)=>document.querySelector('.dcc-count b')?.textContent===String(number).padStart(2,'0'),disc+1);
    assert.ok((await page.locator('#testimonials').boundingBox()).x>width-12,'Reviews appeared before CD six finished');
   }
   await seekUnit(6);
   assert.equal(await page.locator('.dcc-count b').textContent(),'06');
   await page.mouse.move(width/2,400);
   await page.mouse.wheel(0,844);
   await page.waitForFunction(()=>Math.abs(document.querySelector('#testimonials').getBoundingClientRect().left)<10);
   await seekUnit(0);
   await page.waitForFunction(()=>document.querySelector('.dcc-count b')?.textContent==='01');
   await page.screenshot({path:`.next/carousel-face-${width}.png`});
   await page.getByRole('button',{name:'Next testimonial'}).click();
   await page.waitForFunction(()=>document.querySelector('.dcc-count b')?.textContent==='02');
   assert.equal(await page.locator('.dcc-count b').textContent(),'02');
   await root.press('ArrowLeft');
   await page.waitForFunction(()=>document.querySelector('.dcc-count b')?.textContent==='01');
   assert.equal(await page.locator('.dcc-count b').textContent(),'01');
   await root.press('End');
   await page.waitForFunction(()=>document.querySelector('.dcc-count b')?.textContent==='06');
   assert.equal(await page.locator('.dcc-count b').textContent(),'06');
   await page.getByRole('button',{name:'Continue to reviews'}).click();
   await page.waitForFunction(()=>Math.abs(document.querySelector('#testimonials').getBoundingClientRect().top)<10);
   await page.waitForFunction(()=>Math.abs(document.querySelector('#testimonials').getBoundingClientRect().left)<10);
   assert.equal(await page.locator('#testimonials figure').count(),6);
   await page.waitForFunction(()=>document.querySelector(".dcc-slide[data-active]")?.style.transform.endsWith("scale(1.000)"));
   const state=await page.evaluate(()=>{
    const slides=[...document.querySelectorAll('.dcc-slide')];
    const active=slides.find(el=>el.hasAttribute('data-active'));
    const other=slides.find(el=>!el.hasAttribute('data-active')&&getComputedStyle(el).visibility!=='hidden');
    return {visible:slides.filter(el=>getComputedStyle(el).visibility!=='hidden').length,activeFilter:getComputedStyle(active.querySelector('.dcc-disc')).filter,otherFilter:getComputedStyle(other.querySelector('.dcc-disc')).filter,transform:active.style.transform};
   });
   assert.ok(state.visible<=3,JSON.stringify(state));assert.equal(state.activeFilter,'none');assert.match(state.otherFilter,/blur\(2px\)/);assert.match(state.transform,/rotateY/);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`.next/testimonials-focus-${width}.png`});
   console.log(`PASS ${width}px: original 3D motion, sharp active CD, blurred neighbors, distant discs hidden, no frame, buttons and keyboard`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
