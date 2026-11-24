/**
 * سلوكيرا — نظام الشهادات: الخلفية (API بصيغة JSON)
 * ------------------------------------------------------------------
 * الواجهة على GitHub Pages (certificates.sulukera.com) ترسل:
 *   fetch(API_URL, { method:'POST', headers:{'Content-Type':'text/plain'},
 *                    body: JSON.stringify({ action, token, ...args }) })
 * والرد دائماً: { ok:true, data } أو { ok:false, error:'رسالة بالعربية' }
 *
 * النشر: من المستودع بـ  clasp push  ثم  clasp deploy  (Execute as: Me — Access: Anyone)
 * أول مرة فقط: شغّلي setup() ← تنشئ الشيت (الطلبات + الرضا) والمجلدات في Drive.
 *
 * كل إعداد قابل للتغيير موجود في DEFAULTS أدناه، ويمكن تجاوزه دون تعديل الكود
 * من: Project Settings ← Script Properties (نفس اسم المفتاح).
 */

/* ===================== الإعدادات ===================== */
const DEFAULTS = {
  // من يحق له فتح لوحة المراجعة (مفصولة بفواصل في Script Properties)
  ADMINS: 'maryam@sulukera.com,care@sulukera.com,ehamdan@sulukera.com,raljalajil@sulukera.com',
  // المالية: تأكيد السداد للمخالصة (البرامج الطويلة) ورسوم تعديل الاسم — تُستخدم في المرحلة القادمة
  FINANCE: 'raljalajil@sulukera.com',
  // رابط الموقع (ينتهي بـ /) — منه تُقرأ قائمة الدورات ويُبنى رابط التحقق في QR
  SITE_URL: 'https://certificates.sulukera.com/',
  // احتياطي لقراءة قائمة الدورات إن لم يعمل النطاق بعد (GitHub Pages)
  PAGES_URL: 'https://wida3tk.github.io/Certi/',
  // رابط الموقع الذي تفتحه الروابط في الإيميلات («شهاداتي»، تعيين كلمة المرور). يصير SITE_URL بعد ربط النطاق
  APP_URL: 'https://wida3tk.github.io/Certi/',
  // نظام العمليات: غير مربوط حالياً بقرار مريم (2026-11-24). المرحلة الثانية: يُضاف مصدر البيانات هنا فقط
};

const CONFIG = {
  SENDER_NAME: 'سلوكيرا | Sulukera',
  REPLY_TO: 'care@sulukera.com',
  SUBJECT: '🎓 مبارك! شهادتك في «{{course}}» جاهزة',
  COLOR_PRIMARY: '#0C40FB',
  COLOR_DARK: '#031233',
  LOGO_URL: 'https://sulukera.com/wp-content/uploads/2026/10/%D8%B4%D8%B9%D8%A7%D8%B1-%D8%A7%D8%A8%D9%8A%D8%B6.png', // الشعار الأبيض من موقع سلوكيرا
  CERT_PREFIX: 'SLK',           // رقم الشهادة: SLK-2026-000001
  // استبيان رضا المتدربين (إلزامي قبل الطلب) — من نموذج «استبيان رضا المتدربين - دورات مسجلة»
  // max: أعلى درجة (5 = ضعيف جداً..ممتاز، 10 = مقياس التوصية). التعليق في آخره إلزامي.
  SURVEY: [
    { section: 'المحتوى العلمي', q: 'كان محتوى الدورة منظماً ومتسلسلاً بصورة مناسبة', max: 5 },
    { section: 'المحتوى العلمي', q: 'كانت المصادر التعليمية المرفقة داعمة لعملية التعلم', max: 5 },
    { section: 'المحتوى العلمي', q: 'حققت الدورة الأهداف التعليمية التي توقعتها', max: 5 },
    { section: 'تجربة التعلم عبر المنصة', q: 'كانت المنصة التعليمية سهلة الاستخدام', max: 5 },
    { section: 'تجربة التعلم عبر المنصة', q: 'كان الوصول إلى المحاضرات والمواد التعليمية واضحاً', max: 5 },
    { section: 'الاستفادة', q: 'اكتسبت معارف أو مهارات جديدة من خلال هذه الدورة', max: 5 },
    { section: 'الاستفادة', q: 'أرى أن الدورة قدّمت قيمة تعليمية مناسبة', max: 5 },
    { section: 'الدعم الأكاديمي', q: 'كان الوصول إلى فريق الدعم سهلاً عند الحاجة', max: 5 },
    { section: 'الدعم الأكاديمي', q: 'كانت استجابة فريق الدعم مناسبة من حيث الوقت', max: 5 },
    { section: 'الدعم الأكاديمي', q: 'كانت إجابات فريق الدعم واضحة ومفيدة', max: 5 },
    { section: 'صوتك يهمنا', q: 'ما مدى احتمالية أن توصي بهذا البرنامج لشخص مهتم بنفس المجال؟', max: 10 },
  ],
  SURVEY_COMMENT: 'هل لديك أي ملاحظات أو مقترحات إضافية؟',
  ISSUE_DAYS: 'يومين إلى ثلاثة أيام عمل',  // مدة الإصدار كما تظهر للمتدرب وفي الإيميلات
  SESSION_HOURS: 6,          // جلسة المتدرب (رمز البريد)
  REMEMBER_DAYS: 30,         // «تذكّرني على هذا الجهاز»: جلسة موقّعة تبقى على جهاز المتدرب
  ADMIN_SESSION_HOURS: 6,    // جلسة الإدارة (كلمة المرور) — تتجدد مع كل استخدام
  PW_MIN: 10,                // أقل طول لكلمة مرور الإدارة
  PW_ITER: 3000,             // تكرار التجزئة (يبطّئ التخمين)
};

function setting_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  return v != null && v !== '' ? v : DEFAULTS[k];
}
function siteUrl_() { return String(setting_('SITE_URL')).replace(/\/?$/, '/'); }
function verifyUrl_(certNo) { return siteUrl_() + '?v=' + encodeURIComponent(certNo); }
function appUrl_() { return String(setting_('APP_URL')).replace(/\/?$/, '/'); }

/* ===================== الأوراق ===================== */
const TABS = { REQ: 'الطلبات', SURVEY: 'الرضا' };
const REQ_HEADERS = [
  'رقم الطلب', 'تاريخ الطلب', 'الاسم بالإنجليزي', 'الاسم بالعربي', 'البريد', 'البريد في المنصة', 'الجوال', 'المدينة',
  'معرّف الدورة', 'اسم الدورة', 'اسم الدورة (EN)', 'نوع البرنامج', 'رقم المجموعة',
  'الحالة', 'تاريخ البدء', 'تاريخ الإتمام', 'القالب', 'رقم الشهادة', 'ملف الشهادة', 'تاريخ الإصدار',
  'اعتمدها', 'ملاحظات',
];
// أعمدة تُحفظ نصاً كما هي (حتى لا يحوّل الشيت الجوال لرقم أو التاريخ لكائن تاريخ)
const TEXT_COLS = ['تاريخ الطلب', 'الجوال', 'تاريخ البدء', 'تاريخ الإتمام', 'رقم الشهادة', 'تاريخ الإصدار'];
const SURVEY_HEADERS = ['رقم الطلب', 'التاريخ', 'البريد', 'الدورة']
  .concat(CONFIG.SURVEY.map(s => s.q)).concat([CONFIG.SURVEY_COMMENT]);
const TYPE_LABEL = { short: 'دورة قصيرة', long: 'برنامج طويل' };

const ST = { PENDING: 'بانتظار المراجعة', ISSUED: 'صادرة', REJECTED: 'مرفوضة', REVOKED: 'ملغاة' };

/* ===================== الإعداد (مرة واحدة) ===================== */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  if (props.getProperty('SHEET_ID')) {
    ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  } else {
    ss = SpreadsheetApp.create('سلوكيرا — نظام الشهادات');
    props.setProperty('SHEET_ID', ss.getId());
  }
  ensureTab_(ss, TABS.REQ, REQ_HEADERS, TEXT_COLS);
  ensureTab_(ss, TABS.SURVEY, SURVEY_HEADERS, ['التاريخ']);
  const first = ss.getSheets()[0];
  if (ss.getSheets().length > 2 && (first.getName() === 'Sheet1' || first.getName() === 'الورقة1')) ss.deleteSheet(first);

  if (!props.getProperty('ROOT_FOLDER')) {
    const root = DriveApp.createFolder('سلوكيرا — نظام الشهادات');
    props.setProperty('ROOT_FOLDER', root.getId());
    props.setProperty('CERTS_FOLDER', root.createFolder('الشهادات الصادرة').getId());
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }
  // الفريق يرى الشيت والملفات في Drive (محرّرون). الحساب المالك (care@) يملك كل شيء
  const owner = cleanEmail_(Session.getEffectiveUser().getEmail());
  const root = DriveApp.getFolderById(props.getProperty('ROOT_FOLDER'));
  admins_().filter(e => e !== owner).forEach(e => { try { root.addEditor(e); } catch (err) { Logger.log('share ' + e + ': ' + err); } });
  Logger.log('الشيت: ' + ss.getUrl());
  Logger.log('المجلد: ' + DriveApp.getFolderById(props.getProperty('ROOT_FOLDER')).getUrl());
  return ss.getUrl();
}

function ensureTab_(ss, name, headers, textCols) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  (textCols || []).forEach(h => {
    const c = headers.indexOf(h);
    if (c >= 0) sh.getRange(2, c + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  return sh;
}

/* ===================== أدوات عامة ===================== */
function prop_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error('النظام غير مُعدّ بعد. شغّلي setup() من المحرر.');
  return v;
}
// ذاكرة داخل الطلب الواحد: الشيت يُفتح مرة، وكل تبويب يُقرأ مرة (تُمسح عند أي كتابة)
const MEMO_ = { ss: null, sheets: {}, rows: {}, head: {} };
function ss_() { return MEMO_.ss || (MEMO_.ss = SpreadsheetApp.openById(prop_('SHEET_ID'))); }
function sheet_(name) { return MEMO_.sheets[name] || (MEMO_.sheets[name] = ss_().getSheetByName(name)); }
function dirty_(name) { delete MEMO_.rows[name]; delete MEMO_.head[name]; }
function tz_() { return Session.getScriptTimeZone(); }
function now_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
function cleanEmail_(e) { return String(e || '').trim().toLowerCase(); }
function isEmail_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 200; }
function isIsoDate_(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')); }
/** عدد أيام الإتمام شاملاً يومي البدء والانتهاء: من 1 إلى 10 = 10 أيام */
function daysInclusive_(start, end) {
  const t = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(end) - t(start)) / 86400000) + 1;
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** نص من المستخدم: يُقصّ ويُمنع أن يُفسَّر كمعادلة في الشيت */
function safe_(s, max) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, max || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function rows_(name) {
  if (MEMO_.rows[name]) return MEMO_.rows[name];
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const head = values.shift();
  MEMO_.head[name] = head;
  return (MEMO_.rows[name] = values.map((r, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, j) => o[h] = r[j] instanceof Date
      ? Utilities.formatDate(r[j], tz_(), 'yyyy-MM-dd') : r[j]);
    return o;
  }));
}
function setCells_(name, row, obj) {
  const sh = sheet_(name);
  let head = MEMO_.head[name] || sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  dirty_(name);
  const missing = Object.keys(obj).filter(k => head.indexOf(k) < 0);
  if (missing.length) { // عمود جديد (مثل «القالب») في شيت أُنشئ قبل إضافته
    sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);
    head = head.concat(missing);
  }
  Object.keys(obj).forEach(k => {
    const c = head.indexOf(k);
    if (c >= 0) sh.getRange(row, c + 1).setValue(obj[k]);
  });
}
function appendObj_(name, headers, obj) {
  const sh = sheet_(name);
  dirty_(name);
  let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const missing = headers.filter(h => head.indexOf(h) < 0);
  if (missing.length) {
    sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]);
    head = head.concat(missing);
  }
  sh.appendRow(head.map(h => obj[h] == null ? '' : obj[h]));
}
function findReq_(id) {
  const r = rows_(TABS.REQ).filter(x => String(x['رقم الطلب']) === String(id))[0];
  if (!r) throw new Error('الطلب غير موجود.');
  return r;
}

/* ===================== الدورات (من الموقع) ===================== */
/** templates/courses.json على الموقع هو المصدر الوحيد لقائمة الدورات */
function courses_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('courses');
  if (hit) return JSON.parse(hit);
  let res = null;
  for (const base of [siteUrl_(), String(setting_('PAGES_URL')).replace(/\/?$/, '/')]) {
    try { res = UrlFetchApp.fetch(base + 'templates/courses.json?t=' + Date.now(), { muteHttpExceptions: true }); }
    catch (e) { res = null; }
    if (res && res.getResponseCode() === 200) break;
  }
  if (!res || res.getResponseCode() !== 200) throw new Error('تعذّرت قراءة قائمة الدورات من الموقع.');
  const list = JSON.parse(res.getContentText())
    .filter(c => c && c.id && c.name && c.nameAr)
    .map(c => ({ id: String(c.id), nameAr: String(c.nameAr), name: String(c.name),
      type: c.type === 'long' ? 'long' : 'short', minDays: Number(c.minDays) || 0, active: c.active === true,
      // أسماء بديلة (كما في الفورم القديم) للمطابقة عند الاستيراد، ونسخ القالب (مثل اختلاف المدرب) — الافتراضي مجلد بنفس المعرّف
      aliases: (Array.isArray(c.aliases) ? c.aliases : []).map(String),
      templates: (Array.isArray(c.templates) && c.templates.length ? c.templates : [{ dir: c.id, label: '' }])
        .filter(t => t && /^[a-z0-9-]+$/.test(String(t.dir))).map(t => ({ dir: String(t.dir), label: String(t.label || '') })) }));
  cache.put('courses', JSON.stringify(list), 600);
  return list;
}
function activeCourses_() {
  return courses_().filter(c => c.active).map(c => ({ id: c.id, nameAr: c.nameAr, name: c.name, type: c.type, minDays: c.minDays }));
}
function courseById_(id) { return courses_().filter(c => c.id === String(id))[0] || null; }

/* ===================== الدخول برمز ===================== */
function otp_() {
  // 6 أرقام من UUID عشوائي (أقوى من Math.random)
  const hex = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  return String(100000 + (parseInt(hex, 16) % 900000));
}

function requestCode(email) {
  email = cleanEmail_(email);
  if (!isEmail_(email)) throw new Error('البريد الإلكتروني غير صحيح.');
  const cache = CacheService.getScriptCache();
  if (cache.get('lock:' + email)) throw new Error('محاولات خاطئة كثيرة. حاول بعد 15 دقيقة.');
  const n = Number(cache.get('cnt:' + email) || 0);
  if (n >= 5) throw new Error('طلبت رموزاً كثيرة. حاول بعد نصف ساعة.');
  cache.put('cnt:' + email, String(n + 1), 1800);

  const code = otp_();
  cache.put('otp:' + email, code, 600);
  cache.remove('try:' + email);
  sendMail_({
    to: email,
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.REPLY_TO,
    subject: 'رمز الدخول إلى شهادات سلوكيرا: ' + code,
    htmlBody: shell_('رمز الدخول',
      '<p>رمز الدخول الخاص بك:</p>' +
      '<p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:' + CONFIG.COLOR_DARK + '">' + code + '</p>' +
      '<p style="color:#666">صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز تجاهل الرسالة.</p>'),
  });
  return true;
}

function verifyCode(email, code, remember) {
  email = cleanEmail_(email);
  const cache = CacheService.getScriptCache();
  if (cache.get('lock:' + email)) throw new Error('محاولات خاطئة كثيرة. حاول بعد 15 دقيقة.');
  const k = 'otp:' + email;
  const expected = cache.get(k);
  if (!expected || String(code || '').trim() !== expected) {
    const tries = Number(cache.get('try:' + email) || 0) + 1;
    if (tries >= 5) {
      // القفل: الرمز الحالي يُلغى ولا يُقبل أي رمز لمدة 15 دقيقة
      cache.remove(k); cache.remove('try:' + email);
      cache.put('lock:' + email, '1', 900);
      throw new Error('محاولات خاطئة كثيرة. أُقفل الدخول 15 دقيقة.');
    }
    cache.put('try:' + email, String(tries), 600);
    throw new Error('الرمز غير صحيح أو انتهت صلاحيته.');
  }
  cache.remove(k); cache.remove('try:' + email); cache.remove('cnt:' + email);
  let token;
  if (remember) token = signedToken_(email, Date.now() + CONFIG.REMEMBER_DAYS * 86400000);
  else { token = Utilities.getUuid() + Utilities.getUuid(); cache.put('tok:' + token, email, CONFIG.SESSION_HOURS * 3600); }
  let data = null;
  try { data = getMyData(token); } catch (e) { }
  return { token: token, email: email, data: data };
}

/* جلسة «تذكّرني»: r1.<البريد وتاريخ الانتهاء>.<توقيع HMAC بسرّ في Script Properties> — لا تُخزَّن في الخادم ولا يمكن تزويرها */
function sessionSecret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SESSION_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SESSION_SECRET', s); }
  return s;
}
function sign_(v) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(v, sessionSecret_())).replace(/=+$/, ''); }
function signedToken_(email, exp) {
  const body = Utilities.base64EncodeWebSafe(Utilities.newBlob(email + '|' + exp).getBytes()).replace(/=+$/, '');
  return 'r1.' + body + '.' + sign_(body);
}
function readSignedToken_(t) {
  const parts = String(t).split('.');
  if (parts.length !== 3 || parts[0] !== 'r1' || !sameStr_(sign_(parts[1]), parts[2])) return null;
  const pad = parts[1] + '==='.slice((parts[1].length + 3) % 4);
  const [email, exp] = Utilities.newBlob(Utilities.base64DecodeWebSafe(pad)).getDataAsString().split('|');
  return Number(exp) > Date.now() ? email : null;
}
function who_(token) {
  const email = token && typeof token === 'string' && (token.indexOf('r1.') === 0 ? readSignedToken_(token) : CacheService.getScriptCache().get('tok:' + token));
  if (!email) throw new Error('انتهت الجلسة. سجّل الدخول من جديد.');
  return email;
}
function admins_() { return String(setting_('ADMINS')).split(/[,\s]+/).map(cleanEmail_).filter(String); }
function isAdmin_(email) { return admins_().indexOf(cleanEmail_(email)) >= 0; }
/* ===================== دخول الإدارة (بريد + كلمة مرور) =====================
 * كلمات المرور لا تُحفظ أبداً: يُحفظ ملح عشوائي + تجزئة SHA-256 مكررة في Script Properties (pw:<email>).
 * التعيين أو الاستعادة برابط لمرة واحدة يصل إلى بريد عضو الفريق نفسه (صالح 30 دقيقة).
 * 5 محاولات خاطئة ← قفل 15 دقيقة. جلسات الإدارة منفصلة عن جلسات المتدربين ولا تُقبل رموز المتدربين في أي إجراء إداري. */
function hashPw_(salt, pw) {
  let h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8);
  for (let i = 0; i < CONFIG.PW_ITER; i++) h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h.concat(Utilities.newBlob(salt).getBytes()));
  return Utilities.base64Encode(h);
}
function sameStr_(a, b) { // مقارنة بزمن ثابت
  a = String(a); b = String(b); let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function adminLogin(email, password) {
  email = cleanEmail_(email);
  const cache = CacheService.getScriptCache();
  if (cache.get('alock:' + email)) throw new Error('محاولات خاطئة كثيرة. حاول بعد 15 دقيقة.');
  const stored = isAdmin_(email) ? PropertiesService.getScriptProperties().getProperty('pw:' + email) : null;
  const ok = stored && (() => { const [salt, hash] = stored.split('$'); return sameStr_(hashPw_(salt, String(password || '')), hash); })();
  if (!ok) {
    const n = Number(cache.get('atry:' + email) || 0) + 1;
    if (n >= 5) { cache.remove('atry:' + email); cache.put('alock:' + email, '1', 900); throw new Error('محاولات خاطئة كثيرة. أُقفل الدخول 15 دقيقة.'); }
    cache.put('atry:' + email, String(n), 900);
    throw new Error('البريد أو كلمة المرور غير صحيحة. أول مرة؟ اضغط «تعيين / نسيت كلمة المرور».');
  }
  cache.remove('atry:' + email);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('atok:' + token, email, CONFIG.ADMIN_SESSION_HOURS * 3600);
  return { token: token, email: email };
}
/** يرسل رابط تعيين كلمة المرور لعضو الفريق فقط — والرد واحد دائماً حتى لا يكشف من هو في الفريق */
function adminResetRequest(email) {
  email = cleanEmail_(email);
  const done = 'إذا كان هذا البريد من فريق الإدارة فقد أرسلنا إليه رابط تعيين كلمة المرور (صالح 30 دقيقة).';
  if (!isEmail_(email) || !isAdmin_(email)) return done;
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('rcnt:' + email) || 0);
  if (n >= 3) throw new Error('طلبت روابط كثيرة. حاول بعد ساعة.');
  cache.put('rcnt:' + email, String(n + 1), 3600);
  const t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache.put('reset:' + t, email, 1800);
  const link = appUrl_() + 'admin.html?reset=' + t;
  sendMail_({
    to: email,
    subject: 'تعيين كلمة مرور لوحة شهادات سلوكيرا',
    htmlBody: shell_('تعيين كلمة المرور',
      '<p>طُلب تعيين كلمة مرور لدخول لوحة إدارة الشهادات بهذا البريد.</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:' + CONFIG.COLOR_PRIMARY + ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">تعيين كلمة المرور</a></p>' +
      '<p style="color:#666">الرابط صالح لمدة 30 دقيقة ولمرة واحدة. إذا لم تطلبه تجاهل الرسالة، ولن يتغير شيء.</p>'),
  });
  return done;
}
function adminSetPassword(resetToken, password) {
  const cache = CacheService.getScriptCache();
  const email = resetToken && cache.get('reset:' + resetToken);
  if (!email || !isAdmin_(email)) throw new Error('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.');
  password = String(password || '');
  if (password.length < CONFIG.PW_MIN) throw new Error('كلمة المرور قصيرة: ' + CONFIG.PW_MIN + ' أحرف على الأقل.');
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) throw new Error('كلمة المرور يجب أن تحتوي حروفاً وأرقاماً.');
  const salt = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('pw:' + email, salt + '$' + hashPw_(salt, password));
  cache.remove('reset:' + resetToken); cache.remove('alock:' + email); cache.remove('atry:' + email);
  return adminLogin(email, password);
}
function admin_(token) {
  const cache = CacheService.getScriptCache();
  const email = token && typeof token === 'string' && cache.get('atok:' + token);
  if (!email) throw new Error('غير مصرّح. سجّل الدخول إلى لوحة الإدارة.');
  if (!isAdmin_(email)) { cache.remove('atok:' + token); throw new Error('غير مصرّح.'); }
  cache.put('atok:' + token, email, CONFIG.ADMIN_SESSION_HOURS * 3600); // تجديد الجلسة مع الاستخدام
  return email;
}
function adminLogout(token) { if (token) CacheService.getScriptCache().remove('atok:' + token); return true; }
function adminMe(token) { return { email: admin_(token) }; }
function logout(token) {
  if (token) CacheService.getScriptCache().remove('tok:' + token);
  return true;
}

/* ===================== المتدرب ===================== */
function getMyData(token) {
  const email = who_(token);
  const mine = rows_(TABS.REQ).filter(r => cleanEmail_(r['البريد']) === email);
  return {
    email: email,
    courses: activeCourses_(),
    survey: CONFIG.SURVEY,
    surveyComment: CONFIG.SURVEY_COMMENT,
    issueDays: CONFIG.ISSUE_DAYS,
    requests: mine.map(r => ({
      id: r['رقم الطلب'], course: r['اسم الدورة'], date: String(r['تاريخ الطلب']).slice(0, 10),
      status: r['الحالة'], certNo: r['الحالة'] === ST.ISSUED ? r['رقم الشهادة'] : '',
      issued: r['تاريخ الإصدار'],
      note: r['الحالة'] === ST.REJECTED ? r['ملاحظات'] : '',
    })).reverse(),
  };
}

const NAME_EN_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/;
const NAME_AR_RE = /^[؀-ۿ][؀-ۿ\s]{1,79}$/;
const clean_ = s => String(s || '').replace(/\s+/g, ' ').trim();

/** طلب شهادة لدورة أو أكثر في نموذج واحد. كل دورة = طلب مستقل يُراجَع ويُعتمد أو يُرفض وحده، وتجمعها «رقم المجموعة» */
const MAX_COURSES_PER_REQUEST = 15;
function submitRequest(token, d) {
  const email = who_(token);
  d = d || {};
  const nameEn = clean_(d.nameEn), nameAr = clean_(d.nameAr), city = clean_(d.city);
  const platformEmail = cleanEmail_(d.platformEmail);
  if (!nameAr || !NAME_AR_RE.test(nameAr)) throw new Error('اكتب اسمك الثلاثي بالعربية.');
  if (!nameEn) throw new Error('اكتب اسمك بالإنجليزية كما تريده على الشهادة.');
  if (!NAME_EN_RE.test(nameEn)) throw new Error('الاسم يُكتب بالحروف الإنجليزية فقط (مثال: Sara Ahmed Al-Harbi).');
  if (!isEmail_(platformEmail)) throw new Error('اكتب البريد الإلكتروني المستخدم في المنصة.');
  if (!city) throw new Error('اكتب المدينة.');
  const phone = String(d.phone || '').replace(/[\s\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(phone)) throw new Error('اكتب رقم الجوال (أرقام فقط، مثال: 0501234567 أو +966501234567).');
  const wanted = (Array.isArray(d.courseIds) ? d.courseIds : [d.courseId]).map(String).filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i);
  if (!wanted.length) throw new Error('اختر الدورة.');
  if (wanted.length > MAX_COURSES_PER_REQUEST) throw new Error('يمكن طلب ' + MAX_COURSES_PER_REQUEST + ' شهادة كحد أقصى في الطلب الواحد.');
  const active = activeCourses_();
  const courses = wanted.map(id => active.filter(c => c.id === id)[0]);
  if (courses.some(c => !c)) throw new Error((courses.length > 1 ? 'إحدى الدورات المختارة' : 'الدورة المختارة') + ' غير متاحة. حدّث الصفحة واختر من جديد.');
  if (!Array.isArray(d.survey) || d.survey.length !== CONFIG.SURVEY.length ||
    d.survey.some((v, i) => !(Number(v) >= 1 && Number(v) <= CONFIG.SURVEY[i].max && Number(v) % 1 === 0)))
    throw new Error('أكمل جميع أسئلة استبيان الرضا.');
  if (!clean_(d.comment)) throw new Error('اكتب ملاحظاتك أو مقترحاتك في آخر الاستبيان.');

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const mine = rows_(TABS.REQ).filter(r => cleanEmail_(r['البريد']) === email && [ST.PENDING, ST.ISSUED].indexOf(r['الحالة']) >= 0);
    const skipped = [], fresh = [];
    courses.forEach(c => {
      const dup = mine.filter(r => String(r['معرّف الدورة']) === c.id)[0];
      if (dup) skipped.push({ course: c.nameAr, reason: dup['الحالة'] === ST.ISSUED ? 'صادرة لك مسبقاً، تجدها في «شهاداتي»' : 'لديك طلب لها قيد المراجعة' });
      else fresh.push(c);
    });
    if (!fresh.length) {
      if (skipped.length === 1) throw new Error(skipped[0].reason.indexOf('صادرة') === 0
        ? 'شهادة هذه الدورة صادرة لك مسبقاً، تجدها في «شهاداتي».' : 'لديك طلب لهذه الدورة قيد المراجعة، لا حاجة لتقديم طلب جديد.');
      throw new Error('كل الدورات المختارة إما صادرة لك أو قيد المراجعة:\n' + skipped.map(x => '• ' + x.course + ': ' + x.reason).join('\n'));
    }
    const stamp = Utilities.formatDate(new Date(), tz_(), 'yyMMdd');
    const group = fresh.length > 1 ? 'GRP-' + stamp + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase() : '';
    const ids = fresh.map(c => {
      const id = 'REQ-' + stamp + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
      appendObj_(TABS.REQ, REQ_HEADERS, {
        'رقم الطلب': id, 'تاريخ الطلب': now_(), 'الاسم بالإنجليزي': safe_(nameEn, 80), 'الاسم بالعربي': safe_(nameAr, 80),
        'البريد': email, 'البريد في المنصة': safe_(platformEmail, 200), 'الجوال': safe_(phone, 20), 'المدينة': safe_(city, 60),
        'معرّف الدورة': c.id, 'اسم الدورة': c.nameAr, 'اسم الدورة (EN)': c.name,
        'نوع البرنامج': TYPE_LABEL[c.type], 'رقم المجموعة': group,
        'الحالة': ST.PENDING,
      });
      // الاستبيان: نفس الإجابات تُسجَّل لكل دورة حتى تبقى إحصاءات كل دورة صحيحة
      const sv = {}; sv['رقم الطلب'] = id; sv['التاريخ'] = now_(); sv['البريد'] = email; sv['الدورة'] = c.nameAr;
      CONFIG.SURVEY.forEach((x, i) => sv[x.q] = Number(d.survey[i]));
      sv[CONFIG.SURVEY_COMMENT] = safe_(d.comment, 2000);
      appendObj_(TABS.SURVEY, SURVEY_HEADERS, sv);
      return id;
    });
    try {
      const list = fresh.map((c, i) => '<li><b>' + esc_(c.nameAr) + '</b> <span dir="ltr" style="color:#888;font-size:12px">(' + ids[i] + ')</span></li>').join('');
      sendMail_({
        to: email,
        subject: 'استلمنا طلب ' + (fresh.length > 1 ? fresh.length + ' شهادات' : 'شهادتك | ' + fresh[0].nameAr),
        htmlBody: shell_('استلمنا طلبك',
          '<p>مرحباً ' + esc_(nameAr) + '،</p>' +
          '<p>وصلنا طلب ' + (fresh.length > 1 ? 'الشهادات التالية' : 'الشهادة التالية') + ':</p><ul style="padding-right:20px">' + list + '</ul>' +
          '<p style="background:#EEF4FB;padding:12px 16px;border-radius:8px">تُصدر الشهادة خلال ' + CONFIG.ISSUE_DAYS +
          '، علماً بأن يومي الجمعة والسبت عطلة رسمية. ' + (fresh.length > 1 ? 'تُراجَع كل شهادة على حدة، وتصلك كل واحدة فور اعتمادها' : 'ستصلك على بريدك هذا') +
          '، وتجدها أيضاً في «شهاداتي».</p>' +
          '<p>الاسم كما سيظهر على الشهادة: <b dir="ltr">' + esc_(nameEn) + '</b></p>' +
          '<p style="color:#666;font-size:13px">إذا كان في الاسم خطأ، يُرجى الرد على هذه الرسالة قبل إصدار الشهادة؛ فتعديل الاسم بعد الإصدار يترتب عليه رسوم إضافية.</p>'),
      });
    } catch (e) { console.error('confirm mail: ' + e); }
    return { id: ids[0], ids: ids, group: group, skipped: skipped, requests: getMyData(token).requests };
  } finally { lock.releaseLock(); }
}

function downloadMyCert(token, certNo) {
  const email = who_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الشهادة'] && x['رقم الشهادة'] === String(certNo))[0];
  if (!r || cleanEmail_(r['البريد']) !== email) throw new Error('الشهادة غير موجودة.');
  if (r['الحالة'] !== ST.ISSUED) throw new Error('هذه الشهادة غير متاحة.');
  const f = DriveApp.getFileById(r['ملف الشهادة']);
  return { name: f.getName(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/* ===================== التحقق العام (رمز QR) ===================== */
function verifyCert(certNo) {
  certNo = String(certNo || '').trim().toUpperCase();
  if (!/^[A-Z]{2,5}-\d{4}-\d{6}$/.test(certNo)) return { status: 'notfound', certNo: certNo };
  const r = rows_(TABS.REQ).filter(x => x['رقم الشهادة'] === certNo)[0];
  if (r && r['الحالة'] === ST.ISSUED) {
    return { status: 'valid', certNo: certNo, name: r['الاسم بالإنجليزي'], course: r['اسم الدورة (EN)'] || r['اسم الدورة'], courseAr: r['اسم الدورة'],
      start: r['تاريخ البدء'], end: r['تاريخ الإتمام'], issued: String(r['تاريخ الإصدار']).slice(0, 10) };
  }
  if (r && r['الحالة'] === ST.REVOKED) return { status: 'revoked', certNo: certNo };
  return { status: 'notfound', certNo: certNo };
}

/* ===================== لوحة المراجعة ===================== */
function reqView_(r) {
  const c = courseById_(r['معرّف الدورة']);
  return {
    id: r['رقم الطلب'], nameEn: r['الاسم بالإنجليزي'], nameAr: r['الاسم بالعربي'], email: r['البريد'],
    platformEmail: r['البريد في المنصة'], city: r['المدينة'],
    phone: r['الجوال'], courseId: String(r['معرّف الدورة']), course: r['اسم الدورة'], courseEn: r['اسم الدورة (EN)'],
    type: r['نوع البرنامج'], minDays: c ? c.minDays : 0,
    date: String(r['تاريخ الطلب']).slice(0, 10), status: r['الحالة'],
    start: r['تاريخ البدء'], end: r['تاريخ الإتمام'], certNo: r['رقم الشهادة'], note: r['ملاحظات'],
    approvedBy: r['اعتمدها'], issued: r['تاريخ الإصدار'], group: r['رقم المجموعة'] || '',
    templates: c ? c.templates : [{ dir: String(r['معرّف الدورة']), label: '' }], template: r['القالب'] || '',
  };
}
function adminList(token) {
  admin_(token);
  return rows_(TABS.REQ).map(reqView_).reverse();
}

function adminGet(token, id) {
  admin_(token);
  return reqView_(findReq_(id));
}

/** رقم الشهادة يُحجز قبل التوليد حتى يُطبع على الشهادة ورمز QR — LockService يمنع التكرار */
function adminReserveNumber(token, id) {
  admin_(token);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const all = rows_(TABS.REQ);
    const r = all.filter(x => String(x['رقم الطلب']) === String(id))[0];
    if (!r) throw new Error('الطلب غير موجود.');
    if ([ST.REJECTED, ST.REVOKED].indexOf(r['الحالة']) >= 0) throw new Error('الطلب ' + r['الحالة'] + '.');
    if (r['رقم الشهادة']) return { certNo: r['رقم الشهادة'], verifyUrl: verifyUrl_(r['رقم الشهادة']) };
    const year = Utilities.formatDate(new Date(), tz_(), 'yyyy');
    const pre = CONFIG.CERT_PREFIX + '-' + year + '-';
    const max = all.map(x => String(x['رقم الشهادة'] || ''))
      .filter(n => n.indexOf(pre) === 0).map(n => Number(n.slice(pre.length)) || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    const certNo = pre + ('00000' + (max + 1)).slice(-6);
    setCells_(TABS.REQ, r._row, { 'رقم الشهادة': certNo });
    SpreadsheetApp.flush();
    return { certNo: certNo, verifyUrl: verifyUrl_(certNo) };
  } finally { lock.releaseLock(); }
}

/** الاعتماد: حفظ الملف + الإيميل + تحديث السجل. test=true يرسل للمراجِعة فقط ولا يغيّر شيئاً */
function adminApprove(token, d) {
  const by = admin_(token);
  d = d || {};
  const r = findReq_(d.id);
  if ([ST.REJECTED, ST.REVOKED].indexOf(r['الحالة']) >= 0) throw new Error('لا يمكن إصدار طلب ' + r['الحالة'] + '.');
  if (r['الحالة'] === ST.ISSUED && !d.resend && !d.test) throw new Error('الشهادة صادرة مسبقاً.');
  if (!r['رقم الشهادة'] || r['رقم الشهادة'] !== d.certNo) throw new Error('رقم الشهادة غير مطابق. أعيدي التوليد.');
  if (!isIsoDate_(d.start) || !isIsoDate_(d.end)) throw new Error('حددي تاريخ البدء وتاريخ الإتمام.');
  if (d.start > d.end) throw new Error('تاريخ البدء بعد تاريخ الإتمام.');
  const course = courseById_(r['معرّف الدورة']);
  if (course && course.minDays && daysInclusive_(d.start, d.end) < course.minDays)
    throw new Error('مدة الإتمام ' + daysInclusive_(d.start, d.end) + ' أيام، وهذه الشهادة تشترط ' + course.minDays + ' أيام على الأقل. لا يمكن إصدارها.');
  const tpls = course ? course.templates : [{ dir: String(r['معرّف الدورة']), label: '' }];
  const tpl = String(d.template || tpls[0].dir);
  if (!tpls.some(t => t.dir === tpl)) throw new Error('القالب المختار لا يخص هذه الدورة.');
  const nameEn = String(d.nameEn || r['الاسم بالإنجليزي']).replace(/\s+/g, ' ').trim();
  if (!NAME_EN_RE.test(nameEn)) throw new Error('الاسم بالإنجليزية غير صالح.');
  if (!d.pdf) throw new Error('لم تتولد الشهادة.');

  const fileName = (d.certNo + ' - ' + nameEn + ' - ' + (r['اسم الدورة (EN)'] || r['معرّف الدورة']))
    .replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').slice(0, 150).trim() + '.pdf';
  const blob = Utilities.newBlob(Utilities.base64Decode(String(d.pdf)), 'application/pdf', fileName);
  if (blob.getBytes().slice(0, 4).map(b => String.fromCharCode(b)).join('') !== '%PDF') throw new Error('ملف الشهادة غير صالح.');

  const view = Object.assign({}, r, { 'الاسم بالإنجليزي': nameEn, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end });
  if (d.test) {
    sendCertEmail_(cleanEmail_(by), view, d.certNo, blob, true);
    return 'تم إرسال نسخة تجريبية إلى ' + by + ' (لم تتغير حالة الطلب).';
  }

  const file = DriveApp.getFolderById(prop_('CERTS_FOLDER')).createFile(blob);
  if (r['ملف الشهادة']) { try { DriveApp.getFileById(r['ملف الشهادة']).setTrashed(true); } catch (e) { } }
  setCells_(TABS.REQ, r._row, {
    'الحالة': ST.ISSUED, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end,
    'ملف الشهادة': file.getId(), 'تاريخ الإصدار': now_(), 'اعتمدها': by, 'القالب': tpl,
    'الاسم بالإنجليزي': safe_(nameEn, 80),
  });
  sendCertEmail_(cleanEmail_(r['البريد']), view, d.certNo, blob, false);
  return 'صدرت الشهادة ' + d.certNo + ' وأُرسلت إلى ' + r['البريد'];
}

function adminReject(token, id, reason) {
  const by = admin_(token);
  const r = findReq_(id);
  if (r['الحالة'] !== ST.PENDING) throw new Error('لا يمكن رفض طلب حالته «' + r['الحالة'] + '».');
  reason = String(reason || '').trim();
  if (!reason) throw new Error('اكتبي سبب الرفض ليظهر للمتدرب.');
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.REJECTED, 'ملاحظات': safe_(reason, 1000), 'اعتمدها': by });
  sendMail_({
    to: r['البريد'],
    subject: 'بخصوص طلب شهادة ' + r['اسم الدورة'],
    htmlBody: shell_('بخصوص طلب الشهادة',
      '<p>مرحباً ' + esc_(r['الاسم بالعربي'] || r['الاسم بالإنجليزي']) + '،</p>' +
      '<p>راجعنا طلب شهادة <b>' + esc_(r['اسم الدورة']) + '</b> ولم نتمكن من إصدارها حالياً للسبب التالي:</p>' +
      '<p style="background:#FFF4E5;padding:12px 16px;border-radius:8px">' + esc_(reason) + '</p>' +
      '<p>يمكنك تقديم طلب جديد بعد المعالجة من <a href="' + appUrl_() + '">موقع الشهادات</a>، أو الرد على هذه الرسالة.</p>'),
  });
  return 'تم الرفض وإبلاغ المتدرب.';
}

function adminRevoke(token, id, reason) {
  const by = admin_(token);
  const r = findReq_(id);
  if (r['الحالة'] !== ST.ISSUED) throw new Error('الإلغاء للشهادات الصادرة فقط.');
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.REVOKED, 'ملاحظات': safe_(reason, 1000), 'اعتمدها': by });
  return 'أُلغيت الشهادة ' + r['رقم الشهادة'] + '. صفحة التحقق ستظهرها ملغاة.';
}


/* ===================== الاستيراد من Google Form (الطلبات القديمة) =====================
 * يقرأ شيت ردود الفورم (يجب أن يكون care@ قادراً على فتحه)، ويحوّل كل رد من تاريخ معيّن إلى طلب «بانتظار المراجعة».
 * المعاينة لا تكتب شيئاً. الاستيراد يتخطى المكرر (نفس البريد + الدورة + وقت الرد) فإعادة تشغيله آمنة. لا تُرسل إيميلات. */
function normAr_(s) {
  return String(s || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFA-Za-z0-9]+/g, '').toLowerCase();
}
function sheetIdFromUrl_(url) {
  const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]{20,})/) || String(url || '').match(/^([A-Za-z0-9_-]{20,})$/);
  if (!m) throw new Error('رابط الشيت غير صحيح.');
  return m[1];
}
function readForm_(url, fromDate) {
  if (!isIsoDate_(fromDate)) throw new Error('حددي تاريخ البداية.');
  let ss;
  try { ss = SpreadsheetApp.openById(sheetIdFromUrl_(url)); }
  catch (e) { throw new Error('لا يستطيع النظام فتح الشيت. شاركيه مع care@sulukera.com (عارض) ثم أعيدي المحاولة.'); }
  const gid = (String(url).match(/[#&?]gid=(\d+)/) || [])[1];
  const sh = (gid && ss.getSheets().filter(x => String(x.getSheetId()) === gid)[0]) || ss.getSheets()[0];
  const v = sh.getDataRange().getValues();
  const head = v.shift().map(h => String(h).trim());
  const find = (re, not) => head.findIndex(h => re.test(h) && !(not && not.test(h)));
  const col = {
    time: find(/طابع زمني|timestamp/i),
    nameAr: find(/الاسم.*العربي/),
    nameEn: find(/الاسم.*(الإنجليزي|الانجليزي|english)/i),
    platform: find(/البريد.*المنصة|المنصة.*البريد/),
    email: find(/البريد|e-?mail/i, /المنصة/),
    phone: find(/الجوال|الهاتف|التواصل|phone/i),
    status: find(/^الحالة$/),
    city: find(/المدينة|city/i),
    course: head.reduce((best, h, i) => /الدورة|البرنامج/.test(h) && (best < 0 || h.length < head[best].length) ? i : best, -1),
  };
  const missing = Object.keys(col).filter(k => col[k] < 0 && ['time', 'email', 'nameEn', 'course'].indexOf(k) >= 0);
  if (missing.length) throw new Error('لم أجد في الشيت الأعمدة: ' + missing.join('، ') + '. العناوين الموجودة: ' + head.join(' | '));
  const sv = CONFIG.SURVEY.map(x => head.findIndex(h => normAr_(h).indexOf(normAr_(x.q)) >= 0));
  const cm = head.findIndex(h => /ملاحظات|مقترحات/.test(h));
  const from = new Date(fromDate + 'T00:00:00');
  const all = courses_();
  const byName = {}; all.forEach(c => { [c.nameAr].concat(c.aliases || []).forEach(n => { byName[normAr_(n)] = c; }); });
  return {
    tab: sh.getName(), headers: head,
    rows: v.map((r, i) => {
      const t = r[col.time] instanceof Date ? r[col.time] : new Date(r[col.time]);
      const courseName = String(r[col.course] || '').trim();
      const c = byName[normAr_(courseName)] || null;
      return {
        line: i + 2, time: t, email: cleanEmail_(r[col.email]), nameAr: col.nameAr >= 0 ? clean_(r[col.nameAr]) : '',
        nameEn: clean_(r[col.nameEn]), platform: col.platform >= 0 ? cleanEmail_(r[col.platform]) : '',
        phone: col.phone >= 0 ? String(r[col.phone] || '').replace(/[\s\-()]/g, '') : '', city: col.city >= 0 ? clean_(r[col.city]) : '',
        courseName: courseName, course: c && c.active ? c : null, inactive: !!(c && !c.active),
        survey: sv.map(k => k >= 0 ? Number(r[k]) || '' : ''), comment: cm >= 0 ? String(r[cm] || '') : '',
        handled: col.status >= 0 ? String(r[col.status] || '').trim() : '',
      };
    }).filter(x => x.time instanceof Date && !isNaN(x.time) && x.time >= from && x.email),
  };
}
function importKey_(email, courseId, time) { return email + '|' + courseId + '|' + Utilities.formatDate(time, tz_(), 'yyyy-MM-dd HH:mm'); }
function adminImportPreview(token, url, fromDate) {
  admin_(token);
  const f = readForm_(url, fromDate);
  const existing = {};
  rows_(TABS.REQ).forEach(r => { if (r['مفتاح الاستيراد']) existing[r['مفتاح الاستيراد']] = 1; });
  const names = {};
  f.rows.forEach(x => {
    const k = x.courseName || '(فارغ)';
    names[k] = names[k] || { name: k, count: 0, courseId: x.course ? x.course.id : '', inactive: x.inactive };
    names[k].count++;
  });
  const handled = f.rows.filter(x => x.handled);
  f.rows = f.rows.filter(x => !x.handled);
  const ready = f.rows.filter(x => x.course && !existing[importKey_(x.email, x.course.id, x.time)]);
  return {
    tab: f.tab, total: f.rows.length + handled.length, handled: handled.length, ready: ready.length,
    already: f.rows.filter(x => x.course && existing[importKey_(x.email, x.course.id, x.time)]).length,
    unmatched: f.rows.filter(x => !x.course).length,
    courses: Object.keys(names).map(k => names[k]).sort((a, b) => b.count - a.count),
    sample: ready.slice(0, 8).map(x => ({ line: x.line, date: Utilities.formatDate(x.time, tz_(), 'yyyy-MM-dd'), email: x.email, nameEn: x.nameEn, course: x.course.nameAr })),
  };
}
function adminImport(token, url, fromDate) {
  const by = admin_(token);
  const f = readForm_(url, fromDate);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const existing = {};
    rows_(TABS.REQ).forEach(r => { if (r['مفتاح الاستيراد']) existing[r['مفتاح الاستيراد']] = 1; });
    let n = 0;
    f.rows.forEach(x => {
      if (!x.course || x.handled) return;
      const key = importKey_(x.email, x.course.id, x.time);
      if (existing[key]) return;
      existing[key] = 1;
      const id = 'REQ-' + Utilities.formatDate(x.time, tz_(), 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
      appendObj_(TABS.REQ, REQ_HEADERS.concat(['مفتاح الاستيراد', 'المصدر']), {
        'رقم الطلب': id, 'تاريخ الطلب': Utilities.formatDate(x.time, tz_(), 'yyyy-MM-dd HH:mm'),
        'الاسم بالإنجليزي': safe_(x.nameEn, 80), 'الاسم بالعربي': safe_(x.nameAr, 80), 'البريد': x.email,
        'البريد في المنصة': safe_(x.platform, 200), 'الجوال': safe_(x.phone, 20), 'المدينة': safe_(x.city, 60),
        'معرّف الدورة': x.course.id, 'اسم الدورة': x.course.nameAr, 'اسم الدورة (EN)': x.course.name,
        'نوع البرنامج': TYPE_LABEL[x.course.type], 'الحالة': ST.PENDING,
        'مفتاح الاستيراد': key, 'المصدر': 'Google Form (استيراد ' + by + ')',
      });
      if (x.survey.some(Boolean)) {
        const sv = {}; sv['رقم الطلب'] = id; sv['التاريخ'] = Utilities.formatDate(x.time, tz_(), 'yyyy-MM-dd HH:mm'); sv['البريد'] = x.email; sv['الدورة'] = x.course.nameAr;
        CONFIG.SURVEY.forEach((q, i) => sv[q.q] = x.survey[i]);
        sv[CONFIG.SURVEY_COMMENT] = safe_(x.comment, 2000);
        appendObj_(TABS.SURVEY, SURVEY_HEADERS, sv);
      }
      n++;
    });
    return 'عدد الطلبات المستوردة: ' + n + '، وصارت «بانتظار المراجعة».' + (f.rows.filter(x => !x.course).length ? ' بقيت ردود لدورات غير مفعّلة أو غير معروفة؛ تُستورد عند تفعيلها بإعادة الاستيراد.' : '');
  } finally { lock.releaseLock(); }
}

/* ===================== الإرسال ===================== */
/** كل الإيميلات تخرج من الحساب الذي يملك السكربت وينشره — care@sulukera.com — والرد إليه أيضاً */
function sendMail_(m) {
  const opts = { to: m.to, subject: m.subject, name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO, htmlBody: m.htmlBody };
  if (m.attachments) opts.attachments = m.attachments;
  MailApp.sendEmail(opts);
}

/* ===================== الإيميل ===================== */
function shell_(title, inner) {
  const logo = CONFIG.LOGO_URL
    ? '<img src="' + CONFIG.LOGO_URL + '" alt="سلوكيرا" style="height:44px">'
    : '<span style="font-size:22px;font-weight:bold;color:#fff">سلوكيرا | Sulukera</span>';
  return '<div dir="rtl" style="background:#F3F5F8;padding:24px 12px;font-family:Tahoma,Arial,sans-serif">' +
    '<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">' +
    '<div style="background:' + CONFIG.COLOR_DARK + ';padding:20px 24px;text-align:right">' + logo + '</div>' +
    '<div style="padding:28px 24px;color:#222;font-size:15px;line-height:1.9;text-align:right">' +
    '<h2 style="margin:0 0 12px;color:' + CONFIG.COLOR_DARK + '">' + esc_(title) + '</h2>' + inner + '</div>' +
    '<div style="padding:14px 24px;background:#F8F9FB;color:#888;font-size:12px;text-align:right">' +
    'للاستفسار: <a href="mailto:' + CONFIG.REPLY_TO + '">' + CONFIG.REPLY_TO + '</a></div></div></div>';
}

/** yyyy-MM-dd ← MM/dd/yyyy كما على الشهادة */
function usDate_(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[2] + '/' + m[3] + '/' + m[1] : String(iso || ''); }

/** إيميل الشهادة — النص المعتمد من مريم (الاقتراح «ب»، 2026-11-24) */
function sendCertEmail_(to, r, certNo, blob, test) {
  const verify = verifyUrl_(certNo);
  const btn = (href, label, bg) => '<a href="' + href + '" style="display:inline-block;background:' + bg +
    ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;margin:4px 0 4px 8px">' + label + '</a>';
  const cell = 'padding:9px 14px;border-bottom:1px solid #E3E8F2';
  const line = (k, v) => '<tr><td style="' + cell + ';color:#5B6478;width:42%">' + k + '</td><td style="' + cell + '"><b dir="ltr">' + esc_(v) + '</b></td></tr>';
  const start = usDate_(r['تاريخ البدء']), end = usDate_(r['تاريخ الإتمام']);
  const ex = (() => { const m = String(r['تاريخ البدء'] || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return m ? usDate_(r['تاريخ البدء']) + ' تعني ' + Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ' ' + m[1] : '09/07/2026 تعني 7 سبتمبر 2026'; })();
  sendMail_({
    to: to,
    subject: (test ? '[تجربة] ' : '') + CONFIG.SUBJECT.replace('{{course}}', r['اسم الدورة']),
    attachments: [blob],
    htmlBody: shell_('مبارك! 🎓',
      (test ? '<p style="background:#FFF4E5;padding:8px 12px;border-radius:8px">نسخة تجريبية للمراجِعة — لم تُرسل للمتدرب.</p>' : '') +
      '<p>مرحباً ' + esc_(r['الاسم بالعربي'] || r['الاسم بالإنجليزي']) + '،</p>' +
      '<p>نهنئك لحصولك على شهادة التعليم المستمر في:<br><b style="font-size:17px;color:' + CONFIG.COLOR_DARK + '">' + esc_(r['اسم الدورة']) + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;background:#F5F8FF;border-radius:10px;margin:14px 0;font-size:14px">' +
        line('رقم الشهادة', certNo) + line('الاسم على الشهادة', r['الاسم بالإنجليزي']) +
        (start && end ? line('مدة الدورة', start + ' – ' + end) : '') + '</table>' +
      '<p>📎 مرفق لك الشهادة، ويمكنك تحميلها في أي وقت من «شهاداتي»، والتحقق منها برمز QR المطبوع عليها.</p>' +
      '<p>' + btn(verify, 'التحقق من الشهادة', CONFIG.COLOR_PRIMARY) + btn(appUrl_(), 'شهاداتي', CONFIG.COLOR_DARK) + '</p>' +
      '<p style="background:#FFF8EB;padding:12px 16px;border-radius:8px;font-size:14px"><b>ملاحظة حول التاريخ:</b> التاريخ مكتوب بالصيغة الأمريكية المعتمدة لدى البورد: ' +
        'الشهر ثم اليوم ثم السنة (MM/DD/YYYY). فمثلاً <span dir="ltr">' + ex.split(' تعني ')[0] + '</span> تعني ' + ex.split(' تعني ')[1] + '.</p>' +
      '<p>يسعدنا أن نراك في برامج تدريبية قادمة تدعم مسارك المهني والعملي.</p>' +
      '<p>مع أطيب التمنيات،<br>فريق سلوكيرا</p>'),
  });
}

/* ===================== نقطة الدخول (API) ===================== */
const ACTIONS = {
  // عامة
  requestCode: b => requestCode(b.email),
  verifyCode: b => verifyCode(b.email, b.code, b.remember === true),
  verify: b => verifyCert(b.certNo),
  courses: () => activeCourses_(),
  // متدرب مسجّل
  logout: b => logout(b.token),
  getMyData: b => getMyData(b.token),
  submitRequest: b => submitRequest(b.token, b.data),
  downloadMyCert: b => downloadMyCert(b.token, b.certNo),
  // دخول الإدارة
  adminLogin: b => adminLogin(b.email, b.password),
  adminResetRequest: b => adminResetRequest(b.email),
  adminSetPassword: b => adminSetPassword(b.reset, b.password),
  adminLogout: b => adminLogout(b.token),
  adminMe: b => adminMe(b.token),
  // إداري (كل دالة تتحقق بنفسها عبر admin_)
  adminList: b => adminList(b.token),
  adminGet: b => adminGet(b.token, b.id),
  adminReserveNumber: b => adminReserveNumber(b.token, b.id),
  adminApprove: b => adminApprove(b.token, b.data),
  adminReject: b => adminReject(b.token, b.id, b.reason),
  adminRevoke: b => adminRevoke(b.token, b.id, b.reason),
  adminImportPreview: b => adminImportPreview(b.token, b.url, b.from),
  adminImport: b => adminImport(b.token, b.url, b.from),
};

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** الإعداد التلقائي: أول طلب بعد النشر ينشئ الشيت والمجلدات إن لم تكن موجودة */
function ensureSetup_() {
  if (PropertiesService.getScriptProperties().getProperty('SHEET_ID')) return;
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { if (!PropertiesService.getScriptProperties().getProperty('SHEET_ID')) setup(); }
  finally { lock.releaseLock(); }
}

function memoReset_() { MEMO_.ss = null; MEMO_.sheets = {}; MEMO_.rows = {}; MEMO_.head = {}; }

function doPost(e) {
  memoReset_();
  try { ensureSetup_(); } catch (err) { return json_({ ok: false, error: 'تعذّر تجهيز النظام: ' + err.message }); }
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'طلب غير صالح.' }); }
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, body.action) ? ACTIONS[body.action] : null;
  if (!fn) return json_({ ok: false, error: 'إجراء غير معروف.' });
  try {
    return json_({ ok: true, data: fn(body) });
  } catch (err) {
    console.error(body.action + ': ' + (err && err.stack || err));
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** GET يرجع حالة فقط (للتأكد أن النشر يعمل) */
function doGet() {
  memoReset_();
  ensureSetup_();
  return json_({ ok: true, service: 'sulukera-certificates', ready: true, time: new Date().toISOString() });
}
