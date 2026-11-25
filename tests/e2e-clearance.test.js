/* مسار المخالصة في متصفح حقيقي: طلب برنامج طويل ← المالية ← توقيع المتدرب برسم الماوس ← اعتماد ← إرسال الشهادة
 * node tests/e2e-clearance.test.js */
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
    { id: 'obm-c', nameAr: 'شهادة إدارة السلوك التنظيمي - رخصة الاستشاري (OBM-C)', name: 'Organizational Behavior Management - Consultant (OBM-C)',
      type: 'long', category: 'obm', label: 'المستشار (OBM-C)', clearance: true, active: true, templates: [{ dir: 'obmc-mossab', label: 'مصعب' }] },
    { id: 'obm-p', nameAr: 'رخصة الممارس', name: 'OBM-P', type: 'long', category: 'obm', label: 'الممارس (OBM-P)', active: true },
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'Persuasion', type: 'short', active: true }]) });
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
  // 1) المتدرب يطلب
  await trainee('lina@example.com');
  // المربعات الثلاثة: تحليل السلوك بلا شهادات متاحة هنا فيُخفى، وإدارة السلوك التنظيمي تعرض خياراتها
  assert.ok(await page.isHidden('.cat[data-cat="aba"]'));
  assert.ok(await page.isHidden('#formRest'), 'form hidden until a type is chosen');
  await page.click('.cat[data-cat="obm"]');
  const pl = await page.textContent('#progList'); assert.ok(/الممارس/.test(pl) && /المستشار/.test(pl), pl);
  assert.doesNotMatch(await page.textContent('#vPortal'), /برنامج طويل|البرامج الطويلة/);
  await page.check('#progList input[value="obm-c"]');
  await page.screenshot({ path: path.join(OUT, 'cat-obm.png'), fullPage: false, clip: { x: 0, y: 380, width: 1280, height: 520 } });
  await page.fill('#fNameAr', 'لينا خالد العتيبي'); await page.fill('#fNameEn', 'LINA KHALID ALOTAIBI');
  await page.fill('#fPlatformEmail', 'lina.p@example.com'); await page.fill('#fCity', 'الرياض'); await page.fill('#fPhone', '0551234567');
  for (let i = 0; i < 11; i++) await page.click('.rate[data-i="' + i + '"] button[data-n="5"]');
  await page.fill('#fComment', 'ممتاز'); await page.click('#bSubmit');
  await page.waitForFunction(() => /وصل طلبك/.test(document.querySelector('#pMsg').textContent));
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com'), 'finance notified');
  // 2) المحاسب: يوجد مبلغ ← تم السداد ببيانات
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(S + 'admin.html');
  await page.click('#bForgot'); await page.fill('#rEmail', 'raljalajil@sulukera.com'); await page.click('#bSendReset');
  await page.waitForFunction(() => /رابط/.test(document.querySelector('#lMsg').textContent));
  const key = [...env.cache.keys()].find(k => k.startsWith('reset:'));
  await page.goto(S + 'admin.html?reset=' + key.slice(6));
  await page.fill('#nPass', 'Finance2026x'); await page.fill('#nPass2', 'Finance2026x'); await page.click('#bSetPass');
  await page.waitForSelector('#vAdmin:not(.hide)');
  await page.click('#aTabs button[data-f="__clr"]');
  await page.waitForSelector('tr.click'); await page.click('tr.click');
  await page.waitForSelector('#dClr:not(.hide) [data-o="due"]');
  await page.click('[data-o="due"]');
  await page.waitForSelector('#dClr [data-o="paid"]');
  await page.fill('#cHours', '72 ساعة'); await page.fill('#cTotal', 'SR 4,500'); await page.fill('#cStart', '2026-03-01');
  await page.screenshot({ path: path.join(OUT, 'clr-1-finance.png'), fullPage: true });
  await page.click('[data-o="paid"]');
  await page.waitForFunction(() => /أُصدرت المخالصة/.test(document.querySelector('#dMsg').textContent));
  // 3) اعتماد الشهادة قبل التوقيع ← تُحفظ ولا تُرسل
  await page.fill('#dStart', '2026-03-01');
  await page.click('#bGen'); await page.waitForSelector('#prev canvas', { timeout: 60000 });
  env.mails.length = 0;
  await page.click('#bOk');
  await page.waitForFunction(() => /تلقائياً/.test(document.querySelector('#dMsg').textContent));
  assert.ok(!env.mails.some(m => /🎓/.test(m.subject)), 'held, not sent');
  // 4) المتدرب يوقّع برسم الماوس
  await trainee('lina@example.com');
  await page.waitForSelector('#signAlert');
  await page.click('button[data-t="pMine"]'); await page.click('button.sign');
  await page.waitForSelector('#pSign:not(.hide) .clr-t');
  assert.match(await page.textContent('#clrDoc'), /SR 4,500[\s\S]*أقر وأؤكد/);
  await page.click('#bSign'); await page.waitForFunction(() => /الإقرار/.test(document.querySelector('#signMsg').textContent));
  await page.check('#clrAgree');
  await page.click('#bSign'); await page.waitForFunction(() => /ارسم/.test(document.querySelector('#signMsg').textContent));
  const box = await page.locator('#sigPad').boundingBox();
  await page.mouse.move(box.x + 40, box.y + 120); await page.mouse.down();
  for (let i = 0; i <= 30; i++) await page.mouse.move(box.x + 40 + i * 12, box.y + 120 - Math.sin(i / 3) * 50, { steps: 2 });
  await page.mouse.up();
  await page.screenshot({ path: path.join(OUT, 'clr-2-sign.png'), fullPage: true });
  await page.click('#bSign');
  await page.waitForFunction(() => /تم توقيع المخالصة/.test(document.querySelector('#signMsg').textContent));
  // 5) النتيجة: المخالصة موقّعة، الشهادة أُطلقت وأُرسلت، والمتدرب يحمّل الاثنتين
  assert.ok(env.mails.some(m => m.to === 'lina@example.com' && /🎓/.test(m.subject)), 'certificate released after signing');
  const doc = Object.values(env.docs)[0];
  assert.ok(doc.text.join(' ').includes('SR 4,500') && doc.images >= 1);
  await page.click('#bSignBack');
  await page.waitForSelector('button.dlc'); await page.waitForSelector('button.dl');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button.dlc')]);
  assert.match(dl.suggestedFilename(), /CLR-.*\.pdf$/);
  await page.screenshot({ path: path.join(OUT, 'clr-3-mine.png'), fullPage: true });
  // الجوال: مربع التوقيع يعمل باللمس ولا تمرير أفقي
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const mp = await m.newPage(); await mp.goto(S);
  assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth) <= 390);
  assert.deepStrictEqual(errors, []);
  await browser.close(); server.close();
  console.log('✓ e2e المخالصة: طلب ← مالية ← اعتماد معلّق ← توقيع ← إطلاق الشهادة');
})().catch(e => { console.error('✗ e2e المخالصة\n', e); process.exit(1); });
