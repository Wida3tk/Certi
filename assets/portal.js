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
  $('mineList').innerHTML = '<div class="tablewrap"><table><tr><th>الدورة</th><th>تاريخ الطلب</th><th>الحالة</th><th></th></tr>' +
    list.map(r => '<tr><td>' + esc(r.course) + '</td><td>' + esc(r.date) + '</td><td>' + pill(r.status) +
      (r.note ? '<div class="hint">السبب: ' + esc(r.note) + '</div>' : '') + '</td><td>' +
      (r.status === ST.ISSUED ? '<button data-c="' + esc(r.certNo) + '" class="dl">تحميل الشهادة</button>' : '') + '</td></tr>').join('') + '</table></div>';
  document.querySelectorAll('.dl').forEach(b => b.onclick = async () => {
    busy(b, true);
    try { const f = await api('downloadMyCert', { token: SESSION.token, certNo: b.dataset.c }); downloadB64(f.name, f.data); }
    catch (e) { alert(e.message); }
    busy(b, false);
  });
}

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

const NAME_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/;
const NAME_AR_RE = /^[\u0600-\u06FF][\u0600-\u06FF\s]{1,79}$/;
$('bSubmit').onclick = async () => {
  const b = $('bSubmit');
  try {
    const v = id => $(id).value.replace(/\s+/g, ' ').trim();
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
