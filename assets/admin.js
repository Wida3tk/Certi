/* لوحة المراجعة — كل الصلاحيات يتحقق منها الخادم، والواجهة للعرض فقط */
let SESSION, ALL = [], FILTER = ST.PENDING, CUR = null, GEN = null;

function showAdmin(on) { $('vLogin').classList.toggle('hide', on); $('vAdmin').classList.toggle('hide', !on); }

document.querySelectorAll('#aTabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#aTabs button').forEach(x => x.classList.toggle('on', x === b));
  FILTER = b.dataset.f; renderList();
});
$('aSearch').oninput = () => renderList();
$('bRefresh').onclick = () => loadAdmin();

/* ---------- الاستيراد من Google Form ---------- */
$('bImportOpen').onclick = () => $('importBox').classList.toggle('hide');
$('bImpPreview').onclick = async () => {
  const b = $('bImpPreview'); busy(b, true); $('bImpGo').classList.add('hide'); $('impOut').innerHTML = '';
  try {
    const p = await api('adminImportPreview', { token: SESSION.token, url: $('impUrl').value.trim(), from: $('impFrom').value });
    $('impOut').innerHTML =
      '<p>التبويب: <b>' + esc(p.tab) + '</b> — الردود من التاريخ: <b>' + p.total + '</b> · جاهزة للاستيراد: <b>' + p.ready + '</b>' +
      (p.handled ? ' · عليها «الحالة» في الشيت (تُتخطّى): ' + p.handled : '') + (p.already ? ' · سبق استيرادها: ' + p.already : '') + (p.unmatched ? ' · <span style="color:var(--warn)">دورات غير مفعّلة أو غير معروفة: ' + p.unmatched + '</span>' : '') + '</p>' +
      '<div class="tablewrap"><table><tr><th>اسم الدورة في الفورم</th><th>الردود</th><th>الحالة في النظام</th></tr>' +
      p.courses.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + c.count + '</td><td>' +
        (c.courseId ? '<span class="pill p-ok">مفعّلة</span>' : c.inactive ? '<span class="pill p-wait">موجودة وغير مفعّلة</span>' : '<span class="pill p-no">غير معروفة</span>') + '</td></tr>').join('') +
      '</table></div>';
    $('bImpGo').classList.toggle('hide', !p.ready);
    if (p.ready) $('bImpGo').textContent = 'استيراد الطلبات (' + p.ready + ')';
  } catch (e) { $('impOut').innerHTML = '<div class="msg err" style="display:block">' + esc(e.message) + '</div>'; }
  busy(b, false);
};
$('bImpGo').onclick = async () => {
  const b = $('bImpGo'); busy(b, true);
  try { const m = await api('adminImport', { token: SESSION.token, url: $('impUrl').value.trim(), from: $('impFrom').value });
    $('impOut').innerHTML = '<div class="msg ok" style="display:block">' + esc(m) + '</div>'; b.classList.add('hide'); loadAdmin(); }
  catch (e) { $('impOut').innerHTML = '<div class="msg err" style="display:block">' + esc(e.message) + '</div>'; }
  busy(b, false);
};

async function loadAdmin() {
  $('aList').innerHTML = '<p class="hint">جارٍ التحميل...</p>';
  try { ALL = await api('adminList', { token: SESSION.token }); renderList(); }
  catch (e) {
    $('aList').innerHTML = '<div class="msg err">' + esc(e.message) + '</div>';
  }
}
function renderList() {
  const n = ALL.filter(r => r.status === ST.PENDING).length;
  $('cPending').textContent = n || ''; $('cPending').classList.toggle('hide', !n);
  const q = $('aSearch').value.trim().toLowerCase();
  const nc = ALL.filter(needsClr).length;
  $('cClr').textContent = nc || ''; $('cClr').classList.toggle('hide', !nc);
  const l = ALL.filter(r => (!FILTER || (FILTER === '__clr' ? needsClr(r) : r.status === FILTER)) &&
    (!q || [r.nameEn, r.nameAr, r.email, r.certNo, r.id, r.course].some(x => String(x || '').toLowerCase().includes(q))));
  $('aList').innerHTML = !l.length ? '<p class="hint">لا توجد طلبات.</p>' :
    '<table><tr><th>التاريخ</th><th>الاسم</th><th>الدورة</th><th>الحالة</th></tr>' +
    l.map(r => '<tr class="click" data-id="' + esc(r.id) + '"><td dir="ltr" style="text-align:right">' + esc(r.date) + '</td><td>' +
      esc(r.nameAr || '') + '<div dir="ltr" style="text-align:right">' + esc(r.nameEn) + '</div><div class="hint" dir="ltr" style="text-align:right">' + esc(r.email) + '</div></td><td>' + esc(r.course) +
      (r.type ? '<div class="hint">' + esc(r.type) + '</div>' : '') +
      (r.group ? '<div class="hint">🗂️ ضمن طلب مجمّع (' + ALL.filter(x => x.group === r.group).length + ')</div>' : '') + '</td><td>' + pill(r.status) +
      (r.clearance ? '<div class="hint">المخالصة: ' + esc(r.clearance) + '</div>' : '') +
      (r.certNo ? '<div class="hint" dir="ltr" style="text-align:right">' + esc(r.certNo) + '</div>' : '') + '</td></tr>').join('') + '</table>';
  document.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => openReq(tr.dataset.id));
}
$('bCloseD').onclick = () => { $('aDetail').classList.add('hide'); $('aListCard').classList.remove('hide'); $('aTabs').classList.remove('hide'); loadAdmin(); };

/* ---------- المخالصة المالية (للمحاسب والفريق) ---------- */
const needsClr = r => r.clearance && r.clearance !== CLR.SIGNED && [ST.REJECTED, ST.REVOKED].indexOf(r.status) < 0;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
function renderClr(r) {
  const box = $('dClr');
  if (!r.clearance) { box.classList.add('hide'); box.innerHTML = ''; return; }
  box.classList.remove('hide');
  const c = r.clearanceData || {};
  const head = '<b>المخالصة المالية</b> ' + pill(r.clearance) + (c.docId ? ' <span class="hint" dir="ltr">' + esc(c.docId) + '</span>' : '');
  if (r.clearance === CLR.SIGNED) {
    box.innerHTML = head + '<p class="hint" style="margin:6px 0">وقّعها المتدرب في ' + esc(r.clearanceSigned) + '.</p><button class="ghost" id="bClrDl">تحميل المخالصة الموقّعة</button>';
    $('bClrDl').onclick = async () => { const b = $('bClrDl'); busy(b, true);
      try { const f = await api('adminDownloadClearance', { token: SESSION.token, id: r.id }); downloadB64(f.name, f.data); } catch (e) { msg($('dMsg'), e.message, 'err'); } busy(b, false); };
    return;
  }
  if (r.clearance === CLR.SIGN) {
    box.innerHTML = head + '<p class="hint" style="margin:6px 0">أُرسلت للمتدرب ليوقّعها. البرنامج: ' + esc(c.program) + ' · الإجمالي: <span dir="ltr">' + esc(c.total) +
      '</span></p><button class="ghost" id="bClrResend">إعادة إرسال رابط التوقيع</button>';
    $('bClrResend').onclick = async () => { const b = $('bClrResend'); busy(b, true);
      try { msg($('dMsg'), await api('adminClearanceResend', { token: SESSION.token, id: r.id }), 'ok'); } catch (e) { msg($('dMsg'), e.message, 'err'); } busy(b, false); };
    return;
  }
  const v = (k, def) => esc(c[k] != null && c[k] !== '' ? c[k] : def || '');
  box.innerHTML = head +
    '<p class="hint" style="margin:6px 0 10px">أكملي بيانات المخالصة ثم اختاري النتيجة. عند «لا يوجد مبلغ» أو «تم السداد» تُرسل المخالصة للمتدرب ليوقّعها، وتُرسل شهادته تلقائياً بعد التوقيع إن كانت معتمدة.</p>' +
    '<div class="row"><div><label for="cProg">البرنامج / الخدمة</label><input id="cProg" value="' + v('program', r.course) + '"></div>' +
    '<div><label for="cHours">عدد الساعات</label><input id="cHours" value="' + v('hours') + '" placeholder="مثال: 72 ساعة"></div>' +
    '<div><label for="cTotal">الإجمالي</label><input id="cTotal" dir="ltr" value="' + v('total') + '" placeholder="SR 3957.15"></div></div>' +
    '<div class="row"><div><label for="cStart">تاريخ البدء</label><input id="cStart" type="date" value="' + v('start', r.start) + '"></div>' +
    '<div><label for="cClear">تاريخ الإخلاء</label><input id="cClear" type="date" value="' + v('clearDate', today()) + '"></div><div></div></div>' +
    '<div class="actions">' +
      (r.clearance === CLR.DUE ? '<button class="ok" data-o="paid">تم السداد — إصدار المخالصة للتوقيع</button>'
        : '<button class="ok" data-o="nodue">لا يوجد مبلغ مستحق — إصدار المخالصة للتوقيع</button><button class="ghost" data-o="due">يوجد مبلغ مستحق — بانتظار السداد</button>') +
    '</div>';
  box.querySelectorAll('[data-o]').forEach(b => b.onclick = async () => {
    const o = b.dataset.o;
    if (o !== 'due' && !confirm('ستُرسل المخالصة إلى ' + r.email + ' ليوقّعها. متابعة؟')) return;
    busy(b, true);
    try {
      const m = await api('adminClearance', { token: SESSION.token, id: r.id, data: { outcome: o, program: $('cProg').value, hours: $('cHours').value,
        total: $('cTotal').value, start: $('cStart').value, clearDate: $('cClear').value } });
      await refreshAndOpen(r.id); msg($('dMsg'), m, 'ok');
    } catch (e) { msg($('dMsg'), e.message, 'err'); }
    busy(b, false);
  });
}
/** طلب مجمّع: بقية الدورات التي طلبها المتدرب في النموذج نفسه */
function groupInfo(r) {
  if (!r.group) return '';
  const sib = ALL.filter(x => x.group === r.group && x.id !== r.id);
  if (!sib.length) return '';
  return '<div class="tag" style="margin-top:8px">ضمن طلب مجمّع (' + (sib.length + 1) + ' دورات). البقية: ' +
    sib.map(x => '<a href="#" data-open="' + esc(x.id) + '">' + esc(x.course) + '</a> ' + pill(x.status)).join('، ') + '</div>';
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-open]'); if (!a) return;
  e.preventDefault(); openReq(a.dataset.open);
});
function setSrc(id, text, none) { $(id).textContent = text; $(id).classList.toggle('none', !!none); }

function prefetchTpl() { loadTemplate($('dTpl').value).then(t => loadTemplateFonts(t.layout.fields || [])).catch(() => { }); }
$('dTpl').addEventListener('change', () => {
  prefetchTpl();
  if (GEN) { GEN = null; $('prev').innerHTML = ''; renderActs(); msg($('dMsg'), 'تغيّرت نسخة القالب — أعيدي التوليد.', 'info'); }
});
/** بعد أي إجراء: تحديث القائمة من الخادم ثم إعادة فتح الطلب بحالته الجديدة */
async function refreshAndOpen(id) {
  try { ALL = await api('adminList', { token: SESSION.token }); } catch (e) { }
  await openReq(id);
}
async function openReq(id) {
  $('aListCard').classList.add('hide'); $('aTabs').classList.add('hide'); $('aDetail').classList.remove('hide');
  $('dTitle').textContent = 'جارٍ التحميل...'; $('prev').innerHTML = ''; $('dActs').innerHTML = '';
  $('dRej').classList.add('hide'); $('dReason').value = ''; $('dPreset').value = ''; $('dInfo').innerHTML = '';
  clearMsg($('dMsg')); GEN = null; CUR = null;
  try {
    // الطلب موجود في القائمة المحمّلة: يُفتح فوراً بلا رحلة للخادم
    const r = CUR = Object.assign({}, ALL.find(x => x.id === id) || await api('adminGet', { token: SESSION.token, id: id }));
    // تحميل القالب والخطوط مسبقاً ليكون «توليد ومعاينة» أسرع
    // نسخة القالب: المحفوظة عند إصدار سابق، وإلا الأولى
    const tpls = r.templates && r.templates.length ? r.templates : [{ dir: r.courseId, label: '' }];
    $('dTpl').innerHTML = tpls.map(t => '<option value="' + esc(t.dir) + '">' + esc(t.label || t.dir) + '</option>').join('');
    $('dTpl').value = tpls.some(t => t.dir === r.template) ? r.template : tpls[0].dir;
    $('dTplBox').classList.toggle('hide', tpls.length < 2);
    if (r.status === ST.PENDING || r.status === ST.ISSUED || r.status === ST.HELD) prefetchTpl();
    $('dTitle').innerHTML = esc(r.nameAr || r.nameEn) + ' ' + pill(r.status);
    // الاسم يُعرض موحّداً (أول حرف كبير)، ويمكن تعديله يدوياً قبل التوليد
    $('dNameEn').value = titleName(r.nameEn || ''); $('dNameAr').value = r.nameAr || '';
    // التواريخ: البدء يُدخل يدوياً بعد التحقق من المنصة، والانتهاء افتراضياً تاريخ تقديم الطلب
    if (r.start) { $('dStart').value = r.start; setSrc('dStartSrc', 'محفوظ عند الإصدار السابق'); }
    else { $('dStart').value = ''; setSrc('dStartSrc', 'أدخليه بعد التحقق من المنصة', true); }
    if (r.end) { $('dEnd').value = r.end; setSrc('dEndSrc', 'محفوظ عند الإصدار السابق'); }
    else { $('dEnd').value = r.date; setSrc('dEndSrc', 'افتراضياً: تاريخ تقديم الطلب'); }
    const row = (k, v, ltr) => v ? '<div><span class="hint">' + k + ':</span> ' + (ltr ? '<span dir="ltr">' + esc(v) + '</span>' : esc(v)) + '</div>' : '';
    $('dInfo').innerHTML =
      row('الدورة', r.course) + (r.courseEn ? '<div dir="ltr" class="hint" style="text-align:right">' + esc(r.courseEn) + '</div>' : '') +
      row('النوع', r.type) + (r.minDays ? '<div class="tag none">شرط الإصدار: مدة إتمام ' + r.minDays + ' أيام على الأقل</div>' : '') +
      row('البريد', r.email, true) + row('بريد المنصة', r.platformEmail, true) + row('الجوال', r.phone, true) + row('المدينة', r.city) +
      row('رقم الطلب', r.id, true) + row('تاريخ الطلب', r.date, true) + row('رقم الشهادة', r.certNo, true) +
      row('آخر إجراء بواسطة', r.approvedBy, true) + row('ملاحظات', r.note) + groupInfo(r);
    renderClr(r);
    checkDays();
    const canGen = r.status === ST.PENDING || r.status === ST.ISSUED || r.status === ST.HELD;
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
    try { const t = await api('adminRevoke', { token: SESSION.token, id: CUR.id, reason: why }); await refreshAndOpen(CUR.id); msg($('dMsg'), t, 'ok'); }
    catch (e) { msg($('dMsg'), e.message, 'err'); }
  };
}
/** شرط الحد الأدنى لمدة الإتمام (يومي البدء والانتهاء محسوبان): يُعرض ويمنع التوليد. الخادم يتحقق أيضاً */
function daysInclusive(a, b) { const t = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); return Math.round((t(b) - t(a)) / 864e5) + 1; }
function checkDays() {
  const box = $('dDays'), a = $('dStart').value, b = $('dEnd').value;
  if (!CUR || !a || !b) { box.className = 'hide'; return true; }
  const n = daysInclusive(a, b);
  const bad = CUR.minDays && n < CUR.minDays;
  box.className = bad ? 'errbox' : 'tag';
  box.textContent = 'مدة الإتمام: ' + n + (n === 1 ? ' يوم' : ' أيام') + (bad ? ' — أقل من ' + CUR.minDays + ' أيام المشروطة لهذه الشهادة، لا يمكن إصدارها.' : '');
  return !bad;
}
['dStart', 'dEnd'].forEach(i => $(i).addEventListener('input', checkDays));
['dNameEn', 'dStart', 'dEnd'].forEach(i => $(i).addEventListener('input', () => {
  if (GEN) { GEN = null; $('prev').innerHTML = ''; renderActs(); msg($('dMsg'), 'تغيّرت البيانات — أعيدي التوليد.', 'info'); }
}));
$('dPreset').onchange = () => { if ($('dPreset').value) { $('dReason').value = $('dPreset').value; $('dReason').focus(); } };
$('bRejGo').onclick = async () => {
  const b = $('bRejGo'); busy(b, true);
  try { const t = await api('adminReject', { token: SESSION.token, id: CUR.id, reason: $('dReason').value }); await refreshAndOpen(CUR.id); msg($('dMsg'), t, 'ok'); }
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
    if (!checkDays()) throw new Error('مدة الإتمام أقل من المشروط لهذه الشهادة.');
    // يُحجز رقم الشهادة أولاً حتى يُطبع على الشهادة وفي رمز QR
    const num = await api('adminReserveNumber', { token: SESSION.token, id: CUR.id });
    CUR.certNo = num.certNo;
    const out = await generateCertificate($('dTpl').value, { nameEn: nameEn, course: CUR.course,
      start: $('dStart').value, end: $('dEnd').value, certNo: num.certNo, verifyUrl: num.verifyUrl });
    GEN = { certNo: num.certNo, pdf: out.pdfBase64, nameEn: nameEn, start: $('dStart').value, end: $('dEnd').value , template: $('dTpl').value };
    $('prev').innerHTML = ''; $('prev').appendChild(out.canvas);
    msg($('dMsg'), 'راجعي المعاينة. رقم الشهادة: ' + num.certNo + ' — رابط التحقق: ' + num.verifyUrl, 'info');
    renderActs();
  } catch (e) { msg($('dMsg'), e.message, 'err'); }
  busy(b, false);
};

async function approve(test) {
  if (!GEN) return;
  const held = CUR.clearance && CUR.clearance !== CLR.SIGNED;
  if (!test && !confirm(held ? 'ستُعتمد الشهادة ' + GEN.certNo + ' وتُحفظ، وتُرسل إلى ' + CUR.email + ' تلقائياً بعد توقيعه المخالصة المالية. متابعة؟'
    : 'سيتم إصدار الشهادة ' + GEN.certNo + ' وإرسالها إلى ' + CUR.email + '. متابعة؟')) return;
  document.querySelectorAll('#dActs button').forEach(x => x.disabled = true);
  msg($('dMsg'), test ? 'جارٍ الإرسال التجريبي...' : 'جارٍ الإصدار والإرسال...', 'info');
  try {
    const r = await api('adminApprove', { token: SESSION.token, data: { id: CUR.id, certNo: GEN.certNo, pdf: GEN.pdf, test: test,
      resend: CUR.status === ST.ISSUED, template: GEN.template, start: GEN.start, end: GEN.end, nameEn: GEN.nameEn } });
    msg($('dMsg'), r, 'ok');
    if (!test) { await refreshAndOpen(CUR.id); msg($('dMsg'), r, 'ok'); } else renderActs();
  } catch (e) { msg($('dMsg'), e.message, 'err'); renderActs(); }
}

/* ---------- دخول الإدارة: بريد + كلمة مرور ---------- */
const ATOK = 'slk_admin';
const aStore = {
  get() { try { return JSON.parse(localStorage.getItem(ATOK) || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(ATOK, JSON.stringify(v)); } catch (e) { } },
  del() { try { localStorage.removeItem(ATOK); } catch (e) { } },
};
function showForm(id) { ['fLogin', 'fForgot', 'fNewPass'].forEach(f => $(f).classList.toggle('hide', f !== id)); }
function signedIn(s) {
  SESSION = s; aStore.set(s);
  $('who').classList.remove('hide'); $('whoEmail').textContent = s.email;
  showAdmin(true); loadAdmin();
}
function signOut(note) {
  if (SESSION) api('adminLogout', { token: SESSION.token }).catch(() => { });
  SESSION = null; aStore.del();
  $('who').classList.add('hide'); showAdmin(false); showForm('fLogin');
  if (note) msg($('lMsg'), note, 'err'); else clearMsg($('lMsg'));
}
// أي رد «غير مصرّح» أثناء العمل = انتهت الجلسة
onSessionExpired = () => signOut('انتهت الجلسة. سجّلي الدخول من جديد.');
const _api = api;
api = async (action, body) => {
  try { return await _api(action, body); }
  catch (e) { if (SESSION && /غير مصرّح/.test(e.message) && !/^adminLogin|^adminSet|^adminReset/.test(action)) onSessionExpired(); throw e; }
};
$('logout').onclick = () => signOut();
$('fLogin').onsubmit = async e => {
  e.preventDefault(); const b = $('bLogin'); busy(b, true);
  try { signedIn(await api('adminLogin', { email: $('lEmail').value, password: $('lPass').value })); $('lPass').value = ''; clearMsg($('lMsg')); }
  catch (err) { msg($('lMsg'), err.message, 'err'); }
  busy(b, false);
};
$('bForgot').onclick = () => { $('rEmail').value = $('lEmail').value; showForm('fForgot'); clearMsg($('lMsg')); };
$('bBackLogin').onclick = () => { showForm('fLogin'); clearMsg($('lMsg')); };
$('fForgot').onsubmit = async e => {
  e.preventDefault(); const b = $('bSendReset'); busy(b, true);
  try { msg($('lMsg'), await api('adminResetRequest', { email: $('rEmail').value }), 'ok'); }
  catch (err) { msg($('lMsg'), err.message, 'err'); }
  busy(b, false);
};
const RESET = new URLSearchParams(location.search).get('reset');
$('fNewPass').onsubmit = async e => {
  e.preventDefault(); const b = $('bSetPass'); busy(b, true);
  try {
    if ($('nPass').value !== $('nPass2').value) throw new Error('كلمتا المرور غير متطابقتين.');
    const s = await api('adminSetPassword', { reset: RESET, password: $('nPass').value });
    history.replaceState(null, '', location.pathname); // إزالة الرابط من شريط العنوان
    $('nPass').value = $('nPass2').value = '';
    signedIn(s);
  } catch (err) { msg($('lMsg'), err.message, 'err'); }
  busy(b, false);
};

(async () => {
  if (RESET) { signOut(); showForm('fNewPass'); return; }
  const saved = aStore.get();
  if (!saved || !saved.token) { showAdmin(false); showForm('fLogin'); return; }
  try { await _api('adminMe', { token: saved.token }); signedIn(saved); }
  catch (e) { aStore.del(); showAdmin(false); showForm('fLogin'); }
})();
