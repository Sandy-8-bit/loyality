import { chromium } from '@playwright/test';
import { mkdirSync,readFileSync,existsSync } from 'node:fs';
mkdirSync('.playwright-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.goto('http://localhost:3000/loyalty',{waitUntil:'networkidle'});
await page.screenshot({path:'.playwright-artifacts/customer-desktop.png',fullPage:true});
console.log('Customer desktop',await page.locator('body').evaluate(el=>({background:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily,overflow:el.scrollWidth>innerWidth})));
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'.playwright-artifacts/customer-mobile.png',fullPage:true});
console.log('Customer mobile overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await page.setViewportSize({width:1440,height:1050});
await page.goto('http://localhost:3000/admin/login',{waitUntil:'networkidle'});
await page.screenshot({path:'.playwright-artifacts/admin-login.png',fullPage:true});
if(existsSync('.admin-credentials.local')){
  const credentials=readFileSync('.admin-credentials.local','utf8');
  await page.getByLabel('Email address').fill(credentials.match(/^Email: (.+)$/m)[1]);
  await page.getByLabel('Password',{exact:true}).fill(credentials.match(/^Password: (.+)$/m)[1]);
  await page.getByRole('button',{name:'Sign in to dashboard'}).click();
  await page.waitForURL('**/admin/dashboard');
  await page.getByRole('heading',{name:'Little visits. Lasting connections.'}).waitFor();
  await page.screenshot({path:'.playwright-artifacts/dashboard-desktop.png',fullPage:true});
  for(const section of ['customers','codes','reward','settings','qr']){
    await page.goto(`http://localhost:3000/admin/${section}`,{waitUntil:'networkidle'});
    await page.screenshot({path:`.playwright-artifacts/admin-${section}.png`,fullPage:true});
    console.log(section,{alerts:await page.getByRole('alert').allTextContents(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:3000/admin/dashboard',{waitUntil:'networkidle'});
  await page.screenshot({path:'.playwright-artifacts/dashboard-mobile.png',fullPage:true});
  console.log('Admin mobile overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
}
console.log('Browser errors',errors);
await browser.close();
if(errors.length)process.exitCode=1;
