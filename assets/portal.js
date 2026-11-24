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
let SESSION, SURVEY = [], ANS = [], PROOF = null, MAXMB = 5, COURSES = [];

function showPortal(on) {
  $('vLogin').classList.toggle('hide', on);
  $('vPortal').classList.toggle('hide', !on);
}

document.querySelectorAll('#vPortal .tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#vPortal .tabs button').forEach(x => x.classList.toggle('on', x === b));
  ['pNew', 'pMine'].forEach(id => $(id).classList.toggle('hide', id !== b.dataset.t));
});

async function loadPortal() {
  try {
    const d = await api('getMyData', { token: SESSION.token });
    MAXMB = d.maxMb; SURVEY = d.survey; ANS = SURVEY.map(() => 0); COURSES = d.courses;
    document.querySelectorAll('.issueDays').forEach(e => e.textContent = d.issueDays);
    $('commentLabel').textContent = d.surveyComment;
    const opts = list => list.map(c => '<option value="' + esc(c.id) + '">' + esc(c.nameAr) + '</option>').join('');
    const shorts = d.courses.filter(c => c.type !== 'long'), longs = d.courses.filter(c => c.type === 'long');
    $('fCourse').innerHTML = '<option value="">— اختر الدورة أو البرنامج —</option>' +
      (longs.length ? '<optgroup label="الدورات القصيرة">' + opts(shorts) + '</optgroup><optgroup label="البرامج الطويلة">' + opts(longs) + '</optgroup>' : opts(shorts));
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

/* صورة الإتمام: تُصغّر قبل الرفع إن كانت كبيرة (لقطات الشاشة على الجوال ضخمة) */
function readProof(f) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return rej(new Error('الصورة يجب أن تكون PNG أو JPG.'));
    const rd = new FileReader();
    rd.onerror = () => rej(new Error('تعذّرت قراءة الصورة.'));
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('الملف ليس صورة صالحة.'));
      img.onload = () => {
        const MAX = 2000, big = Math.max(img.width, img.height) > MAX || f.size > 1.5 * 1024 * 1024;
        if (!big) return res({ type: f.type, data: rd.result.split(',')[1], url: rd.result });
        const k = Math.min(1, MAX / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL('image/jpeg', 0.88);
        res({ type: 'image/jpeg', data: url.split(',')[1], url: url });
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
}
async function takeFile(f) {
  if (!f) return;
  try {
    const p = await readProof(f);
    if (p.data.length * 0.75 > MAXMB * 1024 * 1024) throw new Error('حجم الصورة أكبر من ' + MAXMB + ' ميجابايت.');
    PROOF = { type: p.type, data: p.data };
    $('dropPrev').innerHTML = '<img alt="صورة الإتمام" src="' + p.url + '">';
    clearMsg($('pMsg'));
  } catch (e) { PROOF = null; $('dropPrev').innerHTML = ''; msg($('pMsg'), e.message, 'err'); }
}
$('fCourse').onchange = () => {
  const c = COURSES.filter(x => x.id === $('fCourse').value)[0];
  $('courseRule').classList.toggle('hide', !(c && c.minDays));
  if (c && c.minDays) $('courseRule').textContent = '⚠️ يُشترط لإصدار هذه الشهادة ألا تقل مدة الإتمام عن ' + c.minDays + ' أيام، ولا تُصدر إذا كانت أقل من ذلك.';
};
$('drop').onclick = () => $('fProof').click();
$('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fProof').click(); } };
$('drop').ondragover = e => { e.preventDefault(); $('drop').classList.add('over'); };
$('drop').ondragleave = () => $('drop').classList.remove('over');
$('drop').ondrop = e => { e.preventDefault(); $('drop').classList.remove('over'); takeFile(e.dataTransfer.files[0]); };
$('fProof').onchange = () => takeFile($('fProof').files[0]);

const NAME_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/;
const NAME_AR_RE = /^[\u0600-\u06FF][\u0600-\u06FF\s]{1,79}$/;
$('bSubmit').onclick = async () => {
  const b = $('bSubmit');
  try {
    const v = id => $(id).value.replace(/\s+/g, ' ').trim();
    const nameEn = v('fNameEn'), nameAr = v('fNameAr');
    if (!$('fCourse').value) throw new Error('اختر الدورة.');
    if (!NAME_AR_RE.test(nameAr)) throw new Error('اكتب اسمك الثلاثي بالعربية.');
    if (!nameEn) throw new Error('اكتب اسمك بالإنجليزية كما تريده على الشهادة.');
    if (!NAME_RE.test(nameEn)) throw new Error('الاسم يُكتب بالحروف الإنجليزية فقط (مثال: Sara Ahmed Al-Harbi).');
    if (!PROOF) throw new Error('ارفع صورة نسبة الإتمام من حسابك.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('fPlatformEmail'))) throw new Error('اكتب البريد الإلكتروني المستخدم في المنصة.');
    if (!v('fCity')) throw new Error('اكتب المدينة.');
    if (ANS.some(x => !x)) throw new Error('أكمل جميع أسئلة استبيان الرضا.');
    if (!v('fComment')) throw new Error('اكتب ملاحظاتك أو مقترحاتك في آخر الاستبيان.');
    if (!confirm('سيُطبع اسمك على الشهادة هكذا:\n\n' + nameEn + '\n\nهل الكتابة صحيحة؟')) return;
    busy(b, true); msg($('pMsg'), 'جارٍ إرسال الطلب...', 'info');
    const id = await api('submitRequest', { token: SESSION.token, data: { courseId: $('fCourse').value, nameEn: nameEn, nameAr: nameAr,
      platformEmail: v('fPlatformEmail'), city: v('fCity'), phone: $('fPhone').value, proof: PROOF, survey: ANS, comment: $('fComment').value } });
    msg($('pMsg'), 'وصل طلبك (رقم ' + id + '). تُصدر الشهادة خلال ' + document.querySelector('.issueDays').textContent +
      ' وتصلك على بريدك، وتجدها أيضاً في «شهاداتي».', 'ok');
    ['fNameEn', 'fNameAr', 'fPlatformEmail', 'fCity', 'fPhone', 'fComment'].forEach(i => $(i).value = ''); $('fCourse').value = ''; $('fCourse').onchange();
    PROOF = null; $('fProof').value = ''; $('dropPrev').innerHTML = ''; ANS = ANS.map(() => 0);
    document.querySelectorAll('.rate button').forEach(x => x.classList.remove('on'));
    const d = await api('getMyData', { token: SESSION.token }); renderMine(d.requests);
  } catch (e) { msg($('pMsg'), e.message, 'err'); }
  busy(b, false);
};

/* ---------- التشغيل ---------- */
if (params.get('v')) {
  showVerify(params.get('v'));
} else {
  const auth = setupLogin({
    onLogin: s => { SESSION = s; showPortal(true); loadPortal(); },
    onLogout: () => { SESSION = null; showPortal(false); },
  });
  if (auth.session.token) { SESSION = auth.session; showPortal(true); loadPortal(); } else showPortal(false);
}
