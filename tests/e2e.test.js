/* اختبار شامل في متصفح حقيقي: الواجهة الحقيقية + Code.gs الحقيقي على خدمات Apps Script محاكاة
 * node tests/e2e.test.js   (يحتاج playwright وإنترنت لخطوط Google و CDN)
 * يحفظ لقطات في tests/out/ */
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');
const { createEnv } = require('./gas-mock');

const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const API = 'https://script.google.com/macros/s/TEST/exec';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const SITE = 'http://localhost:' + server.address().port + '/';
  const env = createEnv({ coursesJson: fs.readFileSync(path.join(ROOT, 'templates/courses.json'), 'utf8') });
  env.ctx.setup();
  env.props.SITE_URL = SITE;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.route('**/assets/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.SLK_CONFIG={API_URL:"' + API + '"};' }));
  await ctx.route(API, async r => {
    const body = JSON.parse(r.request().postData());
    assert.strictEqual(r.request().headers()['content-type'].split(';')[0], 'text/plain');
    const out = env.ctx.doPost({ postData: { contents: JSON.stringify(body) } });
    r.fulfill({ contentType: 'application/json', body: out.content, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'إصدار بالخطأ' : undefined));

  // دخول الإدارة: أول مرة برابط تعيين كلمة المرور (من الذاكرة المؤقتة كأنه وصل بالإيميل)، بعدها بالبريد وكلمة المرور
  const PW = 'Sulukera2026x';
  async function adminLogin(email) {
    if (!env.props['pw:' + email]) {
      await page.goto(SITE + 'admin.html');
      await page.click('#bForgot'); await page.fill('#rEmail', email); await page.click('#bSendReset');
      await page.waitForFunction(() => /رابط/.test(document.querySelector('#lMsg').textContent));
      const key = [...env.cache.keys()].find(k => k.startsWith('reset:') && env.cache.get(k) === email);
      await page.goto(SITE + 'admin.html?reset=' + key.slice(6));
      await page.fill('#nPass', PW); await page.fill('#nPass2', PW); await page.click('#bSetPass');
    } else {
      await page.goto(SITE + 'admin.html');
      await page.fill('#lEmail', email); await page.fill('#lPass', PW); await page.click('#bLogin');
    }
    await page.waitForSelector('#vAdmin:not(.hide)');
    assert.ok(!page.url().includes('reset='), 'reset token removed from URL');
  }
  async function login(email) {
    await page.fill('#lEmail', email); await page.click('#bSend');
    await page.waitForSelector('#step2:not(.hide)');
    await page.fill('#lCode', env.cache.get('otp:' + email));
  }

  // ---------- المتدرب ----------
  await page.goto(SITE);
  await login('sara@example.com');
  await page.waitForSelector('#vPortal:not(.hide)');
  await page.waitForSelector('#courseList input[value="persuasion-influence"]');
  await page.check('#courseList input[value="persuasion-influence"]');
  await page.fill('#fNameAr', 'سارة أحمد الحربي');
  await page.fill('#fNameEn', 'Sara Ahmed Al-Harbi');
  await page.fill('#fPlatformEmail', 'sara.platform@example.com');
  await page.fill('#fCity', 'الرياض');
  await page.fill('#fPhone', '0501234567');
  assert.strictEqual(await page.$$eval('.rate', l => l.length), 11);
  assert.strictEqual(await page.$$eval('.rate.ten button', l => l.length), 10);
  // بدون الاستبيان يُرفض
  await page.click('#bSubmit');
  assert.match(await page.textContent('#pMsg'), /استبيان/);
  for (let i = 0; i < 11; i++) await page.click('.rate[data-i="' + i + '"] button[data-n="' + (i === 10 ? 9 : 5 - (i % 2)) + '"]');
  await page.click('#bSubmit');
  assert.match(await page.textContent('#pMsg'), /ملاحظاتك/);
  await page.fill('#fComment', 'دورة رائعة');
  await page.screenshot({ path: path.join(OUT, '1-portal-form.png'), fullPage: true });
  await page.click('#bSubmit');
  await page.waitForFunction(() => /وصل طلبك/.test(document.querySelector('#pMsg').textContent));
  assert.match(await page.textContent('#pMsg'), /يومين إلى ثلاثة أيام عمل/);
  // طلب مكرر
  await page.check('#courseList input[value="persuasion-influence"]');
  await page.fill('#fNameAr', 'سارة أحمد الحربي');
  await page.fill('#fNameEn', 'Sara Ahmed Al-Harbi');
  await page.fill('#fPlatformEmail', 'sara.platform@example.com');
  await page.fill('#fCity', 'الرياض');
  await page.fill('#fComment', 'مرة ثانية');
  await page.fill('#fPhone', '0501234567');
  for (let i = 0; i < 11; i++) await page.click('.rate[data-i="' + i + '"] button[data-n="4"]');
  await page.click('#bSubmit');
  await page.waitForFunction(() => /قيد المراجعة/.test(document.querySelector('#pMsg').textContent));
  await page.click('button[data-t="pMine"]');
  await page.screenshot({ path: path.join(OUT, '2-portal-mine-pending.png'), fullPage: true });

  // لوحة الإدارة تطلب كلمة مرور ولا تقبل جلسة المتدرب
  await page.goto(SITE + 'admin.html');
  await page.waitForSelector('#fLogin:not(.hide)');
  assert.ok(await page.isHidden('#vAdmin'));
  await page.screenshot({ path: path.join(OUT, '7-admin-login.png'), fullPage: true });
  // كلمة مرور خاطئة
  await page.fill('#lEmail', 'maryam@sulukera.com'); await page.fill('#lPass', 'wrong-pass-1'); await page.click('#bLogin');
  await page.waitForFunction(() => /غير صحيحة/.test(document.querySelector('#lMsg').textContent));

  // ---------- المراجِعة ----------
  await adminLogin('maryam@sulukera.com');
  await page.waitForSelector('tr.click');
  assert.match(await page.textContent('#aList'), /سارة أحمد الحربي/);
  await page.screenshot({ path: path.join(OUT, '3-admin-list.png'), fullPage: true });
  await page.click('tr.click');
  await page.waitForSelector('#dInfo div');
  assert.match(await page.textContent('#dInfo'), /0501234567/);
  assert.strictEqual(await page.inputValue('#dStart'), '');
  assert.match(await page.textContent('#dStartSrc'), /أدخليه/);
  await page.fill('#dStart', '2026-09-07');
  assert.match(await page.textContent('#dEndSrc'), /تاريخ تقديم الطلب/);
  await page.fill('#dEnd', '2026-09-09');
  await page.fill('#dNameEn', 'Abdulrahman Mohammed Abdullah Al-Qahtani');
  await page.click('#bGen');
  await page.waitForSelector('#prev canvas', { timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, '4-admin-preview.png'), fullPage: true });
  const png = await page.$eval('#prev canvas', c => c.toDataURL('image/jpeg', 0.9));
  fs.writeFileSync(path.join(OUT, 'generated-certificate.jpg'), Buffer.from(png.split(',')[1], 'base64'));

  env.mails.length = 0;
  await page.click('#bTest');
  await page.waitForFunction(() => /تجريبية/.test(document.querySelector('#dMsg').textContent));
  assert.strictEqual(env.mails.length, 1); assert.strictEqual(env.mails[0].to, 'maryam@sulukera.com');
  const pdf = env.mails[0].attachments[0]._buf;
  assert.strictEqual(pdf.slice(0, 4).toString(), '%PDF');
  fs.writeFileSync(path.join(OUT, 'certificate.pdf'), pdf);

  await page.click('#bOk');
  await page.waitForFunction(() => /صدرت الشهادة/.test(document.querySelector('#dMsg').textContent));
  assert.strictEqual(env.mails[1].to, 'sara@example.com');
  const sh = env.sheet('الطلبات'); const certNo = sh.data[1][sh.data[0].indexOf('رقم الشهادة')];
  assert.match(certNo, /^SLK-\d{4}-000001$/);

  // ---------- التحقق (رابط QR) ----------
  await page.goto(SITE + '?v=' + certNo);
  await page.waitForSelector('#verifyBody h1');
  assert.match(await page.textContent('#verifyBody'), /شهادة صحيحة[\s\S]*Abdulrahman[\s\S]*09\/07\/2026[\s\S]*09\/09\/2026/);
  await page.screenshot({ path: path.join(OUT, '5-verify-valid.png'), fullPage: true });

  // ---------- المتدرب يحمّل ----------
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(SITE);
  await page.fill('#lEmail', 'sara@example.com'); await page.click('#bSend');
  await page.waitForSelector('#step2:not(.hide)');
  await page.check('#lRemember');
  await page.fill('#lCode', env.cache.get('otp:sara@example.com'));
  await page.waitForSelector('#vPortal:not(.hide)');
  assert.ok((await page.evaluate(() => localStorage.getItem('slk_tok'))).startsWith('r1.'), 'remember token kept on device');
  await page.reload(); await page.waitForSelector('#vPortal:not(.hide)'); // ما زال مسجّلاً بعد إعادة التحميل
  await page.click('button[data-t="pMine"]');
  await page.waitForSelector('button.dl');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button.dl')]);
  assert.match(dl.suggestedFilename(), new RegExp(certNo + '.*\\.pdf$'));

  // ---------- الإلغاء ----------
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await adminLogin('maryam@sulukera.com');
  await page.click('#aTabs button[data-f="صادرة"]');
  await page.click('tr.click');
  await page.waitForSelector('#bRevoke');
  await page.click('#bRevoke');
  await page.waitForFunction(() => /أُلغيت/.test(document.querySelector('#dMsg').textContent));
  await page.goto(SITE + '?v=' + certNo);
  await page.waitForSelector('#verifyBody h1');
  assert.match(await page.textContent('#verifyBody h1'), /ملغاة/);
  await page.goto(SITE + '?v=SLK-2026-123456');
  await page.waitForSelector('#verifyBody h1');
  assert.match(await page.textContent('#verifyBody h1'), /لم نعثر/);

  // جوال
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(SITE);
  const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(sw <= 390, 'horizontal scroll on mobile: ' + sw);
  await mp.screenshot({ path: path.join(OUT, '6-mobile-login.png') });

  assert.deepStrictEqual(errors, []);
  await browser.close(); server.close();
  console.log('✓ e2e: كل المسار يعمل في المتصفح — اللقطات في tests/out/');
})().catch(e => { console.error('✗ e2e\n', e); process.exit(1); });
