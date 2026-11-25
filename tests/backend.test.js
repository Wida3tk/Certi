/* اختبارات القبول للخلفية: node tests/backend.test.js */
const assert = require('assert');
const { createEnv } = require('./gas-mock');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); }
  catch (e) { console.error('✗ ' + name + '\n  ' + (e.stack || e)); process.exitCode = 1; }
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const PDF = Buffer.from('%PDF-1.3\n%fake\n').toString('base64');
const ADMIN = 'maryam@sulukera.com';

/** دخول الإدارة: رابط التعيين من الذاكرة المؤقتة ← كلمة مرور ← جلسة إدارة */
function adminLogin(env, email, pw = 'Sulukera2026x') {
  email = email.toLowerCase();
  const props = env.props;
  if (!props['pw:' + email]) {
    assert.strictEqual(env.api('adminResetRequest', { email }).ok, true);
    const key = [...env.cache.keys()].reverse().find(k => k.startsWith('reset:') && env.cache.get(k) === email);
    assert.ok(key, 'reset link for ' + email);
    const r = env.api('adminSetPassword', { reset: key.slice(6), password: pw });
    assert.strictEqual(r.ok, true, r.error);
    return r.data.token;
  }
  const r = env.api('adminLogin', { email, password: pw });
  assert.strictEqual(r.ok, true, r.error);
  return r.data.token;
}
function login(env, email) {
  assert.strictEqual(env.api('requestCode', { email }).ok, true);
  const code = env.cache.get('otp:' + email.toLowerCase());
  const r = env.api('verifyCode', { email, code });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  return r.data.token;
}
function fresh(opts) { const env = createEnv(opts); env.ctx.setup(); return env; }
const SURVEY = [5, 4, 5, 3, 5, 4, 5, 5, 4, 5, 9];
const form = (over = {}) => Object.assign({ courseId: 'persuasion-influence', nameEn: 'Sara Ahmed Al-Harbi', nameAr: 'سارة أحمد الحربي',
  platformEmail: 'sara.platform@x.com', city: 'الرياض', phone: '0501234567',
  survey: SURVEY, comment: 'ممتازة' }, over);

test('setup ينشئ تبويبات الطلبات والرضا والسجل فقط', () => {
  const env = fresh();
  const names = env.spreadsheets[env.props.SHEET_ID].getSheets().map(s => s.name);
  assert.strictEqual(names.sort().join(), ['الرضا', 'الطلبات', 'السجل'].sort().join());
  assert.ok(env.props.CERTS_FOLDER && !env.props.PROOFS_FOLDER);
});

test('doGet يرجع حالة فقط', () => {
  const env = fresh();
  assert.strictEqual(JSON.parse(env.ctx.doGet().content).ok, true);
});

test('متدرب جديد: دخول برمز ← طلب كامل ← يظهر في اللوحة', () => {
  const env = fresh();
  const t = login(env, 'Sara@X.com');
  const me = env.api('getMyData', { token: t }).data;
  assert.strictEqual(me.courses.map(c => c.id).join(), 'persuasion-influence,specialist,abat');
  assert.strictEqual(me.courses[0].nameAr, 'فن الإقناع والتأثير'); // غير المفعّلة مخفية
  assert.strictEqual(me.survey.length, 11);
  const r = env.api('submitRequest', { token: t, data: form() });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(env.sheet('الرضا').data.length, 2);
  assert.strictEqual(env.sheet('الرضا').data[1].slice(4, 15).join(), SURVEY.join());
  assert.strictEqual(env.sheet('الرضا').data[1][15], 'ممتازة');
  assert.ok(env.mails.some(m => m.to === 'sara@x.com' && /استلمنا/.test(m.subject) && /يومين إلى ثلاثة أيام عمل/.test(m.htmlBody)));
  const ta = adminLogin(env, ADMIN);
  const list = env.api('adminList', { token: ta }).data;
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].status, 'بانتظار المراجعة');
  const d = env.api('adminGet', { token: ta, id: list[0].id }).data;
  assert.strictEqual(d.phone, '0501234567');
  assert.strictEqual(d.nameAr, 'سارة أحمد الحربي');
});

test('رمز خاطئ 5 مرات يُقفل حتى مع الرمز الصحيح', () => {
  const env = fresh();
  env.api('requestCode', { email: 'a@b.com' });
  const code = env.cache.get('otp:a@b.com');
  for (let i = 0; i < 5; i++) assert.strictEqual(env.api('verifyCode', { email: 'a@b.com', code: '000000' }).ok, false);
  const r = env.api('verifyCode', { email: 'a@b.com', code });
  assert.strictEqual(r.ok, false); assert.match(r.error, /محاولات/);
  assert.strictEqual(env.api('requestCode', { email: 'a@b.com' }).ok, false);
});

test('بدون جلسة أو بجلسة شخص آخر: لا بيانات', () => {
  const env = fresh();
  const t1 = login(env, 'one@x.com');
  env.api('submitRequest', { token: t1, data: form() });
  assert.strictEqual(env.api('getMyData', { token: 'fake' }).ok, false);
  assert.strictEqual(env.api('getMyData', {}).ok, false);
  const t2 = login(env, 'two@x.com');
  assert.strictEqual(env.api('getMyData', { token: t2 }).data.requests.length, 0);
});

test('غير المشرف لا يستدعي أي action إداري', () => {
  const env = fresh();
  const t = login(env, 'student@x.com');
  const r0 = env.api('submitRequest', { token: t, data: form() });
  for (const a of ['adminList', 'adminGet', 'adminReserveNumber', 'adminApprove', 'adminReject', 'adminRevoke']) {
    const r = env.api(a, { token: t, id: r0.data.id, data: { id: r0.data.id } });
    assert.strictEqual(r.ok, false, a); assert.match(r.error, /غير مصرّح/, a);
  }
  // حتى رمز دخول المشرف كمتدرب (OTP) لا يفتح أي إجراء إداري
  const tOtp = login(env, ADMIN);
  assert.match(env.api('adminList', { token: tOtp }).error, /غير مصرّح/);
});

test('إجراء غير معروف أو JSON تالف', () => {
  const env = fresh();
  assert.strictEqual(env.api('setup').ok, false);
  assert.strictEqual(env.api('__proto__').ok, false);
  assert.strictEqual(JSON.parse(env.ctx.doPost({ postData: { contents: '{bad' } }).content).ok, false);
});

test('تحقق المدخلات: اسم عربي، استبيان ناقص، بلا صورة، دورة غير مفعّلة', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  assert.match(env.api('submitRequest', { token: t, data: form({ nameEn: 'سارة' }) }).error, /الإنجليزية/);
  assert.match(env.api('submitRequest', { token: t, data: form({ survey: [5, 5, 0, 5, 5, 5, 5, 5, 5, 5, 5] }) }).error, /استبيان/);
  assert.match(env.api('submitRequest', { token: t, data: form({ survey: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 11] }) }).error, /استبيان/);
  assert.match(env.api('submitRequest', { token: t, data: form({ survey: [6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10] }) }).error, /استبيان/);
  assert.match(env.api('submitRequest', { token: t, data: form({ comment: '  ' }) }).error, /ملاحظاتك/);
  assert.match(env.api('submitRequest', { token: t, data: form({ nameAr: 'Sara' }) }).error, /بالعربية/);
  assert.match(env.api('submitRequest', { token: t, data: form({ platformEmail: 'x' }) }).error, /المنصة/);
  assert.match(env.api('submitRequest', { token: t, data: form({ city: '' }) }).error, /المدينة/);
  assert.match(env.api('submitRequest', { token: t, data: form({ phone: '' }) }).error, /الجوال/);
  assert.match(env.api('submitRequest', { token: t, data: form({ phone: '05x1' }) }).error, /الجوال/);
  assert.strictEqual(env.api('submitRequest', { token: t, data: form({ phone: '+966 50 123 4567' }) }).ok, true);
  assert.match(env.api('submitRequest', { token: t, data: form({ courseId: 'old-course' }) }).error, /الدورة/);
});

test('معادلة في التعليق تُخزّن نصاً', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  env.api('submitRequest', { token: t, data: form({ comment: '=IMPORTXML("http://x")', phone: '+966500000000' }) });
  assert.strictEqual(env.sheet('الرضا').data[1][15], "'=IMPORTXML(\"http://x\")");
});

test('طلب مكرر لنفس الدورة يُرفض برسالة واضحة', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  assert.strictEqual(env.api('submitRequest', { token: t, data: form() }).ok, true);
  const r = env.api('submitRequest', { token: t, data: form() });
  assert.strictEqual(r.ok, false); assert.match(r.error, /قيد المراجعة/);
});

test('الإرسال التجريبي يصل للمراجِعة فقط ولا يغيّر الحالة', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  const ta = adminLogin(env, ADMIN);
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  env.mails.length = 0;
  const r = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, test: true, start: '2026-09-07', end: '2026-09-09' } });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(env.mails.length, 1);
  assert.strictEqual(env.mails[0].to, ADMIN);
  assert.match(env.mails[0].subject, /تجربة/);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.status, 'بانتظار المراجعة');
  assert.strictEqual(Object.keys(env.files).filter(k => env.files[k].folder === env.props.CERTS_FOLDER).length, 0);
});

test('الاعتماد ← Drive + إيميل بالمرفق + صادرة + شهاداتي + تحميل + تحقق + إلغاء', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  const ta = adminLogin(env, ADMIN);
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  assert.match(num.certNo, /^SLK-\d{4}-000001$/);
  assert.strictEqual(num.verifyUrl, 'https://certificates.sulukera.com/?v=' + num.certNo);
  // رقم غير مطابق يُرفض
  assert.strictEqual(env.api('adminApprove', { token: ta, data: { id, certNo: 'SLK-2026-999999', pdf: PDF, start: '2026-09-07', end: '2026-09-09' } }).ok, false);
  // ملف ليس PDF يُرفض
  assert.strictEqual(env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PNG, start: '2026-09-07', end: '2026-09-09' } }).ok, false);
  env.mails.length = 0;
  const r = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-09-07', end: '2026-09-09' } });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(env.mails.length, 1);
  assert.strictEqual(env.mails[0].to, 's@x.com');
  assert.strictEqual(env.mails[0].attachments[0].getMimeType(), 'application/pdf');
  assert.strictEqual(env.mails[0].replyTo, 'care@sulukera.com');
  assert.ok(env.mails[0].htmlBody.includes(num.verifyUrl));
  assert.strictEqual(Object.keys(env.files).filter(k => env.files[k].folder === env.props.CERTS_FOLDER).length, 1);
  // صادرة مسبقاً
  assert.match(env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-09-07', end: '2026-09-09' } }).error, /صادرة/);
  const mine = env.api('getMyData', { token: t }).data.requests[0];
  assert.strictEqual(mine.status, 'صادرة'); assert.strictEqual(mine.certNo, num.certNo);
  const dl = env.api('downloadMyCert', { token: t, certNo: num.certNo }).data;
  assert.strictEqual(Buffer.from(dl.data, 'base64').toString().slice(0, 4), '%PDF');
  // متدرب آخر لا يحمّلها
  const t2 = login(env, 'other@x.com');
  assert.strictEqual(env.api('downloadMyCert', { token: t2, certNo: num.certNo }).ok, false);
  // تحقق عام (بلا جلسة)
  const v = env.api('verify', { certNo: num.certNo.toLowerCase() }).data;
  assert.strictEqual(v.status, 'valid'); assert.strictEqual(v.name, 'Sara Ahmed Al-Harbi');
  assert.strictEqual(v.start, '2026-09-07'); assert.strictEqual(v.end, '2026-09-09');
  assert.strictEqual(env.api('verify', { certNo: 'SLK-2026-000777' }).data.status, 'notfound');
  assert.strictEqual(env.api('verify', { certNo: '<script>' }).data.status, 'notfound');
  // طلب جديد لنفس الدورة بعد الإصدار
  assert.match(env.api('submitRequest', { token: t, data: form() }).error, /صادرة لك مسبقاً/);
  // إلغاء
  assert.strictEqual(env.api('adminRevoke', { token: ta, id, reason: 'خطأ' }).ok, true);
  assert.strictEqual(env.api('verify', { certNo: num.certNo }).data.status, 'revoked');
  assert.strictEqual(env.api('downloadMyCert', { token: t, certNo: num.certNo }).ok, false);
});

test('الرفض يرسل السبب للمتدرب ويسمح بطلب جديد', () => {
  const env = fresh();
  const t = login(env, 's@x.com');
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  const ta = adminLogin(env, ADMIN);
  assert.match(env.api('adminReject', { token: ta, id, reason: '' }).error, /سبب/);
  env.mails.length = 0;
  assert.strictEqual(env.api('adminReject', { token: ta, id, reason: 'الصورة غير واضحة' }).ok, true);
  assert.strictEqual(env.mails[0].to, 's@x.com');
  assert.ok(env.mails[0].htmlBody.includes('الصورة غير واضحة'));
  assert.strictEqual(env.api('getMyData', { token: t }).data.requests[0].note, 'الصورة غير واضحة');
  assert.strictEqual(env.api('adminReserveNumber', { token: ta, id }).ok, false);
  assert.strictEqual(env.api('submitRequest', { token: t, data: form() }).ok, true);
});

test('الأرقام التسلسلية لا تتكرر', () => {
  const env = fresh();
  const ta = adminLogin(env, ADMIN);
  const nums = new Set();
  for (let i = 0; i < 5; i++) {
    const t = login(env, 's' + i + '@x.com');
    const id = env.api('submitRequest', { token: t, data: form() }).data.id;
    nums.add(env.api('adminReserveNumber', { token: ta, id }).data.certNo);
    // الحجز مرة ثانية يرجع نفس الرقم
    assert.ok(nums.has(env.api('adminReserveNumber', { token: ta, id }).data.certNo));
  }
  assert.strictEqual(nums.size, 5);
  assert.ok(nums.has('SLK-' + new Date().getFullYear() + '-000005'));
});

test('قائمة المشرفين ورابط الموقع من Script Properties', () => {
  const env = fresh();
  env.props.ADMINS = 'boss@x.com';
  env.props.SITE_URL = 'https://wida3tk.github.io/certi';
  env.api('adminResetRequest', { email: ADMIN });
  assert.ok(![...env.cache.keys()].some(k => k.startsWith('reset:')), 'removed admin gets no reset link');
  const tb = adminLogin(env, 'boss@x.com');
  const t = login(env, 's@x.com');
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  assert.strictEqual(env.api('adminReserveNumber', { token: tb, id }).data.verifyUrl.split('?')[0], 'https://wida3tk.github.io/certi/');
});

test('شرط 10 أيام: من 1 إلى 10 مسموح، ومن 1 إلى 9 ممنوع', () => {
  const env = fresh();
  assert.strictEqual(env.ctx.daysInclusive_('2026-09-01', '2026-09-10'), 10);
  assert.strictEqual(env.ctx.daysInclusive_('2026-02-25', '2026-03-06'), 10);
  const t = login(env, 's@x.com');
  const id = env.api('submitRequest', { token: t, data: form({ courseId: 'specialist' }) }).data.id;
  const ta = adminLogin(env, ADMIN);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.minDays, 10);
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  const r9 = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-09-01', end: '2026-09-09' } });
  assert.strictEqual(r9.ok, false); assert.match(r9.error, /10 أيام/);
  const r10 = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-09-01', end: '2026-09-10' } });
  assert.strictEqual(r10.ok, true, r10.error);
});

test('الإرسال: الرد إلى care@ دائماً، والإعداد يشارك المجلد مع الفريق', () => {
  const env = fresh();
  login(env, 's@x.com');
  assert.strictEqual(env.mails[0].replyTo, 'care@sulukera.com');
  assert.strictEqual(env.mails[0].name, 'سلوكيرا | Sulukera');
  const sh = env.shared[env.props.ROOT_FOLDER] || [];
  assert.strictEqual(sh.sort().join(), ['care@sulukera.com', 'ehamdan@sulukera.com', 'raljalajil@sulukera.com'].join());
});

test('الفريق: المساعد والمحاسب مشرفون', () => {
  const env = fresh();
  for (const e of ['ehamdan@sulukera.com', 'Raljalajil@sulukera.com']) assert.strictEqual(env.api('adminList', { token: adminLogin(env, e) }).ok, true, e);
});

test('دخول الإدارة بكلمة المرور: تعيين برابط، قفل بعد 5 محاولات، لا يكشف الأعضاء، كلمة المرور لا تُخزَّن', () => {
  const env = fresh();
  // غير عضو: نفس الرد ولا رابط
  const r0 = env.api('adminResetRequest', { email: 'stranger@x.com' });
  assert.strictEqual(r0.ok, true);
  assert.ok(![...env.cache.keys()].some(k => k.startsWith('reset:')));
  assert.strictEqual(env.mails.filter(m => m.to === 'stranger@x.com').length, 0);
  // قبل التعيين: لا دخول
  assert.strictEqual(env.api('adminLogin', { email: ADMIN, password: 'whatever123' }).ok, false);
  // كلمة مرور ضعيفة
  env.api('adminResetRequest', { email: ADMIN });
  const key = [...env.cache.keys()].find(k => k.startsWith('reset:')).slice(6);
  assert.ok(env.mails.some(m => m.to === ADMIN && m.htmlBody.includes('admin.html?reset=' + key)));
  assert.match(env.api('adminSetPassword', { reset: key, password: 'short1' }).error, /قصيرة/);
  assert.match(env.api('adminSetPassword', { reset: key, password: 'onlyletterspass' }).error, /أرقام/);
  const ok = env.api('adminSetPassword', { reset: key, password: 'Sulukera2026x' });
  assert.strictEqual(ok.ok, true, ok.error);
  assert.strictEqual(env.api('adminSetPassword', { reset: key, password: 'Another2026xx' }).ok, false, 'one-time link');
  // كلمة المرور نفسها غير مخزنة
  assert.ok(!JSON.stringify(env.props).includes('Sulukera2026x'));
  // دخول صحيح وجلسة إدارة تعمل، وتسجيل الخروج يلغيها
  const t = env.api('adminLogin', { email: 'Maryam@Sulukera.com', password: 'Sulukera2026x' }).data.token;
  assert.strictEqual(env.api('adminMe', { token: t }).data.email, ADMIN);
  env.api('adminLogout', { token: t });
  assert.strictEqual(env.api('adminList', { token: t }).ok, false);
  // 5 محاولات خاطئة ← قفل حتى مع الصحيحة
  for (let i = 0; i < 5; i++) assert.strictEqual(env.api('adminLogin', { email: ADMIN, password: 'wrong' + i }).ok, false);
  assert.match(env.api('adminLogin', { email: ADMIN, password: 'Sulukera2026x' }).error, /أُقفل|كثيرة/);
  // جلسة المتدرب لا تُقبل للإدارة، وجلسة الإدارة لا تُقبل كمتدرب
  const ts = login(env, 's@x.com');
  assert.strictEqual(env.api('adminList', { token: ts }).ok, false);
});

test('رحلات أقل: الدخول يرجع بيانات البوابة، والتقديم يرجع القائمة، وقائمة الإدارة فيها التفاصيل', () => {
  const env = fresh();
  env.api('requestCode', { email: 'q@x.com' });
  const v = env.api('verifyCode', { email: 'q@x.com', code: env.cache.get('otp:q@x.com') }).data;
  assert.strictEqual(v.data.survey.length, 11); assert.ok(v.data.courses.length);
  const r = env.api('submitRequest', { token: v.token, data: form() }).data;
  assert.strictEqual(r.requests[0].id, r.id); assert.strictEqual(r.requests[0].status, 'بانتظار المراجعة');
  const l = env.api('adminList', { token: adminLogin(env, ADMIN) }).data[0];
  assert.strictEqual(l.phone, '0501234567'); assert.strictEqual(l.courseId, 'persuasion-influence'); assert.strictEqual(l.platformEmail, 'sara.platform@x.com');
});

test('تذكّرني: جلسة موقّعة 30 يوماً، لا تُزوَّر ولا تنتهي بانتهاء ذاكرة الخادم', () => {
  const env = fresh();
  env.api('requestCode', { email: 'r@x.com' });
  const tok = env.api('verifyCode', { email: 'r@x.com', code: env.cache.get('otp:r@x.com'), remember: true }).data.token;
  assert.ok(tok.startsWith('r1.'));
  assert.ok(![...env.cache.keys()].some(k => k === 'tok:' + tok), 'not stored server-side');
  assert.strictEqual(env.api('getMyData', { token: tok }).data.email, 'r@x.com');
  // تزوير: تغيير البريد داخل الرمز يُرفض
  const [p, , sig] = tok.split('.');
  const fake = p + '.' + Buffer.from('boss@x.com|' + (Date.now() + 1e9)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + '.' + sig;
  assert.strictEqual(env.api('getMyData', { token: fake }).ok, false);
  // منتهي الصلاحية يُرفض
  const expired = env.ctx.signedToken_('r@x.com', Date.now() - 1000);
  assert.strictEqual(env.api('getMyData', { token: expired }).ok, false);
  // لا يفتح الإدارة
  assert.strictEqual(env.api('adminList', { token: tok }).ok, false);
});

test('طلب عدة شهادات مرة واحدة: طلب مستقل لكل دورة، مجموعة واحدة، المكرر يُتخطّى، إيميل واحد', () => {
  const env = fresh();
  const t = login(env, 'm@x.com');
  // واحدة موجودة مسبقاً
  env.api('submitRequest', { token: t, data: form() });
  env.mails.length = 0;
  const r = env.api('submitRequest', { token: t, data: form({ courseId: undefined, courseIds: ['persuasion-influence', 'specialist', 'specialist'] }) });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(r.data.ids.length, 1, 'duplicate in list + already pending skipped');
  assert.strictEqual(r.data.skipped.length, 1); assert.match(r.data.skipped[0].reason, /قيد المراجعة/);
  assert.strictEqual(env.mails.length, 1);
  // جديدان معاً ← مجموعة
  env.ctx.CacheService.getScriptCache().remove('courses');
  const t2 = login(env, 'n@x.com');
  const r2 = env.api('submitRequest', { token: t2, data: form({ courseIds: ['persuasion-influence', 'specialist'] }) }).data;
  assert.strictEqual(r2.ids.length, 2); assert.match(r2.group, /^GRP-/);
  assert.strictEqual(r2.requests.length, 2);
  const ta = adminLogin(env, ADMIN);
  const l = env.api('adminList', { token: ta }).data.filter(x => x.email === 'n@x.com');
  assert.strictEqual(l.length, 2); assert.strictEqual(l[0].group, l[1].group);
  // رفض واحدة واعتماد الأخرى مستقلان
  assert.strictEqual(env.api('adminReject', { token: ta, id: r2.ids[0], reason: 'اسم الدورة غير مطابق للدورات المشترك فيها' }).ok, true);
  assert.strictEqual(env.api('adminGet', { token: ta, id: r2.ids[1] }).data.status, 'بانتظار المراجعة');
  // كلها مكررة ← خطأ واضح
  assert.match(env.api('submitRequest', { token: t2, data: form({ courseIds: ['specialist'] }) }).error, /قيد المراجعة/);
  // الحد الأقصى
  assert.match(env.api('submitRequest', { token: t2, data: form({ courseIds: Array.from({ length: 16 }, (_, i) => 'c' + i) }) }).error, /15/);
});

test('استيراد ردود Google Form من تاريخ معيّن: معاينة بلا كتابة، استيراد بلا تكرار، بلا إيميلات', () => {
  // نفس عناوين الشيت الحقيقي «البيانات المطلوبة لاستكمال إصدار الشهادة (الردود)»
  const H = ['طابع زمني', 'الاسم الثلاثي باللغة العربية :', 'الاسم الثلاثي باللغة الإنجليزية : ', 'البريد الإلكتروني لإرسال الشهادة :', 'البرنامج التدريبي :',
    'رقم التواصل :', 'الحالة', 'أقر بأن المعلومات المدخلة صحيحة، وأن البيانات تخضع لتدقيق فريق منصة رشد', 'العمود 1'];
  const row = (d, email, course, st) => [d, 'سارة', 'Sara Ali', email, course, '0501234567', st || '', 'أقر', ''];
  const FORM = '1EQeszwFORMxxxxxxxxxxxxxxxxxxxxx';
  const env = createEnv({ extraSheets: { [FORM]: { 'ردود النموذج 1': [H,
    row(new Date(2026, 10, 20, 10), 'old@x.com', 'فن الإقناع والتأثير'),
    row(new Date(2026, 10, 22, 9), 'a@x.com', 'فن الاقناع و التأثير'),
    row(new Date(2026, 10, 23, 9), 'b@x.com', 'إعداد الأخصائي'),
    row(new Date(2026, 10, 23, 11), 'c@x.com', 'دورة غير معروفة'),
    row(new Date(2026, 10, 24, 8), 'd@x.com', 'قديمة'),
    row(new Date(2026, 10, 24, 9), 'e@x.com', 'فن الإقناع والتأثير', 'تم الإرسال'),
    row(new Date(2026, 10, 24, 10), 'f@x.com', 'شهادة فني تحليل السلوك التطبيقي ABAT'),
  ] } } });
  // التاريخ داخل سياق vm
  const VDate = require('vm').runInContext('Date', env.ctx);
  env.spreadsheets[FORM].sheets[0].data.forEach((r, i) => { if (i && r[0] instanceof Date) r[0] = new VDate(r[0].getTime()); });
  env.ctx.setup();
  const ta = adminLogin(env, ADMIN);
  const url = 'https://docs.google.com/spreadsheets/d/' + FORM + '/edit#gid=1';
  const p = env.api('adminImportPreview', { token: ta, url, from: '2026-11-22' });
  assert.strictEqual(p.ok, true, p.error);
  assert.strictEqual(p.data.total, 6, 'from date filter'); assert.strictEqual(p.data.handled, 1);
  assert.strictEqual(p.data.ready, 3, 'alias «فني» matched ABAT'); assert.strictEqual(p.data.unmatched, 2);
  assert.ok(p.data.courses.some(c => c.name === 'قديمة' && c.inactive));
  assert.strictEqual(env.sheet('الطلبات').data.length, 1, 'preview writes nothing');
  env.mails.length = 0;
  const r = env.api('adminImport', { token: ta, url, from: '2026-11-22' });
  assert.strictEqual(r.ok, true, r.error); assert.match(r.data, /المستوردة: 3،/);
  assert.strictEqual(env.mails.length, 0);
  const l = env.api('adminList', { token: ta }).data;
  assert.strictEqual(l.length, 3); assert.ok(l.every(x => x.status === 'بانتظار المراجعة'));
  assert.ok(l.some(x => x.email === 'f@x.com' && x.courseId === 'abat' && x.course === 'شهادة أخصائي تحليل السلوك التطبيقي ABAT'));
  assert.ok(l.some(x => x.email === 'a@x.com' && x.date === '2026-11-22' && x.courseId === 'persuasion-influence'));
  // مرة ثانية: لا تكرار
  assert.match(env.api('adminImport', { token: ta, url, from: '2026-11-22' }).data, /المستوردة: 0،/);
  // المتدرب يرى طلبه المستورد
  assert.strictEqual(env.api('getMyData', { token: login(env, 'a@x.com') }).data.requests.length, 1);
  // غير المشرف ممنوع، والشيت غير المتاح رسالة واضحة
  assert.strictEqual(env.api('adminImportPreview', { token: login(env, 'z@x.com'), url, from: '2026-11-22' }).ok, false);
  assert.match(env.api('adminImportPreview', { token: ta, url: 'https://docs.google.com/spreadsheets/d/NOPExxxxxxxxxxxxxxxxxxxxxxxx/edit', from: '2026-11-22' }).error, /care@/);
});

test('نسخ القالب: اختيار النسخة عند الاعتماد، وحفظها، ورفض قالب لا يخص الدورة؛ والاسم البديل يُطابق في الاستيراد', () => {
  const env = fresh();
  const t = login(env, 'v@x.com');
  const id = env.api('submitRequest', { token: t, data: form({ courseIds: ['abat'] }) }).data.id;
  const ta = adminLogin(env, ADMIN);
  const g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.templates.map(x => x.dir).join(), 'abat-baik,abat-ghazal');
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  const base = { id, certNo: num.certNo, pdf: PDF, start: '2026-09-01', end: '2026-09-12' };
  assert.match(env.api('adminApprove', { token: ta, data: Object.assign({ template: 'vb-mapp' }, base) }).error, /لا يخص/);
  assert.strictEqual(env.api('adminApprove', { token: ta, data: Object.assign({ template: 'abat-ghazal' }, base) }).ok, true);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.template, 'abat-ghazal');
  assert.strictEqual(env.sheet('الطلبات').data[0].indexOf('القالب') >= 0, true);
  // الاسم البديل («فني») يُطابق «أخصائي» بعد التطبيع
  assert.strictEqual(env.ctx.normAr_('شهادة فني تحليل السلوك التطبيقي ABAT') !== env.ctx.normAr_('شهادة أخصائي تحليل السلوك التطبيقي ABAT'), true);
  const c = env.ctx.courses_().find(x => x.id === 'abat');
  assert.ok(c.aliases.length === 1);
});

test('توحيد الاسم الإنجليزي: أول حرف كبير والباقي صغير', () => {
  const env = fresh();
  const f = env.ctx.titleName_;
  assert.strictEqual(f('REEM ABDUKARIRI'), 'Reem Abdukariri');
  assert.strictEqual(f('  sara   ahmed AL-HARBI '), 'Sara Ahmed Al-Harbi');
  assert.strictEqual(f('Dr.REDA GAD'), 'Dr.Reda Gad');
  assert.strictEqual(f("o'NEIL mcdonald"), "O'Neil Mcdonald");
  const t = login(env, 'reem@x.com');
  env.api('submitRequest', { token: t, data: form({ nameEn: 'REEM ABDUKARIRI' }) });
  const ta = adminLogin(env, ADMIN);
  assert.strictEqual(env.api('adminList', { token: ta }).data[0].nameEn, 'Reem Abdukariri');
});

test('المخالصة المالية: المالية ← التوقيع ← PDF + سجل ← إطلاق الشهادة المعلّقة تلقائياً', () => {
  const courses = JSON.stringify([
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'Persuasion', type: 'short', active: true },
    { id: 'obm-c', nameAr: 'رخصة الاستشاري OBM-C', name: 'OBM-C', type: 'long', clearance: true, active: true }]);
  const env = createEnv({ coursesJson: courses }); env.ctx.setup();
  const t = login(env, 'l@x.com');
  env.mails.length = 0;
  const id = env.api('submitRequest', { token: t, data: form({ courseIds: ['obm-c'] }) }).data.id;
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com' && /مخالصة/.test(m.subject)), 'finance notified');
  const ta = adminLogin(env, ADMIN);
  let g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.clearance, 'بانتظار المالية');
  // المتدرب لا يرى المخالصة قبل جاهزيتها
  assert.match(env.api('clearanceView', { token: t, id }).error, /غير جاهزة/);
  // اعتماد الشهادة قبل المخالصة ← تُحفظ ولا تُرسل
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  env.mails.length = 0;
  const ap = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-11-20' } });
  assert.strictEqual(ap.ok, true, ap.error); assert.match(ap.data, /تلقائياً/);
  assert.strictEqual(env.mails.length, 0, 'certificate held, no email');
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.status, 'معتمدة بانتظار المخالصة');
  assert.strictEqual(env.api('verify', { certNo: num.certNo }).data.status, 'notfound', 'held cert not public yet');
  // يوجد مبلغ ← بانتظار السداد
  assert.strictEqual(env.api('adminClearance', { token: ta, id, data: { outcome: 'due' } }).ok, true);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.clearance, 'بانتظار السداد');
  // تم السداد بلا بيانات ← خطأ، ثم ببيانات ← بانتظار التوقيع وإيميل للمتدرب
  assert.match(env.api('adminClearance', { token: ta, id, data: { outcome: 'paid' } }).error, /أكملي/);
  const cd = { outcome: 'paid', program: 'برنامج OBM-C', hours: '72 ساعة', total: 'SR 3957.15', start: '2025-10-21', clearDate: '2026-11-18' };
  env.mails.length = 0;
  const cr = env.api('adminClearance', { token: ta, id, data: cd });
  assert.strictEqual(cr.ok, true, cr.error); assert.match(cr.data, /CLR-/);
  assert.ok(env.mails.some(m => m.to === 'l@x.com' && /جاهزة للتوقيع/.test(m.subject)));
  // متدرب آخر لا يرى ولا يوقّع
  const t2 = login(env, 'other@x.com');
  assert.strictEqual(env.api('clearanceView', { token: t2, id }).ok, false);
  // المتدرب يطّلع
  const v = env.api('clearanceView', { token: t, id }).data;
  assert.strictEqual(v.total, 'SR 3957.15'); assert.strictEqual(v.name, 'سارة أحمد الحربي'); assert.strictEqual(v.text.length, 3);
  assert.strictEqual(env.api('getMyData', { token: t }).data.requests[0].clearance, 'بانتظار التوقيع');
  // توقيع بلا إقرار / بلا رسم ← يُرفض
  const sig = 'data:image/png;base64,' + Buffer.alloc(2000, 7).toString('base64');
  assert.match(env.api('clearanceSign', { token: t, id, data: { agree: false, signature: sig } }).error, /الإقرار/);
  assert.match(env.api('clearanceSign', { token: t, id, data: { agree: true, signature: 'x' } }).error, /توقيعك/);
  // التوقيع ← PDF في Drive، نسخ للمتدرب والمالية، والشهادة المعلّقة تُرسل
  env.mails.length = 0;
  const sres = env.api('clearanceSign', { token: t, id, data: { agree: true, signature: sig, ua: 'Test Browser' } });
  assert.strictEqual(sres.ok, true, sres.error);
  g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.clearance, 'موقّعة'); assert.strictEqual(g.status, 'صادرة'); assert.ok(g.clearanceFile);
  assert.ok(env.mails.some(m => m.to === 'l@x.com' && /الموقّعة/.test(m.subject) && m.attachments));
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com' && /تم توقيع/.test(m.subject)));
  assert.ok(env.mails.some(m => m.to === 'l@x.com' && /🎓/.test(m.subject)), 'held certificate released');
  assert.strictEqual(env.api('verify', { certNo: num.certNo }).data.status, 'valid');
  // المستند: البيانات + الإقرار + سجل التوقيع، والمستند المؤقت حُذف
  const doc = Object.values(env.docs)[0];
  const txt = doc.text.join('\n');
  ['SR 3957.15', 'سارة أحمد الحربي', 'أقر وأؤكد', 'سجل التوقيع الإلكتروني', 'اطلاع المتدرب', 'Test Browser'].forEach(k => assert.ok(txt.includes(k), k));
  assert.strictEqual(doc.trashed, true); assert.ok(doc.images >= 1);
  // التحميل للمتدرب، والتوقيع مرة ثانية مرفوض
  assert.strictEqual(Buffer.from(env.api('downloadMyClearance', { token: t, id }).data.data, 'base64').toString().slice(0, 4), '%PDF');
  assert.match(env.api('clearanceSign', { token: t, id, data: { agree: true, signature: sig } }).error, /مسبقاً/);
  // دورة بلا مخالصة لا تتأثر
  const id2 = env.api('submitRequest', { token: t, data: form() }).data.id;
  assert.strictEqual(env.api('adminGet', { token: ta, id: id2 }).data.clearance, '');
  assert.match(env.api('adminClearance', { token: ta, id: id2, data: { outcome: 'nodue' } }).error, /لا يحتاج/);
});

test('طلب قائم قبل تفعيل المخالصة لبرنامجه يُعامل «بانتظار المالية»، والصادر قبلها لا يتأثر', () => {
  const env = fresh();
  const t = login(env, 'pre@x.com');
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  const ta = adminLogin(env, ADMIN);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.clearance, '');
  // تفعيل المخالصة للدورة لاحقاً
  const list = JSON.parse(JSON.stringify(env.ctx.courses_())); list.find(c => c.id === 'persuasion-influence').clearance = true;
  env.ctx.CacheService.getScriptCache().put('courses', JSON.stringify(list), 600);
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.clearance, 'بانتظار المالية');
  assert.strictEqual(env.api('getMyData', { token: t }).data.requests[0].clearance, 'بانتظار المالية');
  assert.strictEqual(env.api('adminClearance', { token: ta, id, data: { outcome: 'due' } }).ok, true);
});

test('مخالصة اختيارية (OBM-P) بالتحويل اليدوي، و«لا يحتاج مخالصة» يطلق الشهادة المعلّقة', () => {
  const courses = JSON.stringify([
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'Persuasion', type: 'short', active: true },
    { id: 'obm-p', nameAr: 'رخصة الممارس OBM-P', name: 'OBM-P', type: 'long', active: true },
    { id: 'qasp-s', nameAr: 'QASP-S', name: 'QASP-S', type: 'long', clearance: true, active: true }]);
  const env = createEnv({ coursesJson: courses }); env.ctx.setup();
  const t = login(env, 'p@x.com'); const ta = adminLogin(env, ADMIN);
  // OBM-P: لا مخالصة تلقائياً، لكن يمكن تحويله
  const id = env.api('submitRequest', { token: t, data: form({ courseIds: ['obm-p'] }) }).data.id;
  let g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.clearance, ''); assert.strictEqual(g.canStartClr, true);
  env.mails.length = 0;
  const st = env.api('adminClearanceStart', { token: ta, id });
  assert.strictEqual(st.ok, true, st.error);
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com'), 'finance notified');
  assert.strictEqual(env.api('adminGet', { token: ta, id }).data.clearance, 'بانتظار المالية');
  assert.match(env.api('adminClearanceStart', { token: ta, id }).error, /مسبقاً/);
  // المتدرب لا يستطيع التحويل
  assert.strictEqual(env.api('adminClearanceStart', { token: t, id }).ok, false);
  // QASP-S: مخالصة تلقائياً، واعتماد قبلها ← معلّقة، ثم المحاسب «لا يحتاج مخالصة» ← تُرسل الشهادة
  const id2 = env.api('submitRequest', { token: t, data: form({ courseIds: ['qasp-s'] }) }).data.id;
  assert.strictEqual(env.api('adminGet', { token: ta, id: id2 }).data.clearance, 'بانتظار المالية');
  const num = env.api('adminReserveNumber', { token: ta, id: id2 }).data;
  env.api('adminApprove', { token: ta, data: { id: id2, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-11-20' } });
  assert.strictEqual(env.api('adminGet', { token: ta, id: id2 }).data.status, 'معتمدة بانتظار المخالصة');
  env.mails.length = 0;
  const nn = env.api('adminClearance', { token: ta, id: id2, data: { outcome: 'none' } });
  assert.strictEqual(nn.ok, true, nn.error); assert.match(nn.data, /أُرسلت الشهادة/);
  g = env.api('adminGet', { token: ta, id: id2 }).data;
  assert.strictEqual(g.clearance, 'لا تحتاج مخالصة'); assert.strictEqual(g.status, 'صادرة');
  assert.ok(env.mails.some(m => m.to === 'p@x.com' && /🎓/.test(m.subject)));
  assert.strictEqual(env.api('verify', { certNo: num.certNo }).data.status, 'valid');
  // «لا يحتاج» قبل الاعتماد ← الاعتماد يرسل مباشرة
  const id3 = env.api('submitRequest', { token: login(env, 'q@x.com'), data: form({ courseIds: ['qasp-s'] }) }).data.id;
  env.api('adminClearance', { token: ta, id: id3, data: { outcome: 'none' } });
  const n3 = env.api('adminReserveNumber', { token: ta, id: id3 }).data;
  env.mails.length = 0;
  env.api('adminApprove', { token: ta, data: { id: id3, certNo: n3.certNo, pdf: PDF, start: '2026-01-01', end: '2026-11-20' } });
  assert.strictEqual(env.api('adminGet', { token: ta, id: id3 }).data.status, 'صادرة');
  assert.ok(env.mails.some(m => m.to === 'q@x.com' && /🎓/.test(m.subject)));
});

test('تعديل الاسم برسوم: طلب المتدرب ← المحاسب ← إعادة الإصدار بنفس الرقم، والرفض، والسجل', () => {
  const env = fresh();
  const t = login(env, 'nc@x.com'); const ta = adminLogin(env, ADMIN);
  const id = env.api('submitRequest', { token: t, data: form({ nameEn: 'Sara Ahmad Al-Harbi' }) }).data.id;
  // قبل الإصدار: غير مسموح
  assert.match(env.api('requestNameChange', { token: t, id, data: { nameEn: 'Sara Ahmed Al-Harbi', reason: 'خطأ' } }).error, /الصادرة/);
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  assert.strictEqual(env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-01-20' } }).ok, true);
  // تحقق المدخلات
  assert.match(env.api('requestNameChange', { token: t, id, data: { nameEn: 'sara ahmad al-harbi', reason: 'x' } }).error, /مطابق/);
  assert.match(env.api('requestNameChange', { token: t, id, data: { nameEn: 'Sara Ahmed Al-Harbi' } }).error, /سبب/);
  assert.match(env.api('requestNameChange', { token: t, id, data: { nameEn: 'سارة', reason: 'x' } }).error, /بالإنجليزية/);
  // متدرب آخر لا يطلب على شهادة غيره
  assert.strictEqual(env.api('requestNameChange', { token: login(env, 'other@x.com'), id, data: { nameEn: 'Other Name', reason: 'x' } }).ok, false);
  env.mails.length = 0;
  const rq = env.api('requestNameChange', { token: t, id, data: { nameEn: 'SARA AHMED AL-HARBI', reason: 'خطأ إملائي' } });
  assert.strictEqual(rq.ok, true, rq.error);
  assert.strictEqual(rq.data.requests[0].nameChange, 'بانتظار تأكيد السداد'); assert.strictEqual(rq.data.requests[0].nameChangeTo, 'Sara Ahmed Al-Harbi');
  assert.ok(env.mails.some(m => m.to === 'raljalajil@sulukera.com' && /تعديل اسم/.test(m.subject)));
  assert.ok(env.mails.some(m => m.to === 'nc@x.com' && /استلمنا/.test(m.subject)));
  assert.match(env.api('requestNameChange', { token: t, id, data: { nameEn: 'Sara A Al-Harbi', reason: 'x' } }).error, /قيد المعالجة/);
  let g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.nameChange, 'بانتظار تأكيد السداد'); assert.strictEqual(g.nameChangeData.oldNameEn, 'Sara Ahmad Al-Harbi');
  // المتدرب لا يستطيع إتمامها بنفسه
  assert.strictEqual(env.api('adminNameChangeReject', { token: t, id, reason: 'x' }).ok, false);
  // تم السداد ← إعادة الإصدار بنفس الرقم والاسم الجديد
  env.mails.length = 0;
  const ap = env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-01-20', resend: true, nameChange: 'paid', nameEn: 'Sara Ahmed Al-Harbi' } });
  assert.strictEqual(ap.ok, true, ap.error); assert.match(ap.data, /عُدّل الاسم/);
  g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.nameChange, 'تم التعديل'); assert.strictEqual(g.nameEn, 'Sara Ahmed Al-Harbi'); assert.strictEqual(g.certNo, num.certNo);
  assert.ok(env.mails.some(m => m.to === 'nc@x.com' && /🎓/.test(m.subject) && /تم تعديل الاسم/.test(m.htmlBody)));
  assert.strictEqual(env.api('verify', { certNo: num.certNo }).data.nameEn || env.api('verify', { certNo: num.certNo }).data.name, 'Sara Ahmed Al-Harbi');
  // nameChange بلا طلب قائم ← مرفوض
  assert.match(env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-01-20', resend: true, nameChange: 'paid' } }).error, /لا يوجد طلب/);
  // طلب ثانٍ ثم رفض
  env.api('requestNameChange', { token: t, id, data: { nameEn: 'Sarah Ahmed Al-Harbi', reason: 'تهجئة' } });
  assert.match(env.api('adminNameChangeReject', { token: ta, id, reason: '' }).error, /سبب/);
  env.mails.length = 0;
  assert.strictEqual(env.api('adminNameChangeReject', { token: ta, id, reason: 'لم يتم السداد' }).ok, true);
  assert.ok(env.mails.some(m => m.to === 'nc@x.com' && /بخصوص طلب تعديل الاسم/.test(m.subject)));
  const mine = env.api('getMyData', { token: t }).data.requests[0];
  assert.strictEqual(mine.nameChange, 'مرفوض'); assert.strictEqual(mine.nameChangeNote, 'لم يتم السداد'); assert.strictEqual(mine.nameEn, 'Sara Ahmed Al-Harbi');
  // السجل
  const acts = env.sheet('السجل').data.slice(1).map(r => r[2]);
  ['إصدار', 'طلب تعديل اسم (المتدرب)', 'تعديل الاسم وإعادة الإصدار', 'رفض تعديل اسم'].forEach(a => assert.ok(acts.includes(a), a));
});

test('لوحة المتابعة: الأعداد ومدة الإصدار بأيام العمل والمتأخر والرضا والسجل — للفريق فقط', () => {
  const env = fresh();
  const t = login(env, 's1@x.com'); const ta = adminLogin(env, ADMIN);
  const id = env.api('submitRequest', { token: t, data: form() }).data.id;
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-01-20' } });
  // طلب قديم متأخر (الأحد 2026-11-01)
  const t2 = login(env, 's2@x.com');
  const id2 = env.api('submitRequest', { token: t2, data: form({ courseIds: ['specialist'] }) }).data.id;
  const sh = env.sheet('الطلبات'); const col = sh.data[0].indexOf('تاريخ الطلب');
  sh.data.find(r => r[0] === id2)[col] = '2026-11-01 10:00';
  assert.strictEqual(env.api('adminStats', { token: t }).ok, false, 'trainee blocked');
  const s = env.api('adminStats', { token: ta });
  assert.strictEqual(s.ok, true, s.error);
  const d = s.data;
  assert.strictEqual(d.total, 2); assert.strictEqual(d.byStatus['صادرة'], 1); assert.strictEqual(d.byStatus['بانتظار المراجعة'], 1);
  assert.strictEqual(d.issuedTotal, 1); assert.strictEqual(d.sample, 1); assert.strictEqual(d.avgDays, 0); assert.strictEqual(d.within3, 100);
  assert.ok(d.overdueCount >= 1 && d.overdue[0].id === id2 && d.overdue[0].age > 3);
  assert.strictEqual(d.survey.count, 2); assert.ok(d.survey.avg5 >= 1 && d.survey.avg5 <= 5); assert.ok(d.survey.nps >= -100 && d.survey.nps <= 100);
  assert.strictEqual(d.weeks.length, 8); assert.ok(d.courses.length >= 1);
  assert.ok(d.activity.some(a => a.action === 'إصدار'));
  // أيام العمل: الخميس ← الأحد = يوم عمل واحد (الجمعة والسبت عطلة)
  const u = (y, m, dd) => Date.UTC(y, m - 1, dd);
  assert.strictEqual(env.ctx.workDays_(u(2026, 11, 26), u(2026, 11, 29)), 1);
  assert.strictEqual(env.ctx.workDays_(u(2026, 11, 22), u(2026, 11, 26)), 4);
});

test('أنواع الشهادات: شهادة واحدة لتصنيفي تحليل السلوك وإدارة السلوك، وشهادة بلا قالب تُطلب ويُؤجَّل إصدارها', () => {
  const env = createEnv({ coursesJson: JSON.stringify([
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'Persuasion', type: 'short', active: true },
    { id: 'obm-p', nameAr: 'رخصة الممارس', name: 'OBM-P', type: 'long', category: 'obm', label: 'الممارس (OBM-P)', active: true },
    { id: 'obm-e', nameAr: 'رخصة الخبير', name: 'OBM-E', type: 'long', category: 'obm', label: 'الخبير (OBM-E)', active: true },
    { id: 'qba', nameAr: 'شهادة محلل السلوك (QBA)', name: 'QBA', type: 'long', category: 'aba', label: 'محلل السلوك (QBA)', clearance: true, active: true, templates: [] }]) });
  env.ctx.setup();
  const t = login(env, 'cat@x.com'); const ta = adminLogin(env, ADMIN);
  const cs = env.api('getMyData', { token: t }).data.courses;
  assert.strictEqual(cs.find(c => c.id === 'qba').category, 'aba'); assert.strictEqual(cs.find(c => c.id === 'obm-e').label, 'الخبير (OBM-E)');
  assert.strictEqual(cs.find(c => c.id === 'persuasion-influence').category, 'short');
  assert.match(env.api('submitRequest', { token: t, data: form({ courseIds: ['obm-p', 'obm-e'] }) }).error, /وحدها/);
  assert.match(env.api('submitRequest', { token: t, data: form({ courseIds: ['persuasion-influence', 'qba'] }) }).error, /وحدها/);
  env.mails.length = 0;
  const id = env.api('submitRequest', { token: t, data: form({ courseIds: ['qba'] }) }).data.id;
  assert.ok(env.mails.some(m => m.to === 'cat@x.com' && /ثلاثة إلى خمسة أيام عمل/.test(m.htmlBody) && /المخالصة/.test(m.htmlBody)), 'program timing in confirmation');
  assert.strictEqual(env.api('getMyData', { token: t }).data.issueDaysPrograms, 'ثلاثة إلى خمسة أيام عمل');
  const g = env.api('adminGet', { token: ta, id }).data;
  assert.strictEqual(g.clearance, 'بانتظار المالية'); assert.deepStrictEqual(Array.from(g.templates), []);
  const num = env.api('adminReserveNumber', { token: ta, id }).data;
  assert.match(env.api('adminApprove', { token: ta, data: { id, certNo: num.certNo, pdf: PDF, start: '2026-01-01', end: '2026-02-01' } }).error, /لا يوجد قالب/);
  // المخالصة تمشي رغم عدم وجود القالب
  assert.strictEqual(env.api('adminClearance', { token: ta, id, data: { outcome: 'none' } }).ok, true);
});

console.log('\n' + passed + ' اختبار ناجح' + (process.exitCode ? ' — يوجد فشل' : ''));
