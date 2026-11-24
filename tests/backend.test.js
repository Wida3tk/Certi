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

test('setup ينشئ تبويبي الطلبات والرضا فقط', () => {
  const env = fresh();
  const names = env.spreadsheets[env.props.SHEET_ID].getSheets().map(s => s.name);
  assert.strictEqual(names.sort().join(), ['الرضا', 'الطلبات'].sort().join());
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
  assert.strictEqual(me.courses.map(c => c.id).join(), 'persuasion-influence,specialist');
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

console.log('\n' + passed + ' اختبار ناجح' + (process.exitCode ? ' — يوجد فشل' : ''));
