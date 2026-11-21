// node tools/sheet-shot.cjs <port> <collection> <out.png>
const { chromium } = require('playwright');
(async () => {
  const [port, c, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/tools/sheet.html?c=${c}`);
  await p.waitForSelector('body[data-done]', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true });
  console.log('saved', out, 'errors:', errs);
  await b.close();
})();
