/* تعديل الاسم ولوحة المتابعة في متصفح حقيقي: إصدار ← المتدرب يطلب تعديل الاسم ← المحاسب «تم السداد» ← إعادة الإصدار بنفس الرقم
 * node tests/e2e-namechange.test.js */
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');
const { createEnv } = require('./gas-mock');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const API = 'https://script.google.com/macros/s/TEST/exec';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const SITE = 'http://localhost:' + server.address().port + '/';
  const env = createEnv({ coursesJson: JSON.stringify([
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'The Art of Persuasion and Influence', type: 'short', active: true }]) });
  env.ctx.setup(); env.props.SITE_URL = SITE;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.route('**/assets/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.SLK_CONFIG={API_URL:"' + API + '"};' }));
  await ctx.route(API, async r => r.fulfill({ contentType: 'application/json', body: env.ctx.doPost({ postData: { contents: r.request().postData() } }).content }));
  const errors = [], page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const S = SITE;
  async function trainee(email) {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => { });
    await page.goto(S); await page.fill('#lEmail', email); await page.click('#bSend');
    await page.waitForSelector('#step2:not(.hide)'); await page.fill('#lCode', env.cache.get('otp:' + email));
    await page.waitForSelector('#vPortal:not(.hide)');
  }
  async function admin(email, pw) {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => { });
    await page.goto(S + 'admin.html');
    await page.click('#bForgot'); await page.fill('#rEmail', email); await page.click('#bSendReset');
    await page.waitForFunction(() => /رابط/.test(document.querySelector('#lMsg').textContent));
    const key = [...env.cache.keys()].filter(k => k.startsWith('reset:')).pop();
    await page.goto(S + 'admin.html?reset=' + key.slice(6));
    await page.fill('#nPass', pw); await page.fill('#nPass2', pw); await page.click('#bSetPass');
    await page.waitForSelector('#vAdmin:not(.hide)');
  }
  // 1) طلب وإصدار
  await trainee('omar@example.com');
  await page.click('.cat[data-cat="short"]'); await page.check('#courseList input[value="persuasion-influence"]');
  await page.fill('#fNameAr', 'عمر سالم الدوسري'); await page.fill('#fNameEn', 'Omar Salim Aldosari');
  await page.fill('#fPlatformEmail', 'omar.p@example.com'); await page.fill('#fCity', 'جدة'); await page.fill('#fPhone', '0561234567');
  for (let i = 0; i < 11; i++) await page.click('.rate[data-i="' + i + '"] button[data-n="' + (i === 10 ? 9 : 4 + (i % 2)) + '"]');
  await page.fill('#fComment', 'دورة مفيدة'); await page.click('#bSubmit');
  await page.waitForFunction(() => /وصل طلبك/.test(document.querySelector('#pMsg').textContent));
  await admin('maryam@sulukera.com', 'Maryam2026xx');
  await page.waitForSelector('tr.click'); await page.click('tr.click');
  await page.fill('#dStart', '2026-11-02'); await page.click('#bGen'); await page.waitForSelector('#prev canvas', { timeout: 60000 });
  await page.click('#bOk'); await page.waitForFunction(() => /صدرت الشهادة/.test(document.querySelector('#dMsg').textContent));
  const certNo = env.api('verify', { certNo: 'SLK-' + new Date().getFullYear() + '-000001' }).data.certNo;
  // 2) المتدرب يطلب تعديل الاسم
  await trainee('omar@example.com');
  await page.click('button[data-t="pMine"]'); await page.click('button.ncb');
  await page.waitForSelector('#pNc:not(.hide)');
  assert.strictEqual(await page.inputValue('#ncOld'), 'Omar Salim Aldosari');
  await page.fill('#ncNew', 'OMAR SALEM AL-DOSARI'); await page.fill('#ncWhy', 'خطأ إملائي في اسم الأب');
  assert.match(await page.textContent('#ncPreview'), /Omar Salem Al-Dosari/);
  await page.screenshot({ path: path.join(OUT, 'nc-1-request.png'), fullPage: true });
  await page.click('#bNcSend');
  await page.waitForFunction(() => /استلمنا طلب تعديل الاسم/.test(document.querySelector('#mineMsg').textContent));
  assert.match(await page.textContent('#mineList'), /بانتظار تأكيد السداد/);
  assert.strictEqual(await page.locator('button.ncb').count(), 0, 'no second request while pending');
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com' && /تعديل اسم/.test(m.subject)));
  // 3) المحاسب: تبويب «تعديل الاسم» ← تم السداد ← إعادة الإصدار تلقائياً
  await admin('raljalajil@sulukera.com', 'Finance2026x');
  assert.strictEqual(await page.textContent('#cNc'), '1');
  await page.click('#aTabs button[data-f="__nc"]');
  await page.waitForSelector('tr.click'); await page.click('tr.click');
  await page.waitForSelector('#dNc:not(.hide) [data-nc="paid"]');
  await page.screenshot({ path: path.join(OUT, 'nc-2-finance.png'), fullPage: true });
  env.mails.length = 0;
  await page.click('[data-nc="paid"]');
  await page.waitForFunction(() => /عُدّل الاسم/.test(document.querySelector('#dMsg').textContent), null, { timeout: 60000 });
  assert.ok(env.mails.some(m => m.to === 'omar@example.com' && /🎓/.test(m.subject) && /تم تعديل الاسم/.test(m.htmlBody)));
  const v = env.api('verify', { certNo }).data;
  assert.strictEqual(v.status, 'valid'); assert.strictEqual(v.name, 'Omar Salem Al-Dosari');
  assert.match(await page.textContent('#dNc'), /تم التعديل/);
  // 4) لوحة المتابعة
  await page.click('#bCloseD');
  await page.click('#aTabs button[data-f="__dash"]');
  await page.waitForSelector('#aDash .kpis');
  const dash = await page.textContent('#aDash');
  assert.match(dash, /صدرت هذا الشهر/); assert.match(dash, /تعديل الاسم وإعادة الإصدار/); assert.match(dash, /رضا المتدربين/);
  await page.screenshot({ path: path.join(OUT, 'dash.png'), fullPage: true });
  // الجوال: لا تمرير أفقي في المتابعة
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const wide = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > 392 || e.getBoundingClientRect().left < -2).slice(0, 8).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().width)));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no horizontal scroll on mobile dashboard: ' + wide.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'dash-mobile.png'), fullPage: true });
  assert.deepStrictEqual(errors, []);
  await browser.close(); server.close();
  console.log('✓ e2e تعديل الاسم ولوحة المتابعة');
})().catch(e => { console.error('✗ e2e تعديل الاسم\n', e); process.exit(1); });
