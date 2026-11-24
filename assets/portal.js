/* بوابة المتدرب + صفحة التحقق العامة */
const params = new URLSearchParams(location.search);

/* ---------- صفحة التحقق ---------- */
async function showVerify(certNo) {
  document.title = 'التحقق من شهادة سلوكيرا';
  $('hero').classList.add('compact');
  $('heroTitle').textContent = 'التحقق من شهادة';
  $('heroSub').textContent = 'هذه الصفحة تؤكد صحة الشهادات الصادرة من سلوكيرا.';
  $('vVerify').classList.remove('hide');
  let body;
  try {
    const r = await api('verify', { certNo: certNo });
    if (r.status === 'valid') {
      const line = (k, v, ltr) => '<tr><td>' + k + '</td><td><b' + (ltr ? ' dir="ltr"' : '') + '>' + esc(v) + '</b></td></tr>';
      body = '<div class="icon">✅</div><h1 style="color:var(--ok)">شهادة صحيحة</h1>' +
        '<p class="hint">هذه الشهادة صادرة من أكاديمية سلوكيرا</p>' +
        '<table style="margin-top:12px">' + line('الاسم', r.name, true) + line('الدورة', r.course, true) + (r.courseAr && r.courseAr !== r.course ? line('', r.courseAr) : '') +
        line('تاريخ البدء', usDate(r.start), true) + line('تاريخ الانتهاء', usDate(r.end), true) +
        line('رقم الشهادة', r.certNo, true) + '</table>';
    } else if (r.status === 'revoked') {
      body = '<div class="icon">⛔</div><h1 style="color:var(--err)">شهادة ملغاة</h1>' +
        '<p>الشهادة رقم <b dir="ltr">' + esc(r.certNo) + '</b> أُلغيت من قبل سلوكيرا ولم تعد سارية.</p>';
    } else {
      body = '<div class="icon">❓</div><h1 style="color:var(--err)">لم نعثر على هذه الشهادة</h1>' +
        '<p>تأكد من الرقم <b dir="ltr">' + esc(certNo) + '</b> أو تواصل معنا على <a href="mailto:care@sulukera.com">care@sulukera.com</a></p>';
    }
  } catch (e) { body = '<div class="icon">⚠️</div><p class="msg err" style="display:block">' + esc(e.message) + '</p>'; }
  $('verifyBody').innerHTML = body;
}

/* ---------- البوابة ---------- */
let SESSION, SURVEY = [], ANS = [], COURSES = [];

function showPortal(on) {
  $('vLogin').classList.toggle('hide', on);
  $('vPortal').classList.toggle('hide', !on);
}

document.querySelectorAll('#vPortal .tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#vPortal .tabs button').forEach(x => x.classList.toggle('on', x === b));
  ['pNew', 'pMine'].forEach(id => $(id).classList.toggle('hide', id !== b.dataset.t));
});

async function loadPortal(preloaded) {
  try {
    const d = preloaded || await api('getMyData', { token: SESSION.token });
    SURVEY = d.survey; ANS = SURVEY.map(() => 0); COURSES = d.courses;
    document.querySelectorAll('.issueDays').forEach(e => e.textContent = d.issueDays);
    $('commentLabel').textContent = d.surveyComment;
    renderCourses();
    let sec = '';
    $('survey').innerHTML = SURVEY.map((x, i) => {
      const head = x.section !== sec ? '<h3>' + esc(sec = x.section) + '</h3>' : '';
      const nums = Array.from({ length: x.max }, (_, k) => k + 1);
      return head + '<div class="q">' + esc(x.q) + '<div class="rate' + (x.max > 5 ? ' ten' : '') + '" data-i="' + i + '" role="radiogroup" aria-label="' + esc(x.q) + '">' +
        nums.map(n => '<button type="button" data-n="' + n + '" aria-label="' + n + '">' + n + '</button>').join('') + '</div>' +
        (x.max > 5 ? '<div class="rate-ends"><span>1 = لا أوصي به إطلاقاً</span><span>10 = أوصي به بالتأكيد</span></div>' : '') + '</div>';
    }).join('');
    document.querySelectorAll('.rate button').forEach(s => s.onclick = () => {
      const i = +s.parentNode.dataset.i; ANS[i] = +s.dataset.n;
      s.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.n === ANS[i]));
    });
    renderMine(d.requests);
  } catch (e) { msg($('pMsg'), e.message, 'err'); }
}

function renderMine(list) {
  if (!list.length) { $('mineList').innerHTML = '<p class="hint">لا توجد طلبات بعد.</p>'; return; }
  const clrNote = r => !r.clearance || r.clearance === CLR.SIGNED || r.clearance === CLR.NONE ? '' :
    '<div class="hint">المخالصة المالية: ' + esc(r.clearance === CLR.SIGN ? 'جاهزة لتوقيعك' : r.clearance === CLR.DUE ? 'بانتظار إتمام السداد' : 'قيد الإعداد لدى المالية') + '</div>';
  $('mineList').innerHTML = '<div class="tablewrap"><table><tr><th>الدورة</th><th>تاريخ الطلب</th><th>الحالة</th><th></th></tr>' +
    list.map(r => '<tr><td>' + esc(r.course) + '</td><td>' + esc(r.date) + '</td><td>' + pill(r.status === ST.HELD ? 'معتمدة، تُرسل بعد المخالصة' : r.status) +
      (r.note ? '<div class="hint">السبب: ' + esc(r.note) + '</div>' : '') + clrNote(r) + '</td><td class="row-actions">' +
      (r.clearance === CLR.SIGN ? '<button data-sign="' + esc(r.id) + '" class="sign">مراجعة وتوقيع المخالصة</button>' : '') +
      (r.status === ST.ISSUED ? '<button data-c="' + esc(r.certNo) + '" class="dl">تحميل الشهادة</button>' : '') +
      (r.clearanceFile ? '<button data-clr="' + esc(r.id) + '" class="ghost dlc">المخالصة الموقّعة</button>' : '') + '</td></tr>').join('') + '</table></div>';
  document.querySelectorAll('.dl').forEach(b => b.onclick = async () => {
    busy(b, true);
    try { const f = await api('downloadMyCert', { token: SESSION.token, certNo: b.dataset.c }); downloadB64(f.name, f.data); }
    catch (e) { alert(e.message); }
    busy(b, false);
  });
  document.querySelectorAll('.dlc').forEach(b => b.onclick = async () => {
    busy(b, true);
    try { const f = await api('downloadMyClearance', { token: SESSION.token, id: b.dataset.clr }); downloadB64(f.name, f.data); }
    catch (e) { alert(e.message); }
    busy(b, false);
  });
  document.querySelectorAll('.sign').forEach(b => b.onclick = () => openSign(b.dataset.sign, b));
  // تنبيه في أعلى الطلب الجديد إن كانت هناك مخالصة بانتظار التوقيع
  const waiting = list.filter(r => r.clearance === CLR.SIGN).length;
  $('signAlert') && $('signAlert').remove();
  if (waiting) $('pNew').insertAdjacentHTML('afterbegin', '<div id="signAlert" class="warnbox" style="margin-bottom:14px">📝 لديك مخالصة مالية بانتظار توقيعك. افتح «شهاداتي» واضغط «مراجعة وتوقيع المخالصة».</div>');
}

/* ---------- المخالصة: مراجعة + إقرار + رسم التوقيع ---------- */
let SIGN_ID = null, SIG_DIRTY = false;
const usLong = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1] + ' ' + m[1] : ''; };
function clrDocHtml(d) {
  const row = (k, v, ltr) => '<tr><th>' + k + '</th><td' + (ltr ? ' dir="ltr"' : '') + '>' + esc(v) + '</td></tr>';
  return '<div class="clr-head"><img src="assets/img/clearance/logo-blue.png" alt="سلوكيرا"><span>شركة حلول سلوك التقنية — س.ت 1010636715</span></div>' +
    '<h3 class="clr-title">مخالصة مالية</h3>' +
    '<h4>المعلومات الأولية</h4><table class="clr-t">' + row('اسم العميل', d.name) + row('رقم الجوال', d.phone, true) + row('البريد الإلكتروني', d.email, true) + '</table>' +
    '<h4>ملخص الالتزامات المالية</h4><table class="clr-t">' + row('البرنامج / الخدمة', d.program) + row('عدد الساعات', d.hours) + row('الإجمالي', d.total, true) +
      row('تاريخ البدء', usLong(d.start), true) + row('تاريخ الإخلاء', usLong(d.clearDate), true) + '</table>' +
    d.text.map((x, i) => '<p' + (i === 0 ? ' style="font-weight:700"' : '') + '>' + esc(x) + '</p>').join('') +
    '<p class="hint">رقم المستند: <span dir="ltr">' + esc(d.docId) + '</span></p>';
}
async function openSign(id, btn) {
  busy(btn, true);
  try {
    const d = await api('clearanceView', { token: SESSION.token, id: id });
    SIGN_ID = id;
    $('clrDoc').innerHTML = clrDocHtml(d);
    $('clrSignArea').classList.toggle('hide', d.status !== CLR.SIGN);
    $('clrAgree').checked = false; clearMsg($('signMsg'));
    ['pNew', 'pMine'].forEach(x => $(x).classList.add('hide')); $('pSign').classList.remove('hide');
    document.querySelector('#vPortal .tabs').classList.add('hide');
    setupPad(); window.scrollTo(0, 0);
  } catch (e) { alert(e.message); }
  busy(btn, false);
}
$('bSignBack').onclick = () => { $('pSign').classList.add('hide'); $('pMine').classList.remove('hide'); document.querySelector('#vPortal .tabs').classList.remove('hide'); };
function setupPad() {
  const c = $('sigPad'), r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#031233';
  SIG_DIRTY = false; let drawing = false, last = null;
  const pt = e => { const b = c.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  c.onpointerdown = e => { drawing = true; last = pt(e); c.setPointerCapture(e.pointerId); e.preventDefault(); };
  c.onpointermove = e => { if (!drawing) return; const p = pt(e); x.beginPath(); x.moveTo(last.x, last.y); x.lineTo(p.x, p.y); x.stroke(); last = p; SIG_DIRTY = true; e.preventDefault(); };
  c.onpointerup = c.onpointercancel = () => { drawing = false; };
}
$('bSigClear').onclick = () => setupPad();
/** توقيع بحدود القص (بلا فراغ) على خلفية شفافة */
function signaturePng() {
  const c = $('sigPad'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 0) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 - x0 < 20 || y1 - y0 < 8) return null;
  const o = document.createElement('canvas'), pad = 8; o.width = x1 - x0 + pad * 2; o.height = y1 - y0 + pad * 2;
  o.getContext('2d').drawImage(c, x0 - pad, y0 - pad, o.width, o.height, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
$('bSign').onclick = async () => {
  const b = $('bSign');
  try {
    if (!$('clrAgree').checked) throw new Error('ضع علامة على الإقرار أولاً.');
    const sig = SIG_DIRTY && signaturePng();
    if (!sig) throw new Error('ارسم توقيعك داخل المربع.');
    busy(b, true); msg($('signMsg'), 'جارٍ توقيع المخالصة وحفظها...', 'info');
    const res = await api('clearanceSign', { token: SESSION.token, id: SIGN_ID, data: { agree: true, signature: sig, ua: navigator.userAgent.slice(0, 180) } });
    renderMine(res.requests);
    $('clrSignArea').classList.add('hide');
    msg($('signMsg'), 'تم توقيع المخالصة ✅ وصلتك نسخة منها على بريدك، وتجدها في «شهاداتي». ستصلك الشهادة بعد اعتمادها، أو الآن إن كانت معتمدة.', 'ok');
  } catch (e) { msg($('signMsg'), e.message, 'err'); }
  busy(b, false);
};

/* ---------- اختيار دورة أو أكثر ---------- */
const PICKED = new Set();
function renderCourses() {
  const item = c => '<label class="course-item"><input type="checkbox" value="' + esc(c.id) + '"' + (PICKED.has(c.id) ? ' checked' : '') + '><span>' + esc(c.nameAr) + '</span></label>';
  const shorts = COURSES.filter(c => c.type !== 'long'), longs = COURSES.filter(c => c.type === 'long');
  $('courseList').innerHTML = longs.length
    ? '<div class="course-group">الدورات القصيرة</div>' + shorts.map(item).join('') + '<div class="course-group">البرامج الطويلة</div>' + longs.map(item).join('')
    : shorts.map(item).join('');
  filterCourses(); updatePicked();
}
function filterCourses() {
  const q = $('courseSearch').value.trim();
  document.querySelectorAll('#courseList .course-item').forEach(el => el.classList.toggle('hide', !!q && el.textContent.indexOf(q) < 0));
}
function updatePicked() {
  const sel = COURSES.filter(c => PICKED.has(c.id));
  $('courseCount').textContent = sel.length ? 'اخترت ' + (sel.length === 1 ? 'دورة واحدة' : sel.length + ' دورات') : '';
  const ruled = sel.filter(c => c.minDays);
  $('courseRule').classList.toggle('hide', !ruled.length);
  if (ruled.length) $('courseRule').textContent = '⚠️ ' + ruled.map(c => '«' + c.nameAr + '»').join('، ') +
    ': يُشترط لإصدار الشهادة ألا تقل مدة الإتمام عن ' + ruled[0].minDays + ' أيام، ولا تُصدر إذا كانت أقل من ذلك.';
}
$('courseList').addEventListener('change', e => {
  if (!e.target.matches('input[type=checkbox]')) return;
  e.target.checked ? PICKED.add(e.target.value) : PICKED.delete(e.target.value);
  updatePicked();
});
$('courseSearch').addEventListener('input', filterCourses);
// الاسم الإنجليزي يُوحَّد فور الخروج من الخانة ليرى المتدرب الشكل النهائي
$('fNameEn').addEventListener('blur', () => { $('fNameEn').value = titleName($('fNameEn').value); });

const NAME_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/;
const NAME_AR_RE = /^[\u0600-\u06FF][\u0600-\u06FF\s]{1,79}$/;
$('bSubmit').onclick = async () => {
  const b = $('bSubmit');
  try {
    const v = id => $(id).value.replace(/\s+/g, ' ').trim();
    $('fNameEn').value = titleName($('fNameEn').value);
    const nameEn = v('fNameEn'), nameAr = v('fNameAr');
    if (!PICKED.size) throw new Error('اختر الدورة (أو الدورات) التي أتممتها.');
    if (!NAME_AR_RE.test(nameAr)) throw new Error('اكتب اسمك الثلاثي بالعربية.');
    if (!nameEn) throw new Error('اكتب اسمك بالإنجليزية كما تريده على الشهادة.');
    if (!NAME_RE.test(nameEn)) throw new Error('الاسم يُكتب بالحروف الإنجليزية فقط (مثال: Sara Ahmed Al-Harbi).');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('fPlatformEmail'))) throw new Error('اكتب البريد الإلكتروني المستخدم في المنصة.');
    if (!v('fCity')) throw new Error('اكتب المدينة.');
    const phone = $('fPhone').value.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{8,15}$/.test(phone)) throw new Error('اكتب رقم الجوال (أرقام فقط، مثال: 0501234567 أو +966501234567).');
    if (ANS.some(x => !x)) throw new Error('أكمل جميع أسئلة استبيان الرضا.');
    if (!v('fComment')) throw new Error('اكتب ملاحظاتك أو مقترحاتك في آخر الاستبيان.');
    if (!confirm('سيُطبع اسمك على الشهادة هكذا:\n\n' + nameEn + '\n\nهل الكتابة صحيحة؟')) return;
    busy(b, true); msg($('pMsg'), 'جارٍ إرسال الطلب...', 'info');
    const courseIds = COURSES.filter(c => PICKED.has(c.id)).map(c => c.id);
    let ids = [], requests = null, skipped = [];
    try {
      const res = await api('submitRequest', { token: SESSION.token, data: { courseIds: courseIds, nameEn: nameEn, nameAr: nameAr,
        platformEmail: v('fPlatformEmail'), city: v('fCity'), phone: phone, survey: ANS, comment: $('fComment').value } });
      ids = res.ids || [res.id]; requests = res.requests; skipped = res.skipped || [];
    } catch (err) {
      // انقطع الاتصال بعد وصول الطلب؟ نتحقق من «شهاداتي» قبل إظهار خطأ
      if (!/الاتصال|رد غير متوقع/.test(err.message)) throw err;
      const d = await api('getMyData', { token: SESSION.token }).catch(() => null);
      const names = COURSES.filter(c => PICKED.has(c.id)).map(c => c.nameAr);
      const got = d ? d.requests.filter(r => r.status === ST.PENDING && names.indexOf(r.course) >= 0) : [];
      if (!got.length) throw err;
      ids = got.map(r => r.id); requests = d.requests;
    }
    msg($('pMsg'), (ids.length > 1 ? 'وصل طلبك لـ ' + ids.length + ' شهادات' : 'وصل طلبك (رقم ' + ids[0] + ')') + '. تُصدر الشهادة خلال ' +
      document.querySelector('.issueDays').textContent + ' وتصلك على بريدك، وتجدها أيضاً في «شهاداتي».' +
      (skipped.length ? '\nلم يُضف: ' + skipped.map(x => x.course + ' (' + x.reason + ')').join('، ') : ''), 'ok');
    ['fNameEn', 'fNameAr', 'fPlatformEmail', 'fCity', 'fPhone', 'fComment', 'courseSearch'].forEach(i => $(i).value = '');
    PICKED.clear(); renderCourses();
    ANS = ANS.map(() => 0);
    document.querySelectorAll('.rate button').forEach(x => x.classList.remove('on'));
    if (requests) renderMine(requests);
  } catch (e) { msg($('pMsg'), e.message, 'err'); }
  busy(b, false);
};

/* ---------- التشغيل ---------- */
if (params.get('v')) {
  showVerify(params.get('v'));
} else {
  const auth = setupLogin({
    onLogin: (s, data) => { SESSION = s; showPortal(true); loadPortal(data); },
    onLogout: () => { SESSION = null; showPortal(false); },
  });
  if (auth.session.token) { SESSION = auth.session; showPortal(true); loadPortal(); } else showPortal(false);
}
