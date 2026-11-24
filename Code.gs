/**
 * سلوكيرا — نظام الشهادات (المرحلة الأولى)
 * ------------------------------------------------------------------
 * ملفان في المشروع:  Code.gs (هذا)  +  Index.html
 *
 * الإعداد لأول مرة:
 *   1) شغّلي الدالة setup() مرة واحدة من المحرر ← تنشئ الشيت والمجلدات.
 *   2) Deploy ← New deployment ← Web app
 *        Execute as: Me    |    Who has access: Anyone
 *   3) رابط النشر هو موقع الشهادات:
 *        <الرابط>              بوابة المتدرب
 *        <الرابط>?page=admin   لوحة المراجعة (للإيميلات في ADMINS فقط)
 *        <الرابط>?v=رقم_الشهادة صفحة التحقق العامة (يفتحها رمز QR)
 *
 * المسار:
 *   المتدرب يدخل بإيميله (رمز من 6 أرقام) ← يطلب الشهادة ويرفع صورة الإتمام
 *   ويعبّي استبيان الرضا ← الطلب يوصل لوحة المراجعة ← المراجِعة تحدد تاريخ
 *   البدء والإتمام وتعتمد ← تتولّد الشهادة وتنحفظ وتنرسل بالإيميل تلقائياً.
 */

const CONFIG = {
  // من يحق له فتح لوحة المراجعة
  ADMINS: ['maryam@sulukera.com', 'care@sulukera.com'],

  SENDER_NAME: 'سلوكيرا | Sulukera',
  REPLY_TO: 'care@sulukera.com',
  SUBJECT: 'شهادتك من سلوكيرا 🎓 | {{course}}',
  COLOR_PRIMARY: '#2E6DB4',
  COLOR_DARK: '#1F3A5F',
  LOGO_URL: '',                 // اختياري: رابط عام لشعار سلوكيرا (PNG)

  CERT_PREFIX: 'SLK',           // رقم الشهادة: SLK-2026-000001

  // نظام العمليات: للبحث عن المتدرب بإيميله (قراءة فقط)
  OPS: {
    SHEET_ID: '1KdEwKu-Y5L1wII9qGU_pgMmCmAMVcCZiBlC26xR29bU',
    TAB: 'العملاء',
    COL_EMAIL: 'البريد الإلكتروني',
    COL_PROGRAM: 'البرنامج',
    COL_REGISTERED: 'تاريخ التسجيل',
    COL_ACTIVATED: 'تاريخ التفعيل',
  },

  // استبيان الرضا الإلزامي قبل الطلب (تقييم 1–5 لكل سؤال + تعليق)
  SURVEY: [
    'مدى رضاك العام عن الدورة',
    'وضوح المحتوى العلمي',
    'أداء المحاضر',
    'سهولة استخدام المنصة',
    'احتمال أن توصي بسلوكيرا لغيرك',
  ],

  MAX_UPLOAD_MB: 5,
};

/* ===================== الأوراق ===================== */
const TABS = {
  COURSES: 'الدورات',
  REQ: 'الطلبات',
  SURVEY: 'الرضا',
};
const COURSE_HEADERS = ['المعرّف', 'اسم الدورة', 'معرّف ملف الخلفية', 'إعدادات الحقول (JSON)', 'مفعّلة'];
const REQ_HEADERS = [
  'رقم الطلب', 'تاريخ الطلب', 'الاسم بالعربي', 'الاسم بالإنجليزي', 'البريد', 'الجوال',
  'معرّف الدورة', 'اسم الدورة', 'صورة الإتمام', 'موجود في العمليات', 'بيانات العمليات',
  'الحالة', 'تاريخ البدء', 'تاريخ الإتمام', 'رقم الشهادة', 'ملف الشهادة', 'تاريخ الإصدار',
  'اعتمدها', 'ملاحظات',
];
const SURVEY_HEADERS = ['رقم الطلب', 'التاريخ', 'البريد', 'الدورة']
  .concat(CONFIG.SURVEY).concat(['تعليق']);

const ST = { PENDING: 'بانتظار المراجعة', ISSUED: 'صادرة', REJECTED: 'مرفوضة', REVOKED: 'ملغاة' };

/* ===================== الإعداد ===================== */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  if (props.getProperty('SHEET_ID')) {
    ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  } else {
    ss = SpreadsheetApp.create('سلوكيرا — نظام الشهادات');
    props.setProperty('SHEET_ID', ss.getId());
  }
  ensureTab_(ss, TABS.COURSES, COURSE_HEADERS);
  ensureTab_(ss, TABS.REQ, REQ_HEADERS);
  ensureTab_(ss, TABS.SURVEY, SURVEY_HEADERS);
  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' || first.getName() === 'الورقة1') ss.deleteSheet(first);

  if (!props.getProperty('ROOT_FOLDER')) {
    const root = DriveApp.createFolder('سلوكيرا — نظام الشهادات');
    props.setProperty('ROOT_FOLDER', root.getId());
    props.setProperty('CERTS_FOLDER', root.createFolder('الشهادات الصادرة').getId());
    props.setProperty('PROOFS_FOLDER', root.createFolder('إثباتات الإتمام').getId());
    props.setProperty('TEMPLATES_FOLDER', root.createFolder('خلفيات القوالب').getId());
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }
  Logger.log('الشيت: ' + ss.getUrl());
  Logger.log('المجلد: ' + DriveApp.getFolderById(props.getProperty('ROOT_FOLDER')).getUrl());
}

function ensureTab_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}

/* ===================== أدوات عامة ===================== */
function prop_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error('النظام غير مُعدّ بعد. شغّلي setup() من المحرر.');
  return v;
}
function ss_() { return SpreadsheetApp.openById(prop_('SHEET_ID')); }
function sheet_(name) { return ss_().getSheetByName(name); }
function tz_() { return Session.getScriptTimeZone(); }
function now_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
function cleanEmail_(e) { return String(e || '').trim().toLowerCase(); }
function isEmail_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function webUrl_() { return ScriptApp.getService().getUrl(); }

function rows_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const head = values.shift();
  return values.map((r, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, j) => o[h] = r[j] instanceof Date
      ? Utilities.formatDate(r[j], tz_(), 'yyyy-MM-dd') : r[j]);
    return o;
  });
}
function setCells_(name, row, obj) {
  const sh = sheet_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(obj).forEach(k => {
    const c = head.indexOf(k);
    if (c >= 0) sh.getRange(row, c + 1).setValue(obj[k]);
  });
}
function appendObj_(name, headers, obj) {
  sheet_(name).appendRow(headers.map(h => obj[h] == null ? '' : obj[h]));
}

/* ===================== الدخول برمز ===================== */
function requestCode(email) {
  email = cleanEmail_(email);
  if (!isEmail_(email)) throw new Error('البريد الإلكتروني غير صحيح.');
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('cnt:' + email) || 0);
  if (n >= 5) throw new Error('طلبت رموزاً كثيرة. حاول بعد نصف ساعة.');
  cache.put('cnt:' + email, String(n + 1), 1800);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('otp:' + email, code, 600);
  MailApp.sendEmail({
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

function verifyCode(email, code) {
  email = cleanEmail_(email);
  const cache = CacheService.getScriptCache();
  const k = 'otp:' + email;
  const tries = Number(cache.get('try:' + email) || 0);
  if (tries >= 5) throw new Error('محاولات كثيرة. اطلب رمزاً جديداً.');
  if (!code || cache.get(k) !== String(code).trim()) {
    cache.put('try:' + email, String(tries + 1), 600);
    throw new Error('الرمز غير صحيح أو انتهت صلاحيته.');
  }
  cache.remove(k); cache.remove('try:' + email);
  const token = Utilities.getUuid();
  cache.put('tok:' + token, email, 21600); // 6 ساعات
  return { token: token, email: email, isAdmin: isAdmin_(email) };
}

function who_(token) {
  const email = token && CacheService.getScriptCache().get('tok:' + token);
  if (!email) throw new Error('انتهت الجلسة. سجّل الدخول من جديد.');
  return email;
}
function isAdmin_(email) { return CONFIG.ADMINS.map(cleanEmail_).indexOf(email) >= 0; }
function admin_(token) {
  const email = who_(token);
  if (!isAdmin_(email)) throw new Error('غير مصرّح.');
  return email;
}

/* ===================== المتدرب ===================== */
function activeCourses_() {
  return rows_(TABS.COURSES)
    .filter(c => c['المعرّف'] && String(c['مفعّلة']).trim() !== 'لا')
    .map(c => ({ id: String(c['المعرّف']), name: c['اسم الدورة'] }));
}

function getMyData(token) {
  const email = who_(token);
  const mine = rows_(TABS.REQ).filter(r => cleanEmail_(r['البريد']) === email);
  return {
    email: email,
    courses: activeCourses_(),
    survey: CONFIG.SURVEY,
    maxMb: CONFIG.MAX_UPLOAD_MB,
    requests: mine.map(r => ({
      id: r['رقم الطلب'], course: r['اسم الدورة'], date: r['تاريخ الطلب'],
      status: r['الحالة'], certNo: r['رقم الشهادة'], issued: r['تاريخ الإصدار'],
      note: r['الحالة'] === ST.REJECTED ? r['ملاحظات'] : '',
    })).reverse(),
  };
}

function submitRequest(token, d) {
  const email = who_(token);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const nameAr = String(d.nameAr || '').trim();
    const nameEn = String(d.nameEn || '').trim();
    if (!nameAr && !nameEn) throw new Error('اكتب اسمك كما تريده على الشهادة.');
    const course = activeCourses_().filter(c => c.id === String(d.courseId))[0];
    if (!course) throw new Error('اختر الدورة.');
    if (!d.proof || !d.proof.data) throw new Error('ارفع صورة نسبة الإتمام من حسابك.');
    if (!d.survey || d.survey.length !== CONFIG.SURVEY.length || d.survey.some(v => !(v >= 1 && v <= 5)))
      throw new Error('أكمل استبيان الرضا.');

    const dup = rows_(TABS.REQ).filter(r => cleanEmail_(r['البريد']) === email &&
      String(r['معرّف الدورة']) === course.id && [ST.PENDING, ST.ISSUED].indexOf(r['الحالة']) >= 0)[0];
    if (dup) throw new Error(dup['الحالة'] === ST.ISSUED
      ? 'شهادة هذه الدورة صادرة لك مسبقاً، تجدها في «شهاداتي».'
      : 'لديك طلب لهذه الدورة قيد المراجعة.');

    const bytes = Utilities.base64Decode(d.proof.data);
    if (bytes.length > CONFIG.MAX_UPLOAD_MB * 1024 * 1024) throw new Error('حجم الصورة أكبر من المسموح.');
    if (!/^image\/(png|jpe?g|webp)$/.test(d.proof.type)) throw new Error('الصورة يجب أن تكون PNG أو JPG.');

    const id = 'REQ-' + Utilities.formatDate(new Date(), tz_(), 'yyMMdd') + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const file = DriveApp.getFolderById(prop_('PROOFS_FOLDER')).createFile(
      Utilities.newBlob(bytes, d.proof.type, id + ' - ' + (nameAr || nameEn)));

    const ops = opsLookup_(email);
    appendObj_(TABS.REQ, REQ_HEADERS, {
      'رقم الطلب': id, 'تاريخ الطلب': now_(), 'الاسم بالعربي': nameAr, 'الاسم بالإنجليزي': nameEn,
      'البريد': email, 'الجوال': String(d.phone || '').trim(),
      'معرّف الدورة': course.id, 'اسم الدورة': course.name, 'صورة الإتمام': file.getId(),
      'موجود في العمليات': ops.length ? 'نعم' : 'لا', 'بيانات العمليات': JSON.stringify(ops),
      'الحالة': ST.PENDING,
    });
    const s = {}; s['رقم الطلب'] = id; s['التاريخ'] = now_(); s['البريد'] = email; s['الدورة'] = course.name;
    CONFIG.SURVEY.forEach((q, i) => s[q] = Number(d.survey[i]));
    s['تعليق'] = String(d.comment || '').trim();
    appendObj_(TABS.SURVEY, SURVEY_HEADERS, s);
    return id;
  } finally { lock.releaseLock(); }
}

function downloadMyCert(token, certNo) {
  const email = who_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الشهادة'] === certNo)[0];
  if (!r || (cleanEmail_(r['البريد']) !== email && !isAdmin_(email))) throw new Error('غير موجودة.');
  if (r['الحالة'] !== ST.ISSUED) throw new Error('هذه الشهادة غير متاحة.');
  const f = DriveApp.getFileById(r['ملف الشهادة']);
  return { name: f.getName(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/* ===================== نظام العمليات ===================== */
function opsLookup_(email) {
  try {
    const o = CONFIG.OPS;
    const sh = SpreadsheetApp.openById(o.SHEET_ID).getSheetByName(o.TAB);
    const v = sh.getDataRange().getValues();
    const head = v.shift();
    const ci = h => head.indexOf(h);
    const fmt = x => x instanceof Date ? Utilities.formatDate(x, tz_(), 'yyyy-MM-dd') : String(x || '');
    return v.filter(r => cleanEmail_(r[ci(o.COL_EMAIL)]) === email).map(r => ({
      program: fmt(r[ci(o.COL_PROGRAM)]),
      registered: fmt(r[ci(o.COL_REGISTERED)]),
      activated: fmt(r[ci(o.COL_ACTIVATED)]),
    }));
  } catch (e) {
    return [{ error: 'تعذّرت القراءة من نظام العمليات: ' + e.message }];
  }
}

/* ===================== لوحة المراجعة ===================== */
function adminList(token) {
  admin_(token);
  return rows_(TABS.REQ).map(r => ({
    row: r._row, id: r['رقم الطلب'], date: r['تاريخ الطلب'], nameAr: r['الاسم بالعربي'],
    nameEn: r['الاسم بالإنجليزي'], email: r['البريد'], course: r['اسم الدورة'],
    inOps: r['موجود في العمليات'], status: r['الحالة'], certNo: r['رقم الشهادة'],
    issued: r['تاريخ الإصدار'],
  })).reverse();
}

function adminGet(token, id) {
  admin_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الطلب'] === id)[0];
  if (!r) throw new Error('الطلب غير موجود.');
  let proof = null;
  try {
    const f = DriveApp.getFileById(r['صورة الإتمام']);
    proof = 'data:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
  } catch (e) { }
  let ops = [];
  try { ops = JSON.parse(r['بيانات العمليات'] || '[]'); } catch (e) { }
  return {
    id: id, nameAr: r['الاسم بالعربي'], nameEn: r['الاسم بالإنجليزي'], email: r['البريد'],
    phone: r['الجوال'], courseId: String(r['معرّف الدورة']), course: r['اسم الدورة'],
    date: String(r['تاريخ الطلب']).slice(0, 10), status: r['الحالة'], proof: proof,
    ops: ops, opsNow: opsLookup_(cleanEmail_(r['البريد'])),
    start: r['تاريخ البدء'], end: r['تاريخ الإتمام'], certNo: r['رقم الشهادة'], note: r['ملاحظات'],
  };
}

/** قالب الدورة: صورة الخلفية + مواقع الحقول، للتوليد داخل المتصفح */
function adminTemplate(token, courseId) {
  admin_(token);
  const c = rows_(TABS.COURSES).filter(x => String(x['المعرّف']) === String(courseId))[0];
  if (!c) throw new Error('الدورة غير موجودة في تبويب «الدورات».');
  if (!c['معرّف ملف الخلفية']) throw new Error('لم تُضف صورة خلفية لهذه الدورة.');
  let layout;
  try { layout = JSON.parse(c['إعدادات الحقول (JSON)']); }
  catch (e) { throw new Error('إعدادات الحقول لهذه الدورة ليست JSON صحيحاً.'); }
  const f = DriveApp.getFileById(c['معرّف ملف الخلفية']);
  return {
    layout: layout,
    bg: 'data:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes()),
  };
}

/** رقم الشهادة يُحجز قبل التوليد حتى يُطبع على الشهادة ورمز QR */
function adminReserveNumber(token, id) {
  admin_(token);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const all = rows_(TABS.REQ);
    const r = all.filter(x => x['رقم الطلب'] === id)[0];
    if (!r) throw new Error('الطلب غير موجود.');
    if (r['رقم الشهادة']) return { certNo: r['رقم الشهادة'], verifyUrl: webUrl_() + '?v=' + r['رقم الشهادة'] };
    const year = Utilities.formatDate(new Date(), tz_(), 'yyyy');
    const pre = CONFIG.CERT_PREFIX + '-' + year + '-';
    const max = all.map(x => String(x['رقم الشهادة'] || ''))
      .filter(n => n.indexOf(pre) === 0).map(n => Number(n.slice(pre.length)) || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    const certNo = pre + ('00000' + (max + 1)).slice(-6);
    setCells_(TABS.REQ, r._row, { 'رقم الشهادة': certNo });
    return { certNo: certNo, verifyUrl: webUrl_() + '?v=' + certNo };
  } finally { lock.releaseLock(); }
}

/** الاعتماد: حفظ الملف + الإيميل + تحديث السجل */
function adminApprove(token, d) {
  const by = admin_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الطلب'] === d.id)[0];
  if (!r) throw new Error('الطلب غير موجود.');
  if (r['الحالة'] === ST.ISSUED && !d.resend) throw new Error('الشهادة صادرة مسبقاً.');
  if (!r['رقم الشهادة'] || r['رقم الشهادة'] !== d.certNo) throw new Error('رقم الشهادة غير مطابق. أعيدي التوليد.');
  if (!d.start || !d.end) throw new Error('حددي تاريخ البدء وتاريخ الإتمام.');
  if (!d.pdf) throw new Error('لم تتولد الشهادة.');

  const name = r['الاسم بالعربي'] || r['الاسم بالإنجليزي'];
  const fileName = d.certNo + ' - ' + name + ' - ' + r['اسم الدورة'] + '.pdf';
  const blob = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', fileName);

  if (d.test) {
    sendCertEmail_(cleanEmail_(by), r, d.certNo, blob, true);
    return 'تم إرسال نسخة تجريبية إلى ' + by;
  }

  const file = DriveApp.getFolderById(prop_('CERTS_FOLDER')).createFile(blob);
  if (r['ملف الشهادة']) { try { DriveApp.getFileById(r['ملف الشهادة']).setTrashed(true); } catch (e) { } }
  setCells_(TABS.REQ, r._row, {
    'الحالة': ST.ISSUED, 'تاريخ البدء': d.start, 'تاريخ الإتمام': d.end,
    'ملف الشهادة': file.getId(), 'تاريخ الإصدار': now_(), 'اعتمدها': by,
    'الاسم بالعربي': d.nameAr != null ? d.nameAr : r['الاسم بالعربي'],
    'الاسم بالإنجليزي': d.nameEn != null ? d.nameEn : r['الاسم بالإنجليزي'],
  });
  sendCertEmail_(cleanEmail_(r['البريد']), r, d.certNo, blob, false);
  return 'صدرت الشهادة ' + d.certNo + ' وأُرسلت إلى ' + r['البريد'];
}

function adminReject(token, id, reason) {
  const by = admin_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الطلب'] === id)[0];
  if (!r) throw new Error('الطلب غير موجود.');
  reason = String(reason || '').trim();
  if (!reason) throw new Error('اكتبي سبب الرفض ليظهر للمتدرب.');
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.REJECTED, 'ملاحظات': reason, 'اعتمدها': by });
  MailApp.sendEmail({
    to: r['البريد'], name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO,
    subject: 'بخصوص طلب شهادة ' + r['اسم الدورة'],
    htmlBody: shell_('بخصوص طلب الشهادة',
      '<p>مرحباً ' + esc_(r['الاسم بالعربي'] || r['الاسم بالإنجليزي']) + '،</p>' +
      '<p>راجعنا طلب شهادة <b>' + esc_(r['اسم الدورة']) + '</b> ولم نتمكن من إصدارها حالياً للسبب التالي:</p>' +
      '<p style="background:#FFF4E5;padding:12px 16px;border-radius:8px">' + esc_(reason) + '</p>' +
      '<p>يمكنك تقديم طلب جديد بعد المعالجة من <a href="' + webUrl_() + '">موقع الشهادات</a>، أو الرد على هذه الرسالة.</p>'),
  });
  return 'تم الرفض وإبلاغ المتدرب.';
}

function adminRevoke(token, id, reason) {
  const by = admin_(token);
  const r = rows_(TABS.REQ).filter(x => x['رقم الطلب'] === id)[0];
  if (!r) throw new Error('الطلب غير موجود.');
  setCells_(TABS.REQ, r._row, { 'الحالة': ST.REVOKED, 'ملاحظات': String(reason || ''), 'اعتمدها': by });
  return 'أُلغيت الشهادة ' + r['رقم الشهادة'] + '. صفحة التحقق ستظهرها ملغاة.';
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

function sendCertEmail_(to, r, certNo, blob, test) {
  const name = r['الاسم بالعربي'] || r['الاسم بالإنجليزي'];
  const verify = webUrl_() + '?v=' + certNo;
  const btn = (href, label, bg) => '<a href="' + href + '" style="display:inline-block;background:' + bg +
    ';color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;margin:4px 0 4px 8px">' + label + '</a>';
  MailApp.sendEmail({
    to: to, name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO,
    subject: (test ? '[تجربة] ' : '') + CONFIG.SUBJECT.replace('{{course}}', r['اسم الدورة']),
    attachments: [blob],
    htmlBody: shell_('مبارك! 🎓',
      '<p>مرحباً ' + esc_(name) + '،</p>' +
      '<p>يسعدنا إتمامك دورة <b>' + esc_(r['اسم الدورة']) + '</b>، ونرفق لك شهادتك.</p>' +
      '<p style="background:#EEF4FB;padding:12px 16px;border-radius:8px">رقم الشهادة: <b dir="ltr">' + certNo + '</b></p>' +
      '<p>' + btn(verify, 'صفحة التحقق من الشهادة', CONFIG.COLOR_PRIMARY) +
      btn(webUrl_(), 'شهاداتي', CONFIG.COLOR_DARK) + '</p>' +
      '<p style="color:#666;font-size:13px">يمكنك تحميل شهادتك في أي وقت من «شهاداتي» بالدخول ببريدك هذا، ويمكن لأي جهة التحقق منها برمز QR المطبوع عليها.</p>' +
      '<p>مع تمنياتنا لك بالتوفيق،<br>فريق سلوكيرا</p>'),
  });
}

/* ===================== الصفحات ===================== */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.v) return verifyPage_(p.v);
  const t = HtmlService.createTemplateFromFile('Index');
  t.page = p.page === 'admin' ? 'admin' : 'portal';
  return t.evaluate()
    .setTitle(t.page === 'admin' ? 'سلوكيرا | مراجعة الشهادات' : 'سلوكيرا | الشهادات')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function verifyPage_(certNo) {
  certNo = String(certNo).trim().toUpperCase();
  let r = null;
  try { r = rows_(TABS.REQ).filter(x => x['رقم الشهادة'] === certNo)[0]; } catch (e) { }
  let body;
  if (r && r['الحالة'] === ST.ISSUED) {
    const line = (k, v) => '<tr><td style="color:#666;padding:8px 0;width:40%">' + k + '</td><td style="padding:8px 0"><b>' + esc_(v) + '</b></td></tr>';
    body = '<div style="font-size:52px">✅</div><h1 style="color:#1E7B4F;margin:8px 0">شهادة صحيحة</h1>' +
      '<p style="color:#555">هذه الشهادة صادرة من أكاديمية سلوكيرا</p>' +
      '<table style="width:100%;text-align:right;margin-top:16px;border-top:1px solid #eee">' +
      line('الاسم', [r['الاسم بالعربي'], r['الاسم بالإنجليزي']].filter(String).join(' — ')) +
      line('الدورة', r['اسم الدورة']) +
      line('تاريخ البدء', r['تاريخ البدء']) + line('تاريخ الإتمام', r['تاريخ الإتمام']) +
      line('رقم الشهادة', certNo) + '</table>';
  } else if (r && r['الحالة'] === ST.REVOKED) {
    body = '<div style="font-size:52px">⛔</div><h1 style="color:#B42318">شهادة ملغاة</h1>' +
      '<p>رقم الشهادة ' + esc_(certNo) + ' أُلغي من قبل سلوكيرا.</p>';
  } else {
    body = '<div style="font-size:52px">❓</div><h1 style="color:#B42318">لم نعثر على هذه الشهادة</h1>' +
      '<p>تأكد من الرقم أو تواصل معنا على ' + CONFIG.REPLY_TO + '</p>';
  }
  const html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">' +
    '</head><body style="margin:0;background:#F3F5F8;font-family:\'IBM Plex Sans Arabic\',Tahoma,sans-serif">' +
    '<div style="background:' + CONFIG.COLOR_DARK + ';color:#fff;padding:18px 24px;font-size:20px;font-weight:700">سلوكيرا | Sulukera — التحقق من الشهادات</div>' +
    '<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06)">' +
    body + '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('التحقق من شهادة سلوكيرا')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
