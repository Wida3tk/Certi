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
  APP_URL: 'https://certificates.sulukera.com/',
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
  ISSUE_DAYS: 'يومين إلى ثلاثة أيام عمل',  // مدة الإصدار كما تظهر للمتدرب وفي الإيميلات (الدورات القصيرة)
  ISSUE_DAYS_PROGRAMS: 'ثلاثة إلى خمسة أيام عمل', // شهادات تحليل السلوك وإدارة السلوك التنظيمي (بعد المخالصة المالية)
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
const TABS = { REQ: 'الطلبات', SURVEY: 'الرضا', LOG: 'السجل' };
const LOG_HEADERS = ['التاريخ', 'بواسطة', 'الإجراء', 'رقم الطلب', 'تفاصيل'];
const REQ_HEADERS = [
  'رقم الطلب', 'تاريخ الطلب', 'الاسم بالإنجليزي', 'الاسم بالعربي', 'البريد', 'البريد في المنصة', 'الجوال', 'المدينة',
  'معرّف الدورة', 'اسم الدورة', 'اسم الدورة (EN)', 'نوع البرنامج', 'رقم المجموعة',
  'الحالة', 'تاريخ البدء', 'تاريخ الإتمام', 'القالب', 'رقم الشهادة', 'ملف الشهادة', 'تاريخ الإصدار',
  'اعتمدها', 'ملاحظات',
  'المخالصة', 'بيانات المخالصة', 'ملف المخالصة', 'تاريخ التوقيع', 'سجل التوقيع',
  'تعديل الاسم', 'بيانات تعديل الاسم',
];
// أعمدة تُحفظ نصاً كما هي (حتى لا يحوّل الشيت الجوال لرقم أو التاريخ لكائن تاريخ)
const TEXT_COLS = ['تاريخ الطلب', 'الجوال', 'تاريخ البدء', 'تاريخ الإتمام', 'رقم الشهادة', 'تاريخ الإصدار'];
const SURVEY_HEADERS = ['رقم الطلب', 'التاريخ', 'البريد', 'الدورة']
  .concat(CONFIG.SURVEY.map(s => s.q)).concat([CONFIG.SURVEY_COMMENT]);
const TYPE_LABEL = { short: 'دورة قصيرة', long: 'برنامج طويل' };

const ST = { PENDING: 'بانتظار المراجعة', ISSUED: 'صادرة', REJECTED: 'مرفوضة', REVOKED: 'ملغاة', HELD: 'معتمدة بانتظار المخالصة' };
// حالات المخالصة المالية (البرامج التي فيها clearance: true في courses.json)
const CLR = { FINANCE: 'بانتظار المالية', DUE: 'بانتظار السداد', SIGN: 'بانتظار التوقيع', SIGNED: 'موقّعة', NONE: 'لا تحتاج مخالصة' };
// طلب تعديل الاسم بعد الإصدار (برسوم): المتدرب يطلب ← المحاسب يؤكد السداد أو يعفي ← إعادة الإصدار بنفس الرقم
const NC = { PAY: 'بانتظار تأكيد السداد', DONE: 'تم التعديل', REJECTED: 'مرفوض' };

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
  ensureTab_(ss, TABS.LOG, LOG_HEADERS, ['التاريخ']);
  const first = ss.getSheets()[0];
  if (ss.getSheets().length > 3 && (first.getName() === 'Sheet1' || first.getName() === 'الورقة1')) ss.deleteSheet(first);

  if (!props.getProperty('ROOT_FOLDER')) {
    const root = DriveApp.createFolder('سلوكيرا — نظام الشهادات');
    props.setProperty('ROOT_FOLDER', root.getId());
    props.setProperty('CERTS_FOLDER', root.createFolder('الشهادات الصادرة').getId());
    props.setProperty('CLEARANCE_FOLDER', root.createFolder('المخالصات المالية').getId());
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
  // النطاق ← GitHub Pages ← نسخة GitHub الخام (تعمل دائماً حتى أثناء إصدار شهادة HTTPS للنطاق)
  for (const base of [siteUrl_(), String(setting_('PAGES_URL')).replace(/\/?$/, '/'), 'https://raw.githubusercontent.com/Wida3tk/Certi/main/']) {
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
      clearance: c.clearance === true,
      // تصنيف ما يراه المتدرب: short (الدورات القصيرة) | aba (تحليل السلوك التطبيقي) | obm (إدارة السلوك التنظيمي)، و label اسم مختصر داخل التصنيف
      category: ['aba', 'obm'].indexOf(c.category) >= 0 ? c.category : 'short', label: String(c.label || c.nameAr),
      // templates: [] صريحة = لا قالب بعد (يُقبل الطلب ويُؤجَّل الإصدار)؛ بلا الحقل = مجلد بنفس المعرّف
      templates: (Array.isArray(c.templates) ? c.templates : [{ dir: c.id, label: '' }])
        .filter(t => t && /^[a-z0-9-]+$/.test(String(t.dir))).map(t => ({ dir: String(t.dir), label: String(t.label || '') })) }));
  cache.put('courses', JSON.stringify(list), 600);
  return list;
}
function activeCourses_() {
  return courses_().filter(c => c.active).map(c => ({ id: c.id, nameAr: c.nameAr, name: c.name, type: c.type, minDays: c.minDays, clearance: c.clearance,
    category: c.category || 'short', label: c.label || c.nameAr }));
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
  log_(email, 'دخول اللوحة', '', '');
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
  const mine = rows_(TABS.REQ).filter(r => cleanEmail_(r['البريد']) === email && r['الحالة'] !== SUP.DRAFT);
  return {
    email: email,
    courses: activeCourses_(),
    survey: CONFIG.SURVEY,
    surveyComment: CONFIG.SURVEY_COMMENT,
    issueDays: CONFIG.ISSUE_DAYS, issueDaysPrograms: CONFIG.ISSUE_DAYS_PROGRAMS,
    requests: mine.map(r => ({
      id: r['رقم الطلب'], course: r['اسم الدورة'], date: String(r['تاريخ الطلب']).slice(0, 10),
      status: r['الحالة'], certNo: r['الحالة'] === ST.ISSUED ? r['رقم الشهادة'] : '',
      issued: r['تاريخ الإصدار'],
      note: r['الحالة'] === ST.REJECTED ? r['ملاحظات'] : '',
      clearance: clrState_(r), clearanceFile: !!r['ملف المخالصة'],
      nameEn: r['الاسم بالإنجليزي'], nameChange: r['تعديل الاسم'] || '', sup: r['معرّف الدورة'] === SUP.ID,
      nameChangeTo: (jsonOr_(r['بيانات تعديل الاسم'], {}) || {}).nameEn || '',
      nameChangeNote: r['تعديل الاسم'] === NC.REJECTED ? ((jsonOr_(r['بيانات تعديل الاسم'], {}) || {}).reason || '') : '',
    })).reverse(),
  };
}

const NAME_EN_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/;
const NAME_AR_RE = /^[؀-ۿ][؀-ۿ\s]{1,79}$/;
const clean_ = s => String(s || '').replace(/\s+/g, ' ').trim();
/** توحيد الاسم الإنجليزي: أول حرف من كل اسم كبير والباقي صغير (REEM AL-HARBI ← Reem Al-Harbi) — قاعدة سلوكيرا */
function titleName_(s) {
  return clean_(s).toLowerCase().replace(/(^|[\s\-'.])([a-z\u00E0-\u024F])/g, (m, p, c) => p + c.toUpperCase());
}

/** طلب شهادة لدورة أو أكثر في نموذج واحد. كل دورة = طلب مستقل يُراجَع ويُعتمد أو يُرفض وحده، وتجمعها «رقم المجموعة» */
const MAX_COURSES_PER_REQUEST = 15;
function submitRequest(token, d) {
  const email = who_(token);
  d = d || {};
  const nameEn = titleName_(d.nameEn), nameAr = clean_(d.nameAr), city = clean_(d.city);
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
  // شهادات التصنيفين (تحليل السلوك / إدارة السلوك التنظيمي): شهادة واحدة فقط في الطلب
  if (courses.length > 1 && courses.some(c => (c.category || 'short') !== 'short')) throw new Error('هذه الشهادة تُطلب وحدها. اختر شهادة واحدة في كل طلب.');
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
        'الحالة': ST.PENDING, 'المخالصة': c.clearance ? CLR.FINANCE : '',
      });
      if (c.clearance) notifyFinance_(id, nameAr, email, c.nameAr);
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
          '<p style="background:#EEF4FB;padding:12px 16px;border-radius:8px">' + (fresh.some(c => (c.category || 'short') !== 'short')
            ? 'تُصدر الشهادة بعد إصدار المخالصة المالية، خلال ' + CONFIG.ISSUE_DAYS_PROGRAMS + '، علماً بأن يومي الجمعة والسبت عطلة رسمية. عند جاهزية المخالصة يصلك بريد لمراجعتها وتوقيعها إلكترونياً. '
            : 'تُصدر الشهادة خلال ' + CONFIG.ISSUE_DAYS + '، علماً بأن يومي الجمعة والسبت عطلة رسمية. ') + (fresh.length > 1 ? 'تُراجَع كل شهادة على حدة، وتصلك كل واحدة فور اعتمادها' : 'ستصلك على بريدك هذا') +
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
    clearance: clrState_(r), clearanceData: jsonOr_(r['بيانات المخالصة'], null), clearanceSigned: r['تاريخ التوقيع'] || '',
    clearanceFile: !!r['ملف المخالصة'],
    // يمكن تحويل طلب البرنامج الطويل للمخالصة يدوياً (مثل OBM-P: بعض المتدربين فقط)
    nameChange: r['تعديل الاسم'] || '', nameChangeData: jsonOr_(r['بيانات تعديل الاسم'], null), sup: r['معرّف الدورة'] === SUP.ID,
    canStartClr: (!clrState_(r) || clrState_(r) === CLR.NONE) && [ST.PENDING, ST.HELD].indexOf(r['الحالة']) >= 0,
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
    const certNo = nextCertNo_(all);
    setCells_(TABS.REQ, r._row, { 'رقم الشهادة': certNo });
    SpreadsheetApp.flush();
    return { certNo: certNo, verifyUrl: verifyUrl_(certNo) };
  } finally { lock.releaseLock(); }
}

function nextCertNo_(all) {
  const pre = CONFIG.CERT_PREFIX + '-' + Utilities.formatDate(new Date(), tz_(), 'yyyy') + '-';
  const max = all.map(x => String(x['رقم الشهادة'] || ''))
    .filter(n => n.indexOf(pre) === 0).map(n => Number(n.slice(pre.length)) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return pre + ('00000' + (max + 1)).slice(-6);
}

/* ===================== شهادات الإشراف (إصدار مباشر بلا طلب) =====================
 * الفريق يدخل: النوع (حضور جلسة نقاش / تقديم دورة)، العنوان، التاريخ (يوم أو من–إلى)، الساعات، والمستلمين (الاسم + البريد).
 * لكل مستلم: adminSupReserve (سجل + رقم شهادة) ← التوليد في المتصفح بقالب sup-<النوع> ← adminSupSend (حفظ + إيميل الشهادة فقط).
 * لا تظهر للمتدربين كخيار طلب، ولا يُرسل «استلمنا طلبك». الشهادة تظهر للمستلم في «شهاداتي» ويتحقق منها برمز QR كغيرها. */
const SUP = { ID: 'supervision', DRAFT: 'قيد الإصدار', KINDS: { session: 'حضور جلسة نقاش', course: 'تقديم دورة' } };
function supHeld_(d) {
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const f = iso => { const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m[3] + ' ' + M[Number(m[2]) - 1] + ' ' + m[1]; };
  return (d.end && d.end !== d.start ? 'Held From ' + f(d.start) + ' to ' + f(d.end) : 'Held on ' + f(d.start)) + ' | ' + d.ceus + ' Learning CEUs';
}
function supCheck_(d) {
  d = d || {};
  const out = { kind: String(d.kind || ''), title: clean_(d.title), start: String(d.start || ''), end: String(d.end || ''), ceus: clean_(d.ceus) };
  if (!SUP.KINDS[out.kind]) throw new Error('اختاري نوع الشهادة.');
  if (!out.title || !/^[\x20-\x7E\u00C0-\u024F]{3,140}$/.test(out.title)) throw new Error('اكتبي عنوان الشهادة بالإنجليزية (كما يُطبع، حتى 140 حرفاً).');
  if (!isIsoDate_(out.start)) throw new Error('حددي التاريخ.');
  if (out.end && (!isIsoDate_(out.end) || out.end < out.start)) throw new Error('تاريخ النهاية قبل تاريخ البداية.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(out.ceus)) throw new Error('اكتبي عدد الساعات (Learning CEUs) رقماً، مثل 0.5.');
  out.held = supHeld_(out);
  return out;
}
/** إنشاء سجل شهادة إشراف وحجز رقمها (يعيد ما يلزم للتوليد في المتصفح) */
function adminSupReserve(token, d) {
  const by = admin_(token);
  const c = supCheck_(d);
  const nameEn = titleName_(d && d.nameEn), email = cleanEmail_(d && d.email);
  if (!NAME_EN_RE.test(nameEn)) throw new Error('اسم غير صالح: ' + (d && d.nameEn || '') + ' (يُكتب بالإنجليزية).');
  if (!isEmail_(email)) throw new Error('بريد غير صالح: ' + (d && d.email || ''));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const all = rows_(TABS.REQ);
    const certNo = nextCertNo_(all);
    const id = 'SUP-' + Utilities.formatDate(new Date(), tz_(), 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
    appendObj_(TABS.REQ, REQ_HEADERS.concat(['بيانات الإشراف', 'المصدر']), {
      'رقم الطلب': id, 'تاريخ الطلب': now_(), 'الاسم بالإنجليزي': safe_(nameEn, 80), 'الاسم بالعربي': safe_(clean_(d.nameAr), 80), 'البريد': email,
      'معرّف الدورة': SUP.ID, 'اسم الدورة': c.title, 'اسم الدورة (EN)': c.title, 'نوع البرنامج': 'شهادة إشراف — ' + SUP.KINDS[c.kind],
      'الحالة': SUP.DRAFT, 'تاريخ البدء': c.start, 'تاريخ الإتمام': c.end || c.start, 'القالب': 'sup-' + c.kind, 'رقم الشهادة': certNo,
      'اعتمدها': by, 'بيانات الإشراف': JSON.stringify(c), 'المصدر': 'إصدار مباشر (إشراف)',
    });
    SpreadsheetApp.flush();
    return { id: id, certNo: certNo, verifyUrl: verifyUrl_(certNo), template: 'sup-' + c.kind, nameEn: nameEn, title: c.title, held: c.held };
  } finally { lock.releaseLock(); }
}
/** إصدار مباشر لشهادة دورة/برنامج من الكتالوج (استثناء مؤقت لشهادات تحليل السلوك التطبيقي): بلا طلب ولا مخالصة ولا «استلمنا طلبك» */
function adminDirectReserve(token, d) {
  const by = admin_(token);
  d = d || {};
  const c = courseById_(d.courseId);
  if (!c || c.category !== 'aba') throw new Error('الإصدار المباشر متاح لشهادات تحليل السلوك التطبيقي فقط.');
  if (!c.templates.length) throw new Error('لا يوجد قالب لشهادة «' + c.nameAr + '» بعد.');
  const tpl = String(d.template || c.templates[0].dir);
  if (!c.templates.some(t => t.dir === tpl)) throw new Error('القالب المختار لا يخص هذه الشهادة.');
  if (!isIsoDate_(d.start) || !isIsoDate_(d.end)) throw new Error('حددي تاريخ البدء وتاريخ الإتمام.');
  if (d.start > d.end) throw new Error('تاريخ البدء بعد تاريخ الإتمام.');
  const nameEn = titleName_(d.nameEn), email = cleanEmail_(d.email);
  if (!NAME_EN_RE.test(nameEn)) throw new Error('اسم غير صالح: ' + (d.nameEn || '') + ' (يُكتب بالإنجليزية).');
  if (!isEmail_(email)) throw new Error('بريد غير صالح: ' + (d.email || ''));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const certNo = nextCertNo_(rows_(TABS.REQ));
    const id = 'DIR-' + Utilities.formatDate(new Date(), tz_(), 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
    appendObj_(TABS.REQ, REQ_HEADERS.concat(['المصدر']), {
      'رقم الطلب': id, 'تاريخ الطلب': now_(), 'الاسم بالإنجليزي': safe_(nameEn, 80), 'الاسم بالعربي': safe_(clean_(d.nameAr), 80), 'البريد': email,
      'معرّف الدورة': c.id, 'اسم الدورة': c.nameAr, 'اسم الدورة (EN)': c.name, 'نوع البرنامج': TYPE_LABEL[c.type],
      'الحالة': SUP.DRAFT, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end, 'القالب': tpl, 'رقم الشهادة': certNo, 'اعتمدها': by,
      'المخالصة': CLR.NONE, 'المصدر': 'إصدار مباشر (استثناء)',
    });
    SpreadsheetApp.flush();
    return { id: id, certNo: certNo, verifyUrl: verifyUrl_(certNo), template: tpl, nameEn: nameEn, course: c.nameAr, start: d.start, end: d.end };
  } finally { lock.releaseLock(); }
}
/** حفظ شهادة الإشراف (أو الإصدار المباشر) المولّدة وإرسالها للمستلم */
function adminSupSend(token, d) {
  const by = admin_(token);
  d = d || {};
  const r = findReq_(d.id);
  if (r['الحالة'] !== SUP.DRAFT) throw new Error('هذه الشهادة ليست قيد الإصدار.');
  const isSup = r['معرّف الدورة'] === SUP.ID;
  if (r['رقم الشهادة'] !== d.certNo) throw new Error('رقم الشهادة غير مطابق.');
  const fileName = (d.certNo + ' - ' + r['الاسم بالإنجليزي'] + ' - ' + r['اسم الدورة (EN)']).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').slice(0, 150).trim() + '.pdf';
  const blob = Utilities.newBlob(Utilities.base64Decode(String(d.pdf || '')), 'application/pdf', fileName);
  if (blob.getBytes().slice(0, 4).map(b => String.fromCharCode(b)).join('') !== '%PDF') throw new Error('ملف الشهادة غير صالح.');
  const file = DriveApp.getFolderById(prop_('CERTS_FOLDER')).createFile(blob);
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.ISSUED, 'ملف الشهادة': file.getId(), 'تاريخ الإصدار': now_(), 'اعتمدها': by });
  if (!isSup) {
    sendCertEmail_(cleanEmail_(r['البريد']), r, d.certNo, blob, false);
    log_(by, 'إصدار مباشر', r['رقم الطلب'], d.certNo + ' — ' + r['اسم الدورة'] + ' — ' + r['الاسم بالإنجليزي']);
    return 'صدرت ' + d.certNo + ' وأُرسلت إلى ' + r['البريد'];
  }
  const c = jsonOr_(r['بيانات الإشراف'], {});
  sendCertEmail_(cleanEmail_(r['البريد']), r, d.certNo, blob, false, '', {
    lead: c.kind === 'course' ? 'نشكرك على تقديمك، وهذه شهادتك عن:' : 'نشكرك على حضورك، وهذه شهادتك عن:',
    dateRow: ['التاريخ', c.held ? c.held.split(' | ')[0].replace(/^Held (on|From) /, '').replace(' to ', ' – ') : ''],
    extraRows: [['الساعات', (c.ceus || '') + ' Learning CEUs']], noDateNote: true });
  log_(by, 'إصدار شهادة إشراف', r['رقم الطلب'], d.certNo + ' — ' + r['اسم الدورة'] + ' — ' + r['الاسم بالإنجليزي']);
  return 'صدرت ' + d.certNo + ' وأُرسلت إلى ' + r['البريد'];
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
  if (r['معرّف الدورة'] === SUP.ID) throw new Error('شهادات الإشراف تُصدر من تبويب «شهادات الإشراف».');
  const course = courseById_(r['معرّف الدورة']);
  if (course && course.minDays && daysInclusive_(d.start, d.end) < course.minDays)
    throw new Error('مدة الإتمام ' + daysInclusive_(d.start, d.end) + ' أيام، وهذه الشهادة تشترط ' + course.minDays + ' أيام على الأقل. لا يمكن إصدارها.');
  const tpls = course ? course.templates : [{ dir: String(r['معرّف الدورة']), label: '' }];
  if (!tpls.length) throw new Error('لا يوجد قالب لهذه الشهادة بعد. يُصدر بعد إضافة القالب.');
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
  const nc = d.nameChange && !d.test ? String(d.nameChange) : '';
  if (nc) {
    if (r['تعديل الاسم'] !== NC.PAY) throw new Error('لا يوجد طلب تعديل اسم بانتظار السداد على هذه الشهادة.');
    if (['paid', 'waived'].indexOf(nc) < 0) throw new Error('حددي: تم السداد أو إعفاء من الرسوم.');
    if (r['الحالة'] !== ST.ISSUED) throw new Error('تعديل الاسم للشهادات الصادرة فقط.');
  }
  if (d.test) {
    sendCertEmail_(cleanEmail_(by), view, d.certNo, blob, true);
    return 'تم إرسال نسخة تجريبية إلى ' + by + ' (لم تتغير حالة الطلب).';
  }

  const file = DriveApp.getFolderById(prop_('CERTS_FOLDER')).createFile(blob);
  if (r['ملف الشهادة']) { try { DriveApp.getFileById(r['ملف الشهادة']).setTrashed(true); } catch (e) { } }
  const hold = clrHolds_(r);
  if (hold) {
    setCells_(TABS.REQ, r._row, {
      'الحالة': ST.HELD, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end,
      'ملف الشهادة': file.getId(), 'اعتمدها': by, 'القالب': tpl, 'الاسم بالإنجليزي': safe_(nameEn, 80), 'المخالصة': clrState_(r),
    });
    log_(by, 'اعتماد بانتظار المخالصة', r['رقم الطلب'], d.certNo + ' — ' + r['اسم الدورة']);
    return 'اعتُمدت الشهادة ' + d.certNo + ' وحُفظت. ستُرسل للمتدرب تلقائياً فور توقيعه المخالصة المالية (حالتها الآن: ' + clrState_(r) + ').';
  }
  setCells_(TABS.REQ, r._row, {
    'الحالة': ST.ISSUED, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end,
    'ملف الشهادة': file.getId(), 'تاريخ الإصدار': now_(), 'اعتمدها': by, 'القالب': tpl,
    'الاسم بالإنجليزي': safe_(nameEn, 80),
  });
  if (nc) {
    const ncd = jsonOr_(r['بيانات تعديل الاسم'], {}) || {};
    Object.assign(ncd, { outcome: nc, by: by, doneAt: now_(), finalNameEn: nameEn });
    setCells_(TABS.REQ, r._row, { 'تعديل الاسم': NC.DONE, 'بيانات تعديل الاسم': JSON.stringify(ncd) });
    sendCertEmail_(cleanEmail_(r['البريد']), view, d.certNo, blob, false,
      'تم تعديل الاسم على شهادتك بناءً على طلبك، وهذه الشهادة المحدّثة بنفس رقمها. النسخة السابقة لم تعد معتمدة.');
    log_(by, 'تعديل الاسم وإعادة الإصدار', r['رقم الطلب'], d.certNo + ': ' + (ncd.oldNameEn || r['الاسم بالإنجليزي']) + ' ← ' + nameEn + (nc === 'waived' ? ' (إعفاء من الرسوم)' : ' (تم السداد)'));
    return 'عُدّل الاسم وأُعيد إصدار الشهادة ' + d.certNo + ' وأُرسلت إلى ' + r['البريد'];
  }
  sendCertEmail_(cleanEmail_(r['البريد']), view, d.certNo, blob, false);
  log_(by, r['الحالة'] === ST.ISSUED ? 'إعادة إصدار' : 'إصدار', r['رقم الطلب'], d.certNo + ' — ' + r['اسم الدورة']);
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
  log_(by, 'رفض', r['رقم الطلب'], r['اسم الدورة'] + ' — ' + safe_(reason, 200));
  return 'تم الرفض وإبلاغ المتدرب.';
}

function adminRevoke(token, id, reason) {
  const by = admin_(token);
  const r = findReq_(id);
  if (r['الحالة'] !== ST.ISSUED) throw new Error('الإلغاء للشهادات الصادرة فقط.');
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.REVOKED, 'ملاحظات': safe_(reason, 1000), 'اعتمدها': by });
  log_(by, 'إلغاء شهادة', r['رقم الطلب'], r['رقم الشهادة'] + ' — ' + safe_(reason, 200));
  return 'أُلغيت الشهادة ' + r['رقم الشهادة'] + '. صفحة التحقق ستظهرها ملغاة.';
}


/* ===================== سجل النشاط ===================== */
/** يسجّل إجراءات الفريق المهمة في تبويب «السجل». لا يوقف العملية إن فشل */
function log_(by, action, id, detail) {
  try {
    if (!sheet_(TABS.LOG)) { ensureTab_(ss_(), TABS.LOG, LOG_HEADERS, ['التاريخ']); delete MEMO_.sheets[TABS.LOG]; }
    appendObj_(TABS.LOG, LOG_HEADERS, { 'التاريخ': now_(), 'بواسطة': by || '', 'الإجراء': action, 'رقم الطلب': id || '', 'تفاصيل': safe_(String(detail || ''), 300) });
  } catch (e) { console.error('log: ' + e); }
}

/* ===================== تعديل الاسم بعد الإصدار (برسوم) =====================
 * المتدرب يطلب من «شهاداتي» ← «بانتظار تأكيد السداد» (إيميل للمحاسب) ← المحاسب في تبويب «تعديل الاسم»:
 * «تم السداد» أو «إعفاء من الرسوم» ← تُولَّد الشهادة بالاسم الجديد في متصفحه وتُعاد بنفس الرقم (adminApprove مع nameChange)،
 * أو «رفض» بسبب يصل للمتدرب. صفحة التحقق تعرض الاسم الجديد تلقائياً. */
function requestNameChange(token, id, d) {
  const email = who_(token);
  d = d || {};
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = myReq_(token, id);
    if (r['الحالة'] !== ST.ISSUED) throw new Error('تعديل الاسم متاح للشهادات الصادرة فقط.');
    if (r['معرّف الدورة'] === SUP.ID) throw new Error('لتعديل الاسم على شهادة الإشراف تواصل معنا على care@sulukera.com.');
    if (r['تعديل الاسم'] === NC.PAY) throw new Error('لديك طلب تعديل اسم قيد المعالجة لهذه الشهادة.');
    const nameEn = titleName_(d.nameEn);
    if (!NAME_EN_RE.test(nameEn) || nameEn.split(' ').length < 2) throw new Error('اكتب الاسم الجديد بالإنجليزية (اسمان على الأقل، حروف إنجليزية فقط).');
    if (nameEn === titleName_(r['الاسم بالإنجليزي'])) throw new Error('الاسم الجديد مطابق للاسم الحالي على الشهادة.');
    const reason = safe_(clean_(d.reason), 300);
    if (!reason) throw new Error('اكتب سبب التعديل باختصار (مثل: خطأ إملائي في الاسم).');
    const data = { nameEn: nameEn, oldNameEn: r['الاسم بالإنجليزي'], reason: reason, at: now_() };
    setCells_(TABS.REQ, r._row, { 'تعديل الاسم': NC.PAY, 'بيانات تعديل الاسم': JSON.stringify(data) });
    log_(email, 'طلب تعديل اسم (المتدرب)', r['رقم الطلب'], r['الاسم بالإنجليزي'] + ' ← ' + nameEn);
    const who = r['الاسم بالعربي'] || r['الاسم بالإنجليزي'];
    try {
      sendMail_({ to: setting_('FINANCE'), subject: 'طلب تعديل اسم (برسوم) | ' + who + ' | ' + r['اسم الدورة'],
        htmlBody: shell_('طلب تعديل اسم على شهادة',
          '<p><b>' + esc_(who) + '</b> (<span dir="ltr">' + esc_(r['البريد']) + '</span>' + (r['الجوال'] ? '، <span dir="ltr">' + esc_(String(r['الجوال']).replace(/^'/, '')) + '</span>' : '') + ') يطلب تعديل الاسم على شهادة <b>' + esc_(r['اسم الدورة']) + '</b>:</p>' +
          '<p dir="ltr" style="text-align:right">' + esc_(r['الاسم بالإنجليزي']) + ' ← <b>' + esc_(nameEn) + '</b></p><p>السبب: ' + esc_(reason) + '</p>' +
          '<p>بعد التواصل معه وتأكيد سداد الرسوم اختر «تم السداد» من لوحة الإدارة، فتُعاد الشهادة بالاسم الجديد تلقائياً.</p>' +
          '<p><a href="' + appUrl_() + 'admin.html" style="display:inline-block;background:' + CONFIG.COLOR_PRIMARY + ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">فتح لوحة الإدارة ← تعديل الاسم</a></p>') });
      sendMail_({ to: r['البريد'], subject: 'استلمنا طلب تعديل الاسم | ' + r['اسم الدورة'],
        htmlBody: shell_('استلمنا طلب تعديل الاسم',
          '<p>مرحباً ' + esc_(who) + '،</p><p>استلمنا طلبك لتعديل الاسم على شهادة <b>' + esc_(r['اسم الدورة']) + '</b> إلى:</p>' +
          '<p dir="ltr" style="text-align:right;font-size:17px"><b>' + esc_(nameEn) + '</b></p>' +
          '<p>تعديل الاسم بعد الإصدار يترتب عليه رسوم، وسيتواصل معك فريق المالية لإتمام السداد. بعد التأكيد تصلك الشهادة المحدّثة بنفس رقمها.</p>') });
    } catch (e) { console.error('name change mail: ' + e); }
    return { ok: true, requests: getMyData(token).requests };
  } finally { lock.releaseLock(); }
}
/** رفض طلب تعديل الاسم (أو إلغاؤه) مع سبب يصل للمتدرب. القبول يتم عبر adminApprove بعد توليد الشهادة الجديدة */
function adminNameChangeReject(token, id, reason) {
  const by = admin_(token);
  const r = findReq_(id);
  if (r['تعديل الاسم'] !== NC.PAY) throw new Error('لا يوجد طلب تعديل اسم قائم على هذه الشهادة.');
  reason = safe_(clean_(reason), 500);
  if (!reason) throw new Error('اكتبي سبب الرفض ليصل للمتدرب.');
  const d = jsonOr_(r['بيانات تعديل الاسم'], {}) || {};
  Object.assign(d, { outcome: 'rejected', reason: reason, by: by, doneAt: now_() });
  setCells_(TABS.REQ, r._row, { 'تعديل الاسم': NC.REJECTED, 'بيانات تعديل الاسم': JSON.stringify(d) });
  log_(by, 'رفض تعديل اسم', r['رقم الطلب'], reason);
  sendMail_({ to: r['البريد'], subject: 'بخصوص طلب تعديل الاسم | ' + r['اسم الدورة'],
    htmlBody: shell_('بخصوص طلب تعديل الاسم', '<p>مرحباً ' + esc_(r['الاسم بالعربي'] || r['الاسم بالإنجليزي']) + '،</p>' +
      '<p>لم نتمكن من إتمام طلب تعديل الاسم على شهادة <b>' + esc_(r['اسم الدورة']) + '</b> للسبب التالي:</p>' +
      '<p style="background:#FFF4E5;padding:12px 16px;border-radius:8px">' + esc_(reason) + '</p><p>شهادتك الحالية ما زالت صالحة. للاستفسار يمكنك الرد على هذه الرسالة.</p>') });
  return 'رُفض طلب تعديل الاسم وأُبلغ المتدرب.';
}

/* ===================== لوحة المتابعة ===================== */
function ymd_(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
/** أيام العمل بين تاريخين (الجمعة والسبت عطلة). يوم الطلب نفسه لا يُحسب */
function workDays_(a, b) {
  if (a == null || b == null || b < a) return null;
  let n = 0;
  for (let t = a + 864e5; t <= b; t += 864e5) { const w = new Date(t).getUTCDay(); if (w !== 5 && w !== 6) n++; }
  return n;
}
function adminStats(token) {
  admin_(token);
  const all = rows_(TABS.REQ);
  const today = ymd_(Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'));
  const month = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM');
  const prevMonth = (() => { const d = new Date(today); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); })();
  const byStatus = {}; Object.keys(ST).forEach(k => byStatus[ST[k]] = 0);
  let newToday = 0, new7 = 0, newMonth = 0, issuedMonth = 0, issuedPrev = 0, issuedTotal = 0;
  const durations = [], overdue = [], courses = {}, reviewers = {};
  const weeks = []; for (let i = 7; i >= 0; i--) weeks.push({ start: today - (i * 7 + 6) * 864e5, end: today - i * 7 * 864e5, req: 0, issued: 0 });
  all.forEach(r => {
    const st = r['الحالة']; byStatus[st] = (byStatus[st] || 0) + 1;
    const rd = ymd_(r['تاريخ الطلب']), idt = ymd_(r['تاريخ الإصدار']);
    if (rd === today) newToday++;
    if (rd != null && rd > today - 7 * 864e5) new7++;
    if (String(r['تاريخ الطلب']).slice(0, 7) === month) newMonth++;
    const c = courses[r['اسم الدورة']] = courses[r['اسم الدورة']] || { name: r['اسم الدورة'], req: 0, issued: 0 };
    c.req++;
    weeks.forEach(w => { if (rd != null && rd >= w.start && rd <= w.end) w.req++; if (st === ST.ISSUED && idt != null && idt >= w.start && idt <= w.end) w.issued++; });
    if (st === ST.ISSUED || st === ST.REVOKED) {
      issuedTotal++; c.issued++;
      const im = String(r['تاريخ الإصدار']).slice(0, 7);
      if (im === month) { issuedMonth++; const who = r['اعتمدها'] || '—'; reviewers[who] = (reviewers[who] || 0) + 1; }
      if (im === prevMonth) issuedPrev++;
      const wd = workDays_(rd, idt);
      if (wd != null && idt > today - 90 * 864e5) durations.push(wd);
    }
    if (st === ST.PENDING) {
      const age = workDays_(rd, today);
      if (age != null && age > 3) overdue.push({ id: r['رقم الطلب'], name: r['الاسم بالعربي'] || r['الاسم بالإنجليزي'], course: r['اسم الدورة'], date: String(r['تاريخ الطلب']).slice(0, 10), age: age, clearance: clrState_(r) });
    }
  });
  durations.sort((a, b) => a - b);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10 : null;
  // الرضا
  let survey = { count: 0, questions: [], avg5: null, nps: null };
  try {
    const sv = rows_(TABS.SURVEY);
    const qs = CONFIG.SURVEY.map(q => {
      const v = sv.map(x => Number(x[q.q])).filter(n => n >= 1 && n <= q.max);
      return { q: q.q, section: q.section, max: q.max, n: v.length, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : null, vals: v };
    });
    const five = qs.filter(q => q.max === 5 && q.avg != null);
    const rec = qs.filter(q => q.max === 10)[0];
    survey = {
      count: sv.length,
      questions: qs.map(q => ({ q: q.q, section: q.section, max: q.max, n: q.n, avg: q.avg })),
      avg5: five.length ? Math.round(five.reduce((a, q) => a + q.avg, 0) / five.length * 100) / 100 : null,
      // صافي نقاط الترويج على مقياس 1–10: المروّجون 9–10، والمنتقدون 6 فأقل
      nps: rec && rec.vals.length ? Math.round((rec.vals.filter(v => v >= 9).length - rec.vals.filter(v => v <= 6).length) / rec.vals.length * 100) : null,
    };
  } catch (e) { console.error('stats survey: ' + e); }
  let activity = [];
  try { if (sheet_(TABS.LOG)) activity = rows_(TABS.LOG).slice(-40).reverse().map(x => ({ at: x['التاريخ'], by: x['بواسطة'], action: x['الإجراء'], id: x['رقم الطلب'], detail: x['تفاصيل'] })); }
  catch (e) { console.error('stats log: ' + e); }
  return {
    generated: now_(), total: all.length, byStatus: byStatus,
    clearancePending: all.filter(r => clrHolds_(r) && [ST.REJECTED, ST.REVOKED].indexOf(r['الحالة']) < 0).length,
    nameChangePending: all.filter(r => r['تعديل الاسم'] === NC.PAY).length,
    newToday: newToday, new7: new7, newMonth: newMonth,
    issuedMonth: issuedMonth, issuedPrev: issuedPrev, issuedTotal: issuedTotal,
    avgDays: avg, medianDays: durations.length ? durations[Math.floor(durations.length / 2)] : null,
    within3: durations.length ? Math.round(durations.filter(x => x <= 3).length / durations.length * 100) : null, sample: durations.length,
    overdue: overdue.sort((a, b) => b.age - a.age).slice(0, 25), overdueCount: overdue.length,
    courses: Object.keys(courses).map(k => courses[k]).sort((a, b) => b.req - a.req).slice(0, 10),
    reviewers: Object.keys(reviewers).map(k => ({ by: k, n: reviewers[k] })).sort((a, b) => b.n - a.n),
    weeks: weeks.map(w => ({ start: new Date(w.start).toISOString().slice(0, 10), end: new Date(w.end).toISOString().slice(0, 10), req: w.req, issued: w.issued })),
    survey: survey, activity: activity,
  };
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
        nameEn: titleName_(r[col.nameEn]), platform: col.platform >= 0 ? cleanEmail_(r[col.platform]) : '',
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
        'نوع البرنامج': TYPE_LABEL[x.course.type], 'الحالة': ST.PENDING, 'المخالصة': x.course.clearance ? CLR.FINANCE : '',
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
    if (n) log_(by, 'استيراد من الفورم', '', 'عدد الطلبات: ' + n);
    return 'عدد الطلبات المستوردة: ' + n + '، وصارت «بانتظار المراجعة».' + (f.rows.filter(x => !x.course).length ? ' بقيت ردود لدورات غير مفعّلة أو غير معروفة؛ تُستورد عند تفعيلها بإعادة الاستيراد.' : '');
  } finally { lock.releaseLock(); }
}

/* ===================== المخالصة المالية (البرامج الطويلة) =====================
 * المسار: طلب ← «بانتظار المالية» (إشعار للمحاسب) ← المحاسب: «لا يوجد مبلغ» أو «يوجد مبلغ → تم السداد» مع بيانات المخالصة
 * ← «بانتظار التوقيع» (إيميل للمتدرب) ← المتدرب يراجع ويقرّ ويرسم توقيعه في «شهاداتي» ← PDF موقّع من قالب Google Docs + سجل التوقيع
 * ← «موقّعة» (نسخة للمتدرب والمالية) ← إن كانت الشهادة معتمدة («معتمدة بانتظار المخالصة») تُرسل تلقائياً. */
const CLEARANCE_TEXT = [
  'أنا الموقع أدناه، أقر وأؤكد بأنني قد قمت بسداد جميع الأقساط المستحقة للخدمة/ المنتج المذكور أعلاه، والتي كانت بذمتي لدى منصة رشد (سلوكيرا).',
  'وبموجب هذا الإقرار، أصرح بأنني قد استلمت جميع المستندات والوثائق المتعلقة بهذه الخدمة/المنتج، وأنني أعفي المنصة من أي التزامات أو مطالبات مستقبلية تتعلق بهذا الأمر.',
  'وعليه، فإنني أقر بإنهاء جميع الالتزامات والمطالبات بيني وبين المنصة فيما يتعلق بهذه الخدمة/المنتج.',
];
function jsonOr_(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }
/** حالة المخالصة: المسجلة، أو «بانتظار المالية» لطلب قائم لبرنامج فُعّلت مخالصته بعد تقديم الطلب (ما لم يكن صادراً) */
function clrState_(r) {
  if (r['المخالصة']) return r['المخالصة'];
  const c = courseById_(r['معرّف الدورة']);
  return c && c.clearance && [ST.PENDING, ST.HELD].indexOf(r['الحالة']) >= 0 ? CLR.FINANCE : '';
}
/** المخالصة تمنع إرسال الشهادة ما لم تكن موقّعة أو «لا تحتاج مخالصة» */
function clrHolds_(r) { const s = clrState_(r); return !!s && s !== CLR.SIGNED && s !== CLR.NONE; }
/** إرسال شهادة معتمدة كانت محفوظة بانتظار المخالصة */
function releaseHeld_(r) {
  if (r['الحالة'] !== ST.HELD || !r['ملف الشهادة']) return false;
  const f = DriveApp.getFileById(r['ملف الشهادة']);
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.ISSUED, 'تاريخ الإصدار': now_() });
  sendCertEmail_(cleanEmail_(r['البريد']), Object.assign({}, r), r['رقم الشهادة'], f.getBlob().setName(f.getName()), false);
  return true;
}
/** تحويل طلب للمخالصة يدوياً (برامج تحتاجها لبعض المتدربين فقط، مثل OBM-P) */
function adminClearanceStart(token, id) {
  const by = admin_(token);
  const r = findReq_(id);
  if ([ST.PENDING, ST.HELD].indexOf(r['الحالة']) < 0) throw new Error('لا يمكن تحويل طلب حالته «' + r['الحالة'] + '» للمخالصة.');
  const s = clrState_(r);
  if (s && s !== CLR.NONE) throw new Error('الطلب في مسار المخالصة مسبقاً (' + s + ').');
  setCells_(TABS.REQ, r._row, { 'المخالصة': CLR.FINANCE });
  log_(by, 'تحويل للمخالصة', r['رقم الطلب'], r['اسم الدورة']);
  notifyFinance_(r['رقم الطلب'], r['الاسم بالعربي'] || r['الاسم بالإنجليزي'], r['البريد'], r['اسم الدورة']);
  return 'حُوّل الطلب للمخالصة المالية، وأُبلغ المحاسب. لن تُرسل الشهادة للمتدرب إلا بعد توقيعه المخالصة (أو اختيار «لا يحتاج مخالصة»).';
}
function notifyFinance_(id, nameAr, email, course) {
  try {
    sendMail_({
      to: setting_('FINANCE'),
      subject: 'طلب مخالصة مالية جديد | ' + course,
      htmlBody: shell_('طلب مخالصة مالية',
        '<p>وصل طلب شهادة لبرنامج يحتاج مخالصة مالية:</p>' +
        '<p><b>' + esc_(nameAr) + '</b> — <span dir="ltr">' + esc_(email) + '</span><br>البرنامج: <b>' + esc_(course) + '</b><br>رقم الطلب: <span dir="ltr">' + id + '</span></p>' +
        '<p><a href="' + appUrl_() + 'admin.html" style="display:inline-block;background:' + CONFIG.COLOR_PRIMARY + ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">فتح لوحة الإدارة ← المخالصات</a></p>'),
    });
  } catch (e) { console.error('finance mail: ' + e); }
}
function clearanceData_(r) {
  const d = jsonOr_(r['بيانات المخالصة'], {});
  return {
    name: r['الاسم بالعربي'] || r['الاسم بالإنجليزي'], nameEn: r['الاسم بالإنجليزي'], phone: String(r['الجوال'] || '').replace(/^'/, ''), email: r['البريد'],
    program: d.program || r['اسم الدورة'], hours: d.hours || '', total: d.total || '', start: d.start || '', clearDate: d.clearDate || '',
    docId: d.docId || '', issuedAt: d.issuedAt || '',
  };
}
/** المحاسب يكمل بيانات المخالصة: outcome = nodue (لا يوجد مبلغ) | due (يوجد مبلغ — بانتظار السداد) | paid (تم السداد) */
function adminClearance(token, id, d) {
  const by = admin_(token);
  d = d || {};
  const r = findReq_(id);
  if (!clrState_(r)) throw new Error('هذا الطلب لا يحتاج مخالصة مالية.');
  if (clrState_(r) === CLR.SIGNED) throw new Error('المخالصة موقّعة مسبقاً.');
  if (clrState_(r) === CLR.NONE) throw new Error('سُجّل أن هذا الطلب لا يحتاج مخالصة.');
  if ([ST.REJECTED, ST.REVOKED].indexOf(r['الحالة']) >= 0) throw new Error('الطلب ' + r['الحالة'] + '.');
  if (d.outcome === 'none') { // مثل متدرب دفع المبلغ كاملاً من البداية
    const old0 = jsonOr_(r['بيانات المخالصة'], {});
    log_(by, 'مخالصة: لا يحتاج', r['رقم الطلب'], r['اسم الدورة']);
    setCells_(TABS.REQ, r._row, { 'المخالصة': CLR.NONE, 'بيانات المخالصة': JSON.stringify(Object.assign(old0, { outcome: 'none', by: by, at: now_() })) });
    if (releaseHeld_(r)) return 'سُجّل «لا يحتاج مخالصة»، وأُرسلت الشهادة المعتمدة للمتدرب.';
    return 'سُجّل «لا يحتاج مخالصة». تُرسل الشهادة مباشرة عند اعتمادها.';
  }
  const old = jsonOr_(r['بيانات المخالصة'], {});
  const data = Object.assign(old, {
    program: safe_(clean_(d.program) || old.program || r['اسم الدورة'], 120), hours: safe_(clean_(d.hours), 40),
    total: safe_(clean_(d.total), 40), start: isIsoDate_(d.start) ? d.start : (old.start || ''), clearDate: isIsoDate_(d.clearDate) ? d.clearDate : (old.clearDate || ''),
    by: by, at: now_(),
  });
  if (d.outcome === 'due') {
    setCells_(TABS.REQ, r._row, { 'المخالصة': CLR.DUE, 'بيانات المخالصة': JSON.stringify(data) });
    log_(by, 'مخالصة: يوجد مبلغ', r['رقم الطلب'], r['اسم الدورة']);
    return 'سُجّل «يوجد مبلغ مستحق». بعد التواصل مع المتدرب والسداد اختاري «تم السداد» لإصدار المخالصة للتوقيع.';
  }
  if (['nodue', 'paid'].indexOf(d.outcome) < 0) throw new Error('اختاري نتيجة المخالصة.');
  if (!data.program || !data.hours || !data.total || !data.start || !data.clearDate) throw new Error('أكملي بيانات المخالصة: البرنامج، عدد المواد، الإجمالي، تاريخ البدء، تاريخ الإخلاء.');
  data.outcome = d.outcome;
  data.docId = data.docId || ('CLR-' + Utilities.formatDate(new Date(), tz_(), 'yyyy') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase());
  data.issuedAt = now_();
  const log = jsonOr_(r['سجل التوقيع'], []);
  log.push({ e: 'created', at: now_(), by: by });
  setCells_(TABS.REQ, r._row, { 'المخالصة': CLR.SIGN, 'بيانات المخالصة': JSON.stringify(data), 'سجل التوقيع': JSON.stringify(log) });
  sendMail_({
    to: r['البريد'],
    subject: 'المخالصة المالية جاهزة للتوقيع | ' + data.program,
    htmlBody: shell_('مخالصتك جاهزة للتوقيع',
      '<p>مرحباً ' + esc_(r['الاسم بالعربي'] || r['الاسم بالإنجليزي']) + '،</p>' +
      '<p>أعددنا لك المخالصة المالية الخاصة ببرنامج <b>' + esc_(data.program) + '</b>. يُرجى مراجعتها وتوقيعها إلكترونياً لاستكمال إصدار شهادتك.</p>' +
      '<p><a href="' + appUrl_() + '" style="display:inline-block;background:' + CONFIG.COLOR_PRIMARY + ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">مراجعة المخالصة وتوقيعها</a></p>' +
      '<p style="color:#666;font-size:13px">ادخل ببريدك هذا، ثم افتح «شهاداتي» واضغط «مراجعة وتوقيع المخالصة». تُرسل الشهادة إليك تلقائياً بعد التوقيع واعتمادها.</p>'),
  });
  log.push({ e: 'sent', at: now_(), to: r['البريد'] });
  log_(by, d.outcome === 'paid' ? 'مخالصة: تم السداد' : 'مخالصة: لا يوجد مبلغ', r['رقم الطلب'], data.docId);
  setCells_(TABS.REQ, r._row, { 'سجل التوقيع': JSON.stringify(log) });
  return 'أُصدرت المخالصة (' + data.docId + ') وأُرسلت للمتدرب لتوقيعها.';
}
/** إعادة إرسال رابط التوقيع */
function adminClearanceResend(token, id) {
  admin_(token);
  const r = findReq_(id);
  if (r['المخالصة'] !== CLR.SIGN) throw new Error('المخالصة ليست بانتظار التوقيع.');
  const d = clearanceData_(r);
  sendMail_({ to: r['البريد'], subject: 'تذكير: المخالصة المالية بانتظار توقيعك | ' + d.program,
    htmlBody: shell_('تذكير بتوقيع المخالصة', '<p>مرحباً ' + esc_(d.name) + '،</p><p>المخالصة المالية لبرنامج <b>' + esc_(d.program) +
      '</b> ما زالت بانتظار توقيعك.</p><p><a href="' + appUrl_() + '" style="display:inline-block;background:' + CONFIG.COLOR_PRIMARY +
      ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">مراجعة المخالصة وتوقيعها</a></p>') });
  return 'أُعيد إرسال رابط التوقيع إلى ' + r['البريد'];
}
function myReq_(token, id) {
  const email = who_(token);
  const r = findReq_(id);
  if (cleanEmail_(r['البريد']) !== email) throw new Error('الطلب غير موجود.');
  return r;
}
/** المتدرب يفتح المخالصة للمراجعة (يُسجَّل الاطلاع) */
function clearanceView(token, id) {
  const r = myReq_(token, id);
  if ([CLR.SIGN, CLR.SIGNED].indexOf(r['المخالصة']) < 0) throw new Error('المخالصة غير جاهزة بعد.');
  if (r['المخالصة'] === CLR.SIGN) {
    const log = jsonOr_(r['سجل التوقيع'], []);
    if (!log.some(x => x.e === 'viewed')) { log.push({ e: 'viewed', at: now_() }); setCells_(TABS.REQ, r._row, { 'سجل التوقيع': JSON.stringify(log) }); }
  }
  return Object.assign(clearanceData_(r), { status: r['المخالصة'], text: CLEARANCE_TEXT, signedAt: r['تاريخ التوقيع'] || '' });
}
/** التوقيع: إقرار + صورة توقيع مرسومة (PNG). يُنشأ PDF موقّع من قالب Google Docs ويُحفظ ويُرسل، وتُطلق الشهادة المعلّقة */
function clearanceSign(token, id, d) {
  const email = who_(token);
  d = d || {};
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const r = myReq_(token, id);
    if (r['المخالصة'] !== CLR.SIGN) throw new Error(r['المخالصة'] === CLR.SIGNED ? 'المخالصة موقّعة مسبقاً.' : 'المخالصة غير جاهزة للتوقيع.');
    if (d.agree !== true) throw new Error('يجب الإقرار بالاطلاع على المخالصة والموافقة على ما ورد فيها.');
    const m = String(d.signature || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('ارسم توقيعك في المربع.');
    const sigBytes = Utilities.base64Decode(m[1]);
    if (sigBytes.length < 800 || sigBytes.length > 400000) throw new Error('التوقيع غير واضح. ارسمه مرة أخرى.');
    const data = clearanceData_(r);
    const log = jsonOr_(r['سجل التوقيع'], []);
    const signedAt = now_();
    log.push({ e: 'signed', at: signedAt, by: email, ua: safe_(String(d.ua || ''), 200) });
    let pdf;
    try { pdf = buildClearancePdf_(data, Utilities.newBlob(sigBytes, 'image/png', 'signature.png'), log, signedAt); }
    catch (e) {
      console.error('clearance pdf: ' + e);
      throw new Error('تعذّر حفظ المخالصة الآن بسبب خلل فني لدينا، ولم يُحفظ توقيعك. أبلغنا الفريق، ويُرجى المحاولة لاحقاً.');
    }
    const file = DriveApp.getFolderById(clearanceFolder_()).createFile(pdf);
    setCells_(TABS.REQ, r._row, { 'المخالصة': CLR.SIGNED, 'ملف المخالصة': file.getId(), 'تاريخ التوقيع': signedAt, 'سجل التوقيع': JSON.stringify(log) });
    const copy = pdf.copyBlob().setName(pdf.getName());
    try {
      sendMail_({ to: email, subject: 'نسخة من مخالصتك المالية الموقّعة | ' + data.program, attachments: [copy],
        htmlBody: shell_('تم توقيع المخالصة', '<p>مرحباً ' + esc_(data.name) + '،</p><p>شكراً لك، تم توقيع المخالصة المالية لبرنامج <b>' + esc_(data.program) +
          '</b>، ونرفق لك نسخة منها.</p><p>' + (r['الحالة'] === ST.HELD ? 'شهادتك معتمدة، وستصلك في رسالة مستقلة الآن.' : 'ستصلك شهادتك بعد اعتمادها.') + '</p>') });
      sendMail_({ to: setting_('FINANCE'), subject: 'تم توقيع مخالصة | ' + data.name + ' | ' + data.program, attachments: [pdf],
        htmlBody: shell_('تم توقيع مخالصة', '<p><b>' + esc_(data.name) + '</b> (<span dir="ltr">' + esc_(email) + '</span>) وقّع مخالصة برنامج <b>' + esc_(data.program) +
          '</b> بتاريخ ' + signedAt + '.</p><p>رقم المستند: <span dir="ltr">' + data.docId + '</span></p>') });
    } catch (e) { console.error('clearance mail: ' + e); }
    log_(email, 'توقيع المخالصة (المتدرب)', r['رقم الطلب'], data.docId);
    releaseHeld_(r); // إطلاق الشهادة المعلّقة
    return { ok: true, requests: getMyData(token).requests };
  } finally { lock.releaseLock(); }
}
/** معاينة المخالصة للفريق قبل توقيع المتدرب (نفس التصميم، بلا توقيع، لا تُحفظ) */
function adminClearancePreview(token, id) {
  admin_(token);
  const r = findReq_(id);
  if (r['المخالصة'] !== CLR.SIGN) throw new Error('المعاينة متاحة بعد إصدار المخالصة وقبل التوقيع.');
  const pdf = buildClearancePdf_(clearanceData_(r), null, jsonOr_(r['سجل التوقيع'], []), now_());
  return { name: 'معاينة - ' + pdf.getName(), data: Utilities.base64Encode(pdf.getBytes()) };
}
function downloadMyClearance(token, id) {
  const r = myReq_(token, id);
  if (!r['ملف المخالصة']) throw new Error('لا توجد مخالصة موقّعة.');
  const f = DriveApp.getFileById(r['ملف المخالصة']);
  return { name: f.getName(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}
function adminDownloadClearance(token, id) {
  admin_(token);
  const r = findReq_(id);
  if (!r['ملف المخالصة']) throw new Error('لا توجد مخالصة موقّعة.');
  const f = DriveApp.getFileById(r['ملف المخالصة']);
  return { name: f.getName(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}
function clearanceFolder_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('CLEARANCE_FOLDER');
  if (!id) { id = DriveApp.getFolderById(prop_('ROOT_FOLDER')).createFolder('المخالصات المالية').getId(); p.setProperty('CLEARANCE_FOLDER', id); }
  return id;
}
/** صور المخالصة (الشعار، الختم، التذييل) من الموقع — تُحفظ في الذاكرة المؤقتة */
function clearanceAsset_(name) {
  const res = UrlFetchApp.fetch(appUrl_() + 'assets/img/clearance/' + name, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  return res.getBlob().setName(name);
}
function usLong_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Number(m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] + ' ' + m[1] : String(iso || '');
}
/** HTML المخالصة: يُحوَّل إلى Google Docs (الاتجاه من اليمين لليسار والخط IBM Plex Sans Arabic يُحفظان في التحويل) ثم PDF */
const CLR_FONT = "font-family:'IBM Plex Sans Arabic';";
/** تاريخ عربي لا ينقلب اتجاهه داخل النص العربي: 1 مارس 2026 */
function arDate_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (!m) return esc_(iso || '');
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ' ' + m[1] + (m[4] ? '، الساعة ' + m[4] : '');
}
function clearanceHtml_(d, img, log, signedAt) {
  const C = '#031233', M = '#5B6478', L = '#C9D3EA', B = '#E8EEFB';
  const p = (t, st) => '<p dir="rtl" style="' + CLR_FONT + 'text-align:right;color:' + C + ';font-size:10.5pt;line-height:1.45;margin:0 0 4pt 0;' + (st || '') + '">' + t + '</p>';
  const ltr = v => '<span dir="ltr">' + esc_(v) + '</span>';
  const cell = (v, head, w) => '<td dir="rtl" style="' + CLR_FONT + 'border:1px solid ' + L + ';padding:4pt 8pt;text-align:right;vertical-align:middle;color:' + C + ';font-size:10pt;' +
    (head ? 'background:' + B + ';font-weight:bold;' : '') + (w ? 'width:' + w + ';' : '') + '">' + v + '</td>';
  const table = (title, rows) => p(title, 'font-weight:bold;font-size:11.5pt;margin:9pt 0 4pt 0') +
    '<table dir="rtl" style="border-collapse:collapse;width:100%">' + rows.map(r => '<tr>' + cell(r[0], true, '32%') + cell(r[1]) + '</tr>').join('') + '</table>';
  const date = arDate_(String(signedAt).slice(0, 10));
  const label = { created: 'إنشاء المستند', sent: 'إرسال للتوقيع', viewed: 'اطلاع المتدرب', signed: 'التوقيع' };
  return '<html><head><meta charset="utf-8"></head><body dir="rtl">' +
    '<table dir="rtl" style="border-collapse:collapse;width:100%"><tr>' +
      '<td dir="rtl" style="width:50%;text-align:right;vertical-align:middle;border:0">' + (img.logo ? '<p dir="rtl" style="text-align:right;margin:0"><img src="' + img.logo + '" width="112" height="70"></p>' : '') + '</td>' +
      '<td dir="rtl" style="' + CLR_FONT + 'width:50%;text-align:left;vertical-align:middle;border:0;color:' + M + ';font-size:9pt">شركة حلول سلوك التقنية<br>س.ت 1010636715</td></tr></table>' +
    p('مخالصة مالية', 'text-align:center;font-size:19pt;font-weight:bold;margin:4pt 0 2pt 0') +
    p('رقم المستند: ' + ltr(d.docId), 'text-align:center;font-size:9pt;color:' + M + ';margin:0 0 6pt 0') +
    table('المعلومات الأولية', [['اسم العميل', esc_(d.name)], ['رقم الجوال', ltr(d.phone)], ['البريد الإلكتروني', ltr(d.email)]]) +
    table('ملخص الالتزامات المالية', [['البرنامج / الخدمة', esc_(d.program)], ['عدد المواد', esc_(d.hours)], ['الإجمالي', ltr(d.total)],
      ['تاريخ البدء', arDate_(d.start)], ['تاريخ الإخلاء', arDate_(d.clearDate)]]) +
    p('الإقرار', 'font-weight:bold;font-size:11.5pt;margin:10pt 0 4pt 0') +
    CLEARANCE_TEXT.map((x, i) => p(esc_(x), 'text-align:justify;line-height:1.6;' + (i === 0 ? 'font-weight:bold;' : ''))).join('') +
    p('وحُرّر هذا الإقرار بتاريخ ' + date + '.', 'margin:4pt 0 8pt 0') +
    '<table dir="rtl" style="border-collapse:collapse;width:100%"><tr>' +
      '<td dir="rtl" style="' + CLR_FONT + 'width:55%;text-align:right;vertical-align:top;border:0;color:' + C + ';font-size:11pt">' +
        '<p dir="rtl" style="' + CLR_FONT + 'text-align:right;margin:0 0 2pt 0;font-size:10.5pt"><b>المُقِر:</b> ' + esc_(d.name) + '</p>' +
        '<p dir="rtl" style="' + CLR_FONT + 'text-align:right;margin:0;font-size:10.5pt"><b>التوقيع:</b></p>' +
        (img.signature ? '<p dir="rtl" style="text-align:right;margin:0"><img alt="signature" src="' + img.signature + '" width="160" height="64"></p>' : '') + '</td>' +
      '<td dir="rtl" style="' + CLR_FONT + 'width:45%;text-align:center;vertical-align:top;border:0;color:' + C + ';font-size:11pt"><b>منصة سلوكيرا</b><br>' +
        (img.stamp ? '<img src="' + img.stamp + '" width="110" height="110">' : '') + '</td></tr></table>' +
    // سجل التوقيع الإلكتروني (صفحة مستقلة)
    p('سجل التوقيع الإلكتروني', 'text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt 0') +
    p('مستند رقم ' + ltr(d.docId) + ' — ' + esc_(d.program), 'text-align:center;font-size:9.5pt;color:' + M + ';margin:0 0 10pt 0') +
    '<table dir="rtl" style="border-collapse:collapse;width:100%"><tr>' + cell('الإجراء', true, '20%') + cell('الوقت', true, '32%') + cell('التفاصيل', true) + '</tr>' +
      log.map(x => '<tr>' + cell(esc_(label[x.e] || x.e)) + cell(arDate_(x.at)) +
        cell([x.by || x.to ? ltr(x.by || x.to) : '', x.ua ? 'الجهاز: ' + ltr(x.ua) : ''].filter(String).join('<br>')) + '</tr>').join('') + '</table>' +
    p('التحقق من الهوية: دخول المتدرب ببريده الإلكتروني ' + ltr(d.email) + ' برمز مؤقت أُرسل إليه، ثم الإقرار بالاطلاع والموافقة ورسم التوقيع بيده على الشاشة.',
      'font-size:9pt;color:' + M + ';margin:10pt 0 0 0') +
    '</body></html>';
}
/** يحوّل HTML المخالصة إلى مستند Google Docs (عبر Drive API)، ويضيف تذييل سلوكيرا، ثم يصدّره PDF. المستند المؤقت يُحذف */
function buildClearancePdf_(d, signature, log, signedAt) {
  const name = (d.docId + ' - Financial Clearance - ' + (d.nameEn || d.email)).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 140);
  const uri = b => b ? 'data:image/png;base64,' + Utilities.base64Encode(b.getBytes()) : '';
  const html = clearanceHtml_(d, { logo: uri(clearanceAsset_('logo-blue.png')), stamp: uri(clearanceAsset_('stamp.png')), signature: uri(signature) }, log, signedAt);
  const boundary = 'slk' + Utilities.getUuid().replace(/-/g, '');
  const meta = JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.document', parents: [clearanceFolder_()] });
  const payload = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary +
    '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n' + html + '\r\n--' + boundary + '--';
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true', {
    method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: Utilities.newBlob(payload).getBytes(),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Drive convert ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  const id = JSON.parse(res.getContentText()).id;
  try {
    try { // التذييل: شريط سلوكيرا
      const doc = DocumentApp.openById(id);
      const body = doc.getBody(); body.setMarginTop(36).setMarginBottom(36).setMarginLeft(50).setMarginRight(50);
      // الخط موحّد لكل النص (التحويل من HTML لا يثبّته دائماً)، والتوقيع يميناً تحت «التوقيع»
      body.editAsText().setFontFamily('IBM Plex Sans Arabic');
      body.getParagraphs().forEach(par => {
        for (let i = 0; i < par.getNumChildren(); i++) {
          const ch = par.getChild(i);
          if (ch.getType() === DocumentApp.ElementType.INLINE_IMAGE && /signature/.test(ch.asInlineImage().getAltDescription() || ''))
            par.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        }
      });
      // سجل التوقيع في صفحة مستقلة
      const hit = body.findText('سجل التوقيع الإلكتروني');
      if (hit) { const par = hit.getElement().getParent(); body.insertPageBreak(body.getChildIndex(par)); }
      const foot = clearanceAsset_('footer.png');
      if (foot) { const fp = doc.addFooter().getParagraphs()[0]; fp.setAlignment(DocumentApp.HorizontalAlignment.CENTER); fp.appendInlineImage(foot).setWidth(490).setHeight(48); }
      doc.saveAndClose();
    } catch (e) { console.error('clearance footer: ' + e); }
    return DriveApp.getFileById(id).getAs('application/pdf').setName(name + '.pdf');
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { }
  }
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
function sendCertEmail_(to, r, certNo, blob, test, note, o) {
  o = o || {};
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
      (note ? '<p style="background:#EAF0FF;padding:10px 14px;border-radius:8px">' + esc_(note) + '</p>' : '') +
      '<p>' + (o.lead || 'نهنئك لحصولك على شهادة التعليم المستمر في:') + '<br><b style="font-size:17px;color:' + CONFIG.COLOR_DARK + '">' + esc_(r['اسم الدورة']) + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;background:#F5F8FF;border-radius:10px;margin:14px 0;font-size:14px">' +
        line('رقم الشهادة', certNo) + line('الاسم على الشهادة', r['الاسم بالإنجليزي']) +
        (o.dateRow ? line(o.dateRow[0], o.dateRow[1]) : start && end ? line('مدة الدورة', start + ' – ' + end) : '') +
        (o.extraRows || []).map(x => line(x[0], x[1])).join('') + '</table>' +
      '<p>📎 مرفق لك الشهادة، ويمكنك تحميلها في أي وقت من «شهاداتي»، والتحقق منها برمز QR المطبوع عليها.</p>' +
      '<p>' + btn(verify, 'التحقق من الشهادة', CONFIG.COLOR_PRIMARY) + btn(appUrl_(), 'شهاداتي', CONFIG.COLOR_DARK) + '</p>' +
      (o.noDateNote ? '' : '<p style="background:#FFF8EB;padding:12px 16px;border-radius:8px;font-size:14px"><b>ملاحظة حول التاريخ:</b> التاريخ مكتوب بالصيغة الأمريكية المعتمدة لدى البورد: ' +
        'الشهر ثم اليوم ثم السنة (MM/DD/YYYY). فمثلاً <span dir="ltr">' + ex.split(' تعني ')[0] + '</span> تعني ' + ex.split(' تعني ')[1] + '.</p>') +
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
  adminClearance: b => adminClearance(b.token, b.id, b.data),
  adminClearanceResend: b => adminClearanceResend(b.token, b.id),
  adminClearanceStart: b => adminClearanceStart(b.token, b.id),
  adminClearancePreview: b => adminClearancePreview(b.token, b.id),
  adminSupReserve: b => adminSupReserve(b.token, b.data),
  adminSupSend: b => adminSupSend(b.token, b.data),
  adminDirectReserve: b => adminDirectReserve(b.token, b.data),
  adminCourses: b => (admin_(b.token), courses_()),
  adminNameChangeReject: b => adminNameChangeReject(b.token, b.id, b.reason),
  adminStats: b => adminStats(b.token),
  requestNameChange: b => requestNameChange(b.token, b.id, b.data),
  adminDownloadClearance: b => adminDownloadClearance(b.token, b.id),
  clearanceView: b => clearanceView(b.token, b.id),
  clearanceSign: b => clearanceSign(b.token, b.id, b.data),
  downloadMyClearance: b => downloadMyClearance(b.token, b.id),
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
/** للتفويض فقط: يُشغَّل مرة من محرر Apps Script بحساب care@ (Run) فتظهر نافذة الموافقة على كل الصلاحيات، ومنها Google Docs للمخالصة */
function authorize() {
  const doc = DocumentApp.create('اختبار صلاحية المخالصة — يُحذف تلقائياً');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  MailApp.getRemainingDailyQuota();
  UrlFetchApp.fetch(siteUrl_() + 'templates/courses.json', { muteHttpExceptions: true });
  Logger.log('✅ الصلاحيات مكتملة (Google Docs، Drive، البريد، الشيت).');
  return 'ok';
}

function doGet() {
  memoReset_();
  ensureSetup_();
  return json_({ ok: true, service: 'sulukera-certificates', ready: true, time: new Date().toISOString() });
}
