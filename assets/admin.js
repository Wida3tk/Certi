/* لوحة المراجعة — كل الصلاحيات يتحقق منها الخادم، والواجهة للعرض فقط */
let SESSION, ALL = [], FILTER = ST.PENDING, CUR = null, GEN = null;

function showAdmin(on) { $('vLogin').classList.toggle('hide', on); $('vAdmin').classList.toggle('hide', !on); }

document.querySelectorAll('#aTabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#aTabs button').forEach(x => x.classList.toggle('on', x === b));
  FILTER = b.dataset.f; renderList();
});
$('aSearch').oninput = () => renderList();
$('bRefresh').onclick = () => loadAdmin();

async function loadAdmin() {
  $('aList').innerHTML = '<p class="hint">جارٍ التحميل...</p>';
  try { ALL = await api('adminList', { token: SESSION.token }); renderList(); }
  catch (e) {
    if (/غير مصرّح/.test(e.message)) { auth.logout(); msg($('lMsg'), 'هذا البريد غير مصرّح له بلوحة المراجعة.', 'err'); return; }
    $('aList').innerHTML = '<div class="msg err">' + esc(e.message) + '</div>';
  }
}
function renderList() {
  const n = ALL.filter(r => r.status === ST.PENDING).length;
  $('cPending').textContent = n || ''; $('cPending').classList.toggle('hide', !n);
  const q = $('aSearch').value.trim().toLowerCase();
  const l = ALL.filter(r => (!FILTER || r.status === FILTER) &&
    (!q || [r.nameEn, r.email, r.certNo, r.id, r.course].some(x => String(x || '').toLowerCase().includes(q))));
  $('aList').innerHTML = !l.length ? '<p class="hint">لا توجد طلبات.</p>' :
    '<table><tr><th>التاريخ</th><th>الاسم</th><th>الدورة</th><th>في العمليات</th><th>الحالة</th></tr>' +
    l.map(r => '<tr class="click" data-id="' + esc(r.id) + '"><td dir="ltr" style="text-align:right">' + esc(r.date) + '</td><td><span dir="ltr">' +
      esc(r.nameEn) + '</span><div class="hint" dir="ltr" style="text-align:right">' + esc(r.email) + '</div></td><td dir="ltr" style="text-align:right">' + esc(r.course) + '</td><td>' +
      (r.inOps === 'نعم' ? '✓ نعم' : r.inOps === 'لا' ? '✗ لا' : '⚠️ ' + esc(r.inOps)) + '</td><td>' + pill(r.status) +
      (r.certNo ? '<div class="hint" dir="ltr" style="text-align:right">' + esc(r.certNo) + '</div>' : '') + '</td></tr>').join('') + '</table>';
  document.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => openReq(tr.dataset.id));
}
$('bCloseD').onclick = () => { $('aDetail').classList.add('hide'); $('aListCard').classList.remove('hide'); $('aTabs').classList.remove('hide'); loadAdmin(); };

function opsBox(list, label) {
  list = list || [];
  return '<div class="src"><b>' + label + '</b><br>' + (!list.length ? 'غير موجود في نظام العمليات (غالباً مسجّل على عصارة فقط)' :
    list.map(o => o.error ? '⚠️ ' + esc(o.error) : 'البرنامج: <b>' + esc(o.program) + '</b> · التسجيل: <span dir="ltr">' + esc(o.registered || '—') +
      '</span> · التفعيل: <span dir="ltr">' + esc(o.activated || '—') + '</span>').join('<br>')) + '</div>';
}
function setSrc(id, text, none) { $(id).textContent = text; $(id).classList.toggle('none', !!none); }

async function openReq(id) {
  $('aListCard').classList.add('hide'); $('aTabs').classList.add('hide'); $('aDetail').classList.remove('hide');
  $('dTitle').textContent = 'جارٍ التحميل...'; $('prev').innerHTML = ''; $('dActs').innerHTML = '';
  $('dRej').classList.add('hide'); $('dReason').value = ''; $('dProof').innerHTML = ''; $('dOps').innerHTML = ''; $('dMeta').innerHTML = '';
  clearMsg($('dMsg')); GEN = null; CUR = null;
  try {
    const r = CUR = await api('adminGet', { token: SESSION.token, id: id });
    $('dTitle').innerHTML = '<span dir="ltr">' + esc(r.nameEn) + '</span> ' + pill(r.status);
    $('dProof').innerHTML = r.proof ? '<img alt="صورة الإتمام" id="proofImg" src="' + r.proof + '">' : '<p class="hint">لا توجد صورة.</p>';
    if ($('proofImg')) $('proofImg').onclick = () => { const w = window.open(); if (w) { w.document.title = 'صورة الإتمام'; const i = w.document.createElement('img'); i.src = r.proof; i.style.maxWidth = '100%'; w.document.body.appendChild(i); } };
    $('dOps').innerHTML = opsBox(r.ops, 'وقت تقديم الطلب') + opsBox(r.opsNow, 'الآن');
    $('dNameEn').value = r.nameEn || '';
    // اقتراح التواريخ مع ذكر مصدر كل قيمة
    const o = (r.opsNow || []).filter(x => !x.error && (x.activated || x.registered))[0] ||
              (r.ops || []).filter(x => !x.error && (x.activated || x.registered))[0];
    const fromNow = o && (r.opsNow || []).indexOf(o) >= 0;
    if (r.start) { $('dStart').value = r.start; setSrc('dStartSrc', 'المصدر: محفوظ عند الإصدار السابق'); }
    else if (o) {
      $('dStart').value = o.activated || o.registered;
      const many = ((fromNow ? r.opsNow : r.ops) || []).filter(x => !x.error).length > 1;
      setSrc('dStartSrc', 'المصدر: نظام العمليات (' + (fromNow ? 'الآن' : 'وقت الطلب') + ') — ' + (o.activated ? 'تاريخ التفعيل' : 'تاريخ التسجيل') +
        (many ? ' — له أكثر من برنامج، تأكدي من الصحيح' : ''), many);
    } else { $('dStart').value = ''; setSrc('dStartSrc', 'المصدر: لا يوجد — أدخليه يدوياً من عصارة', true); }
    if (r.end) { $('dEnd').value = r.end; setSrc('dEndSrc', 'المصدر: محفوظ عند الإصدار السابق'); }
    else { $('dEnd').value = r.date; setSrc('dEndSrc', 'المصدر: تاريخ تقديم الطلب (افتراضي)'); }
    $('dMeta').innerHTML = 'الدورة: <b dir="ltr">' + esc(r.course) + '</b><br>البريد: <span dir="ltr">' + esc(r.email) + '</span>' +
      (r.phone ? ' · الجوال: <span dir="ltr">' + esc(r.phone) + '</span>' : '') +
      '<br>رقم الطلب: <span dir="ltr">' + esc(r.id) + '</span> · تاريخ الطلب: ' + esc(r.date) +
      (r.certNo ? '<br>رقم الشهادة: <b dir="ltr">' + esc(r.certNo) + '</b>' : '') +
      (r.approvedBy ? '<br>آخر إجراء بواسطة: <span dir="ltr">' + esc(r.approvedBy) + '</span>' : '') +
      (r.note ? '<br>ملاحظات: ' + esc(r.note) : '');
    const canGen = r.status === ST.PENDING || r.status === ST.ISSUED;
    $('bGen').classList.toggle('hide', !canGen);
    ['dNameEn', 'dStart', 'dEnd'].forEach(i => $(i).disabled = !canGen);
    renderActs();
  } catch (e) { $('dTitle').textContent = 'تعذّر فتح الطلب'; msg($('dMsg'), e.message, 'err'); }
}

function renderActs() {
  if (!CUR) return;
  const s = CUR.status, a = [];
  if (GEN) {
    a.push('<button class="ghost" id="bTest">إرسال تجريبي لبريدي</button>');
    a.push('<button class="ok" id="bOk">' + (s === ST.ISSUED ? 'إعادة الإصدار والإرسال' : 'اعتماد وإرسال للمتدرب') + '</button>');
  }
  if (s === ST.PENDING) a.push('<button class="danger" id="bRej">رفض</button>');
  if (s === ST.ISSUED) a.push('<button class="danger" id="bRevoke">إلغاء الشهادة</button>');
  $('dActs').innerHTML = a.join('');
  if ($('bTest')) $('bTest').onclick = () => approve(true);
  if ($('bOk')) $('bOk').onclick = () => approve(false);
  if ($('bRej')) $('bRej').onclick = () => { $('dRej').classList.toggle('hide'); $('dReason').focus(); };
  if ($('bRevoke')) $('bRevoke').onclick = async () => {
    const why = prompt('سبب إلغاء الشهادة ' + CUR.certNo + ' (للسجل). بعد الإلغاء تظهر صفحة التحقق «ملغاة»:');
    if (why === null) return;
    try { const t = await api('adminRevoke', { token: SESSION.token, id: CUR.id, reason: why }); await openReq(CUR.id); msg($('dMsg'), t, 'ok'); }
    catch (e) { msg($('dMsg'), e.message, 'err'); }
  };
}
['dNameEn', 'dStart', 'dEnd'].forEach(i => $(i).addEventListener('input', () => {
  if (GEN) { GEN = null; $('prev').innerHTML = ''; renderActs(); msg($('dMsg'), 'تغيّرت البيانات — أعيدي التوليد.', 'info'); }
}));
$('bRejGo').onclick = async () => {
  const b = $('bRejGo'); busy(b, true);
  try { const t = await api('adminReject', { token: SESSION.token, id: CUR.id, reason: $('dReason').value }); await openReq(CUR.id); msg($('dMsg'), t, 'ok'); }
  catch (e) { msg($('dMsg'), e.message, 'err'); }
  busy(b, false);
};

$('bGen').onclick = async () => {
  const b = $('bGen'); busy(b, true); msg($('dMsg'), 'جارٍ توليد الشهادة...', 'info');
  try {
    const nameEn = $('dNameEn').value.replace(/\s+/g, ' ').trim();
    if (!nameEn) throw new Error('الاسم فارغ.');
    if (!$('dStart').value || !$('dEnd').value) throw new Error('حددي تاريخ البدء وتاريخ الانتهاء.');
    if ($('dStart').value > $('dEnd').value) throw new Error('تاريخ البدء بعد تاريخ الانتهاء!');
    // يُحجز رقم الشهادة أولاً حتى يُطبع على الشهادة وفي رمز QR
    const num = await api('adminReserveNumber', { token: SESSION.token, id: CUR.id });
    CUR.certNo = num.certNo;
    const out = await generateCertificate(CUR.courseId, { nameEn: nameEn, course: CUR.course,
      start: $('dStart').value, end: $('dEnd').value, certNo: num.certNo, verifyUrl: num.verifyUrl });
    GEN = { certNo: num.certNo, pdf: out.pdfBase64, nameEn: nameEn, start: $('dStart').value, end: $('dEnd').value };
    $('prev').innerHTML = ''; $('prev').appendChild(out.canvas);
    msg($('dMsg'), 'راجعي المعاينة. رقم الشهادة: ' + num.certNo + ' — رابط التحقق: ' + num.verifyUrl, 'info');
    renderActs();
  } catch (e) { msg($('dMsg'), e.message, 'err'); }
  busy(b, false);
};

async function approve(test) {
  if (!GEN) return;
  if (!test && !confirm('سيتم إصدار الشهادة ' + GEN.certNo + ' وإرسالها إلى ' + CUR.email + '. متابعة؟')) return;
  document.querySelectorAll('#dActs button').forEach(x => x.disabled = true);
  msg($('dMsg'), test ? 'جارٍ الإرسال التجريبي...' : 'جارٍ الإصدار والإرسال...', 'info');
  try {
    const r = await api('adminApprove', { token: SESSION.token, data: { id: CUR.id, certNo: GEN.certNo, pdf: GEN.pdf, test: test,
      resend: CUR.status === ST.ISSUED, start: GEN.start, end: GEN.end, nameEn: GEN.nameEn } });
    msg($('dMsg'), r, 'ok');
    if (!test) { await openReq(CUR.id); msg($('dMsg'), r, 'ok'); } else renderActs();
  } catch (e) { msg($('dMsg'), e.message, 'err'); renderActs(); }
}

const auth = setupLogin({
  adminOnly: true,
  onLogin: s => { SESSION = s; showAdmin(true); loadAdmin(); },
  onLogout: () => { SESSION = null; showAdmin(false); },
});
if (auth.session.token) { SESSION = auth.session; showAdmin(true); loadAdmin(); } else showAdmin(false);
