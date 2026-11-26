/* لوحة المراجعة — كل الصلاحيات يتحقق منها الخادم، والواجهة للعرض فقط */
let SESSION, ALL = [], FILTER = ST.PENDING, CUR = null, GEN = null;

function showAdmin(on) { $('vLogin').classList.toggle('hide', on); $('vAdmin').classList.toggle('hide', !on); }

document.querySelectorAll('#aTabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#aTabs button').forEach(x => x.classList.toggle('on', x === b));
  FILTER = b.dataset.f;
  const dash = FILTER === '__dash', sup = FILTER === '__sup';
  $('aListCard').classList.toggle('hide', dash || sup); $('aDash').classList.toggle('hide', !dash); $('aSup').classList.toggle('hide', !sup);
  if (dash) loadDash(); else if (!sup) renderList();
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
  const nn = ALL.filter(r => r.nameChange === NC.PAY).length;
  $('cNc').textContent = nn || ''; $('cNc').classList.toggle('hide', !nn);
  const l = ALL.filter(r => (!FILTER || (FILTER === '__clr' ? needsClr(r) : FILTER === '__nc' ? r.nameChange === NC.PAY : r.status === FILTER)) &&
    (!q || [r.nameEn, r.nameAr, r.email, r.certNo, r.id, r.course].some(x => String(x || '').toLowerCase().includes(q))));
  $('aList').innerHTML = !l.length ? '<p class="hint">لا توجد طلبات.</p>' :
    '<table><tr><th>التاريخ</th><th>الاسم</th><th>الدورة</th><th>الحالة</th></tr>' +
    l.map(r => '<tr class="click" data-id="' + esc(r.id) + '"><td dir="ltr" style="text-align:right">' + esc(r.date) + '</td><td>' +
      esc(r.nameAr || '') + '<div dir="ltr" style="text-align:right">' + esc(r.nameEn) + '</div><div class="hint" dir="ltr" style="text-align:right">' + esc(r.email) + '</div></td><td>' + esc(r.course) +
      (r.type ? '<div class="hint">' + esc(r.type) + '</div>' : '') +
      (r.group ? '<div class="hint">🗂️ ضمن طلب مجمّع (' + ALL.filter(x => x.group === r.group).length + ')</div>' : '') + '</td><td>' + pill(r.status) +
      (r.clearance ? '<div class="hint">المخالصة: ' + esc(r.clearance) + '</div>' : '') +
      (r.nameChange === NC.PAY ? '<div class="hint">✏️ تعديل الاسم: ' + esc(r.nameChange) + '</div>' : '') +
      (r.certNo ? '<div class="hint" dir="ltr" style="text-align:right">' + esc(r.certNo) + '</div>' : '') + '</td></tr>').join('') + '</table>';
  document.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => openReq(tr.dataset.id));
}
$('bCloseD').onclick = () => { $('aDetail').classList.add('hide'); $('aTabs').classList.remove('hide');
  if (FILTER === '__dash') { $('aDash').classList.remove('hide'); loadDash(); } else { $('aListCard').classList.remove('hide'); loadAdmin(); } };

/* ---------- تعديل الاسم بعد الإصدار (برسوم) ---------- */
function renderNc(r) {
  const box = $('dNc'), d = r.nameChangeData || {};
  if (!r.nameChange) { box.classList.add('hide'); box.innerHTML = ''; return; }
  box.classList.remove('hide');
  const names = '<div dir="ltr" style="text-align:right;margin:6px 0"><span class="hint">' + esc(d.oldNameEn || '') + '</span> ← <b>' + esc(d.nameEn || '') + '</b></div>';
  const head = '<b>طلب تعديل الاسم</b> ' + pill(r.nameChange);
  if (r.nameChange !== NC.PAY) {
    box.innerHTML = head + names + '<p class="hint" style="margin:0">' + (r.nameChange === NC.DONE
      ? 'أُعيد إصدار الشهادة بالاسم الجديد في ' + esc(d.doneAt || '') + (d.outcome === 'waived' ? ' (إعفاء من الرسوم)' : ' بعد السداد') + ' — ' + esc(d.by || '')
      : 'رُفض: ' + esc(d.reason || '') + ' — ' + esc(d.by || '')) + '</p>';
    return;
  }
  box.innerHTML = head + names +
    '<p class="hint" style="margin:0 0 10px">السبب: ' + esc(d.reason || '') + ' · طُلب في ' + esc(d.at || '') + '. بعد تأكيد السداد تُولَّد الشهادة بالاسم الجديد وتُرسل للمتدرب بنفس الرقم، وتعرض صفحة التحقق الاسم الجديد.</p>' +
    '<div class="actions"><button class="ok" data-nc="paid">تم السداد — إعادة الإصدار بالاسم الجديد</button><button class="ghost" data-nc="waived">إعفاء من الرسوم — إعادة الإصدار</button><button class="danger" data-nc="reject">رفض الطلب</button></div>' +
    '<div id="ncRej" class="hide"><label for="ncReason">سبب الرفض <span class="hint">(يصل للمتدرب)</span></label><textarea id="ncReason" placeholder="مثال: لم يتم سداد رسوم التعديل."></textarea>' +
    '<div class="actions"><button class="danger" id="bNcRejGo">تأكيد الرفض</button></div></div>';
  box.querySelectorAll('[data-nc]').forEach(b => b.onclick = async () => {
    const o = b.dataset.nc;
    if (o === 'reject') { $('ncRej').classList.toggle('hide'); $('ncReason').focus(); return; }
    if (!confirm('ستُعاد الشهادة ' + r.certNo + ' بالاسم «' + d.nameEn + '» وتُرسل إلى ' + r.email + (o === 'waived' ? ' (إعفاء من الرسوم)' : '') + '. متابعة؟')) return;
    box.querySelectorAll('button').forEach(x => x.disabled = true);
    try {
      $('dNameEn').value = d.nameEn;
      msg($('dMsg'), 'جارٍ توليد الشهادة بالاسم الجديد...', 'info');
      await genCert();
      msg($('dMsg'), 'جارٍ إعادة الإصدار والإرسال...', 'info');
      const m = await api('adminApprove', { token: SESSION.token, data: { id: r.id, certNo: GEN.certNo, pdf: GEN.pdf, resend: true, nameChange: o,
        template: GEN.template, start: GEN.start, end: GEN.end, nameEn: GEN.nameEn } });
      await refreshAndOpen(r.id); msg($('dMsg'), m, 'ok');
    } catch (e) { msg($('dMsg'), e.message, 'err'); box.querySelectorAll('button').forEach(x => x.disabled = false); }
  });
  $('bNcRejGo').onclick = async () => {
    const b = $('bNcRejGo'); busy(b, true);
    try { const m = await api('adminNameChangeReject', { token: SESSION.token, id: r.id, reason: $('ncReason').value }); await refreshAndOpen(r.id); msg($('dMsg'), m, 'ok'); }
    catch (e) { msg($('dMsg'), e.message, 'err'); }
    busy(b, false);
  };
}

/* ---------- المخالصة المالية (للمحاسب والفريق) ---------- */
const needsClr = r => r.clearance && r.clearance !== CLR.SIGNED && r.clearance !== CLR.NONE && [ST.REJECTED, ST.REVOKED].indexOf(r.status) < 0;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
function renderClr(r) {
  const box = $('dClr');
  const startBtn = '<button class="ghost" id="bClrStart">تحويل للمخالصة المالية</button>';
  const bindStart = () => { const b = $('bClrStart'); if (!b) return; b.onclick = async () => {
    if (!confirm('سيُحوَّل الطلب للمخالصة ويُبلَّغ المحاسب، ولن تُرسل الشهادة إلا بعد توقيع المتدرب المخالصة. متابعة؟')) return;
    busy(b, true);
    try { const m = await api('adminClearanceStart', { token: SESSION.token, id: r.id }); await refreshAndOpen(r.id); msg($('dMsg'), m, 'ok'); }
    catch (e) { msg($('dMsg'), e.message, 'err'); }
    busy(b, false); }; };
  if (!r.clearance) {
    // برنامج طويل بلا مخالصة تلقائية (مثل OBM-P): التحويل اختياري لكل طلب
    if (r.canStartClr && r.type === 'برنامج طويل') {
      box.classList.remove('hide');
      box.innerHTML = '<b>المخالصة المالية</b><p class="hint" style="margin:6px 0">هذا البرنامج لا يحتاج مخالصة لكل المتدربين. إن كان هذا المتدرب يحتاجها حوّليه للمحاسب.</p>' + startBtn;
      bindStart();
    } else { box.classList.add('hide'); box.innerHTML = ''; }
    return;
  }
  box.classList.remove('hide');
  const c = r.clearanceData || {};
  const head = '<b>المخالصة المالية</b> ' + pill(r.clearance) + (c.docId ? ' <span class="hint" dir="ltr">' + esc(c.docId) + '</span>' : '');
  if (r.clearance === CLR.SIGNED) {
    box.innerHTML = head + '<p class="hint" style="margin:6px 0">وقّعها المتدرب في ' + esc(r.clearanceSigned) + '.</p><button class="ghost" id="bClrDl">تحميل المخالصة الموقّعة</button>';
    $('bClrDl').onclick = async () => { const b = $('bClrDl'); busy(b, true);
      try { const f = await api('adminDownloadClearance', { token: SESSION.token, id: r.id }); downloadB64(f.name, f.data); } catch (e) { msg($('dMsg'), e.message, 'err'); } busy(b, false); };
    return;
  }
  if (r.clearance === CLR.NONE) {
    box.innerHTML = head + '<p class="hint" style="margin:6px 0">سُجّل أن هذا المتدرب لا يحتاج مخالصة، فتُرسل شهادته مباشرة عند اعتمادها.</p>' + (r.canStartClr ? startBtn : '');
    bindStart();
    return;
  }
  if (r.clearance === CLR.SIGN) {
    box.innerHTML = head + '<p class="hint" style="margin:6px 0">أُرسلت للمتدرب ليوقّعها. البرنامج: ' + esc(c.program) + ' · الإجمالي: <span dir="ltr">' + esc(c.total) +
      '</span></p><div class="actions" style="margin-top:0"><button class="ghost" id="bClrResend">إعادة إرسال رابط التوقيع</button><button class="ghost" id="bClrPrev">معاينة المخالصة (PDF)</button></div>';
    $('bClrPrev').onclick = async () => { const b = $('bClrPrev'); busy(b, true);
      try { const f = await api('adminClearancePreview', { token: SESSION.token, id: r.id }); downloadB64(f.name, f.data); } catch (e) { msg($('dMsg'), e.message, 'err'); } busy(b, false); };
    $('bClrResend').onclick = async () => { const b = $('bClrResend'); busy(b, true);
      try { msg($('dMsg'), await api('adminClearanceResend', { token: SESSION.token, id: r.id }), 'ok'); } catch (e) { msg($('dMsg'), e.message, 'err'); } busy(b, false); };
    return;
  }
  const v = (k, def) => esc(c[k] != null && c[k] !== '' ? c[k] : def || '');
  box.innerHTML = head +
    '<p class="hint" style="margin:6px 0 10px">أكملي بيانات المخالصة ثم اختاري النتيجة. عند «لا يوجد مبلغ» أو «تم السداد» تُرسل المخالصة للمتدرب ليوقّعها، وتُرسل شهادته تلقائياً بعد التوقيع إن كانت معتمدة.</p>' +
    '<div class="row"><div><label for="cProg">البرنامج / الخدمة</label><input id="cProg" value="' + v('program', r.course) + '"></div>' +
    '<div><label for="cHours">عدد المواد</label><input id="cHours" value="' + v('hours') + '" placeholder="مثال: 6 مواد"></div>' +
    '<div><label for="cTotal">الإجمالي</label><input id="cTotal" dir="ltr" value="' + v('total') + '" placeholder="SR 3957.15"></div></div>' +
    '<div class="row"><div><label for="cStart">تاريخ البدء</label><input id="cStart" type="date" value="' + v('start', r.start) + '"></div>' +
    '<div><label for="cClear">تاريخ الإخلاء</label><input id="cClear" type="date" value="' + v('clearDate', today()) + '"></div><div></div></div>' +
    '<div class="actions">' +
      (r.clearance === CLR.DUE ? '<button class="ok" data-o="paid">تم السداد — إصدار المخالصة للتوقيع</button>'
        : '<button class="ok" data-o="nodue">لا يوجد مبلغ مستحق — إصدار المخالصة للتوقيع</button><button class="ghost" data-o="due">يوجد مبلغ مستحق — بانتظار السداد</button>') +
    '</div><div class="actions" style="margin-top:6px"><button class="ghost" data-o="none" title="مثلاً: متدرب دفع المبلغ كاملاً من البداية">لا يحتاج مخالصة (مدفوع بالكامل مسبقاً)</button></div>';
  box.querySelectorAll('[data-o]').forEach(b => b.onclick = async () => {
    const o = b.dataset.o;
    if (o === 'none' && !confirm('سيُسجَّل أن المتدرب لا يحتاج مخالصة' + (r.status === ST.HELD ? '، وتُرسل شهادته المعتمدة إليه الآن' : '') + '. متابعة؟')) return;
    if ((o === 'nodue' || o === 'paid') && !confirm('ستُرسل المخالصة إلى ' + r.email + ' ليوقّعها. متابعة؟')) return;
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
  $('aListCard').classList.add('hide'); $('aDash').classList.add('hide'); $('aSup').classList.add('hide'); $('aTabs').classList.add('hide'); $('aDetail').classList.remove('hide');
  $('dTitle').textContent = 'جارٍ التحميل...'; $('prev').innerHTML = ''; $('dActs').innerHTML = '';
  $('dRej').classList.add('hide'); $('dReason').value = ''; $('dPreset').value = ''; $('dInfo').innerHTML = '';
  clearMsg($('dMsg')); GEN = null; CUR = null;
  try {
    // الطلب موجود في القائمة المحمّلة: يُفتح فوراً بلا رحلة للخادم
    const r = CUR = Object.assign({}, ALL.find(x => x.id === id) || await api('adminGet', { token: SESSION.token, id: id }));
    // تحميل القالب والخطوط مسبقاً ليكون «توليد ومعاينة» أسرع
    // نسخة القالب: المحفوظة عند إصدار سابق، وإلا الأولى
    const noTpl = Array.isArray(r.templates) && !r.templates.length; // شهادة بلا قالب بعد: الطلب والمخالصة يمشيان، والإصدار مؤجّل
    const tpls = noTpl ? [] : r.templates && r.templates.length ? r.templates : [{ dir: r.courseId, label: '' }];
    $('dTpl').innerHTML = tpls.map(t => '<option value="' + esc(t.dir) + '">' + esc(t.label || t.dir) + '</option>').join('');
    if (tpls.length) $('dTpl').value = tpls.some(t => t.dir === r.template) ? r.template : tpls[0].dir;
    $('dTplBox').classList.toggle('hide', tpls.length < 2);
    $('dNoTpl').classList.toggle('hide', !noTpl);
    if (!noTpl && (r.status === ST.PENDING || r.status === ST.ISSUED || r.status === ST.HELD)) prefetchTpl();
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
    renderClr(r); renderNc(r);
    checkDays();
    const canGen = !noTpl && !r.sup && (r.status === ST.PENDING || r.status === ST.ISSUED || r.status === ST.HELD);
    $('dNoTpl').classList.toggle('hide', !noTpl && !r.sup);
    $('dNoTpl').textContent = r.sup ? 'شهادة إشراف صدرت من تبويب «شهادات الإشراف». لإعادتها بتعديل، ألغيها ثم أصدري واحدة جديدة.' : 'لا يوجد قالب لهذه الشهادة بعد. الطلب والمخالصة يمشيان كالمعتاد، والإصدار بعد إضافة القالب.';
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

/** توليد الشهادة في المتصفح بالبيانات الحالية في النموذج (يحجز الرقم أولاً) */
async function genCert() {
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
    return num;
}
$('bGen').onclick = async () => {
  const b = $('bGen'); busy(b, true); msg($('dMsg'), 'جارٍ توليد الشهادة...', 'info');
  try {
    const num = await genCert();
    msg($('dMsg'), 'راجعي المعاينة. رقم الشهادة: ' + num.certNo + ' — رابط التحقق: ' + num.verifyUrl, 'info');
    renderActs();
  } catch (e) { msg($('dMsg'), e.message, 'err'); }
  busy(b, false);
};

async function approve(test) {
  if (!GEN) return;
  const held = CUR.clearance && CUR.clearance !== CLR.SIGNED && CUR.clearance !== CLR.NONE;
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

/* ---------- لوحة المتابعة ---------- */
const DASH_C = { req: '#D97706', issued: '#0C40FB' }; // سلسلتان (مُتحقق منهما لعمى الألوان)
const fmtN = n => n == null ? '—' : String(n);
function tile(label, value, sub, warn) {
  return '<div class="kpi' + (warn ? ' kpi-warn' : '') + '"><div class="kpi-l">' + label + '</div><div class="kpi-v">' + value + '</div>' + (sub ? '<div class="kpi-s">' + sub + '</div>' : '') + '</div>';
}
async function loadDash() {
  const el = $('aDash');
  if (!el.innerHTML) el.innerHTML = '<div class="card"><p class="hint">جارٍ تحميل المتابعة...</p></div>';
  try { renderDash(await api('adminStats', { token: SESSION.token })); }
  catch (e) { el.innerHTML = '<div class="card"><div class="msg err" style="display:block">' + esc(e.message) + '</div></div>'; }
}
function renderDash(d) {
  const S = d.byStatus || {};
  const diff = d.issuedMonth - d.issuedPrev;
  const tiles = '<div class="kpis">' +
    tile('بانتظار المراجعة', fmtN(S[ST.PENDING]), d.overdueCount ? '⚠️ ' + d.overdueCount + ' تجاوزت 3 أيام عمل' : 'لا متأخر', d.overdueCount > 0) +
    tile('مخالصات معلّقة', fmtN(d.clearancePending), 'بانتظار المالية أو السداد أو التوقيع') +
    tile('طلبات تعديل الاسم', fmtN(d.nameChangePending), 'بانتظار تأكيد السداد', d.nameChangePending > 0) +
    tile('صدرت هذا الشهر', fmtN(d.issuedMonth), 'الشهر الماضي: ' + d.issuedPrev + (d.issuedPrev || d.issuedMonth ? (diff >= 0 ? ' (+' + diff + ')' : ' (' + diff + ')') : '')) +
    tile('طلبات جديدة', fmtN(d.new7), 'آخر 7 أيام · اليوم: ' + d.newToday + ' · هذا الشهر: ' + d.newMonth) +
    tile('متوسط مدة الإصدار', d.avgDays == null ? '—' : d.avgDays + ' <small>يوم عمل</small>',
      d.within3 == null ? 'لا شهادات بعد' : d.within3 + '% خلال 3 أيام عمل (آخر 90 يوماً، ' + d.sample + ' شهادة)') +
    '</div>';

  // الطلبات مقابل الإصدار أسبوعياً
  const W = d.weeks || [], max = Math.max(1, ...W.map(w => Math.max(w.req, w.issued)));
  const md = s => s.slice(8, 10) + '/' + s.slice(5, 7);
  const weekChart = '<div class="card"><h3>الطلبات والإصدار أسبوعياً <span class="hint">(آخر 8 أسابيع)</span></h3>' +
    '<div class="legend"><span><i style="background:' + DASH_C.req + '"></i>طلبات جديدة</span><span><i style="background:' + DASH_C.issued + '"></i>شهادات صدرت</span></div>' +
    '<div class="wchart" role="img" aria-label="الطلبات والشهادات الصادرة لكل أسبوع">' + W.map(w =>
      '<div class="wcol" title="' + md(w.start) + ' – ' + md(w.end) + '\nطلبات جديدة: ' + w.req + '\nشهادات صدرت: ' + w.issued + '">' +
        '<div class="wbars"><div class="wbar" style="height:' + (w.req / max * 100) + '%;background:' + DASH_C.req + '"><span>' + (w.req || '') + '</span></div>' +
        '<div class="wbar" style="height:' + (w.issued / max * 100) + '%;background:' + DASH_C.issued + '"><span>' + (w.issued || '') + '</span></div></div>' +
        '<div class="wlab" dir="ltr">' + md(w.start) + '</div></div>').join('') + '</div></div>';

  const overdue = '<div class="card"><h3>طلبات متأخرة <span class="hint">(تجاوزت 3 أيام عمل بانتظار المراجعة)</span></h3>' +
    (!d.overdue.length ? '<p class="hint">لا توجد طلبات متأخرة. 👏</p>' :
      '<div class="tablewrap"><table><tr><th>تاريخ الطلب</th><th>المتدرب</th><th>الدورة</th><th>أيام العمل</th></tr>' +
      d.overdue.map(o => '<tr class="click" data-open="' + esc(o.id) + '"><td dir="ltr" style="text-align:right">' + esc(o.date) + '</td><td>' + esc(o.name) + '</td><td>' + esc(o.course) +
        (o.clearance ? '<div class="hint">المخالصة: ' + esc(o.clearance) + '</div>' : '') + '</td><td><span class="pill p-wait">' + o.age + '</span></td></tr>').join('') +
      '</table></div>' + (d.overdueCount > d.overdue.length ? '<p class="hint">يُعرض أقدم ' + d.overdue.length + ' من ' + d.overdueCount + '.</p>' : '')) + '</div>';

  const cmax = Math.max(1, ...d.courses.map(c => c.req));
  const courses = '<div class="card"><h3>الدورات الأكثر طلباً</h3>' + (!d.courses.length ? '<p class="hint">لا طلبات بعد.</p>' :
    d.courses.map(c => '<div class="hrow" title="طلبات: ' + c.req + ' · صدرت: ' + c.issued + '"><div class="hname">' + esc(c.name) + '</div>' +
      '<div class="htrack"><div class="hbar" style="width:' + (c.req / cmax * 100) + '%"></div></div><div class="hval">' + c.req + ' <span class="hint">(' + c.issued + ' صدرت)</span></div></div>').join('')) + '</div>';

  const team = '<div class="card"><h3>إنجاز الفريق هذا الشهر</h3>' + (!d.reviewers.length ? '<p class="hint">لم تصدر شهادات هذا الشهر بعد.</p>' :
    '<table>' + d.reviewers.map(x => '<tr><td dir="ltr" style="text-align:right">' + esc(x.by) + '</td><td><b>' + x.n + '</b> شهادة</td></tr>').join('') + '</table>') + '</div>';

  const sv = d.survey || {};
  const survey = '<div class="card"><h3>رضا المتدربين <span class="hint">(' + (sv.count || 0) + ' رداً)</span></h3>' +
    (!sv.count ? '<p class="hint">لا ردود بعد.</p>' :
      '<div class="kpis kpis-2">' + tile('متوسط التقييم', sv.avg5 == null ? '—' : sv.avg5 + ' <small>من 5</small>', 'متوسط أسئلة التقييم العشرة') +
        tile('صافي نقاط الترويج (NPS)', sv.nps == null ? '—' : (sv.nps > 0 ? '+' : '') + sv.nps, 'من −100 إلى +100: الموصون (9–10) ناقص غير الراضين (6 فأقل)') + '</div>' +
      sv.questions.filter(q => q.max === 5).map(q => '<div class="hrow"><div class="hname">' + esc(q.q) + '</div>' +
        '<div class="htrack"><div class="hbar" style="width:' + ((q.avg || 0) / 5 * 100) + '%"></div></div><div class="hval">' + (q.avg == null ? '—' : q.avg.toFixed(2)) + '</div></div>').join('')) + '</div>';

  const act = '<div class="card act"><h3>سجل النشاط <span class="hint">(آخر الإجراءات)</span></h3>' + (!d.activity.length ? '<p class="hint">لا يوجد نشاط مسجّل بعد. يبدأ التسجيل من هذا التحديث.</p>' :
    '<div class="tablewrap"><table><tr><th>الوقت</th><th>بواسطة</th><th>الإجراء</th><th>التفاصيل</th></tr>' +
    d.activity.map(a => '<tr' + (a.id ? ' class="click" data-open="' + esc(a.id) + '"' : '') + '><td dir="ltr" style="text-align:right;white-space:nowrap">' + esc(a.at) + '</td><td dir="ltr" style="text-align:right">' + esc(String(a.by).replace(/@sulukera\.com$/, '')) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>').join('') +
    '</table></div>') + '</div>';

  $('aDash').innerHTML = '<div class="dash-head"><span class="hint">آخر تحديث: ' + esc(d.generated) + ' · إجمالي الطلبات: ' + d.total + '</span><button class="ghost" id="bDashRef">تحديث</button></div>' +
    tiles + weekChart + '<div class="grid2 dash-grid">' + overdue + courses + '</div><div class="grid2 dash-grid">' + survey + team + '</div>' + act;
  $('bDashRef').onclick = () => { const b = $('bDashRef'); busy(b, true); loadDash().finally(() => busy(b, false)); };
}

/* ---------- شهادات الإشراف: إصدار مباشر بلا طلب ---------- */
const SUP_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let ABA = null;
async function supKindChanged() {
  const aba = (document.querySelector('input[name="supKind"]:checked') || {}).value === 'aba';
  $('supAbaBox').classList.toggle('hide', !aba); $('supTitleBox').classList.toggle('hide', aba); $('supCeusBox').classList.toggle('hide', aba);
  $('supStartL').textContent = aba ? 'تاريخ البدء' : 'التاريخ';
  $('supEndL').innerHTML = aba ? 'تاريخ الإتمام' : 'إلى تاريخ <span class="hint">(اختياري، لأكثر من يوم)</span>';
  $('supPrev').innerHTML = '';
  if (aba && !ABA) {
    try { ABA = (await api('adminCourses', { token: SESSION.token })).filter(c => c.category === 'aba'); } catch (e) { msg($('supMsg'), e.message, 'err'); return; }
    $('supProg').innerHTML = ABA.map(c => (c.templates.length ? c.templates : [{ dir: '', label: '' }]).map(t =>
      '<option value="' + esc(c.id) + '|' + esc(t.dir) + '">' + esc(c.nameAr) + (t.label ? ' — ' + esc(t.label) : '') + (t.dir ? '' : ' (لا يوجد قالب بعد)') + '</option>').join('')).join('');
    abaNote();
  }
}
function abaNote() {
  const tpl = ($('supProg').value || '').split('|')[1];
  $('supProgNote').classList.toggle('hide', !!tpl);
  $('supProgNote').textContent = 'لا يوجد قالب لهذه الشهادة بعد، فلا يمكن إصدارها الآن. تتفعّل تلقائياً عند إضافة القالب.';
  $('bSupGo').disabled = !tpl; $('bSupPrev').disabled = !tpl;
}
document.querySelectorAll('input[name="supKind"]').forEach(r => r.onchange = () => { $('bSupGo').disabled = false; $('bSupPrev').disabled = false; supKindChanged(); });
$('supProg').onchange = abaNote;
function supForm() {
  const kind = (document.querySelector('input[name="supKind"]:checked') || {}).value;
  if (kind === 'aba') {
    const [courseId, template] = ($('supProg').value || '').split('|'), start = $('supStart').value, end = $('supEnd').value;
    if (!template) throw new Error('لا يوجد قالب لهذه الشهادة بعد.');
    if (!start || !end) throw new Error('حددي تاريخ البدء وتاريخ الإتمام.');
    if (start > end) throw new Error('تاريخ البدء بعد تاريخ الإتمام.');
    const c = ABA.find(x => x.id === courseId);
    return { kind, courseId, template, start, end, title: c.nameAr };
  }
  const title = $('supTitle').value.replace(/\s+/g, ' ').trim(), start = $('supStart').value, end = $('supEnd').value, ceus = $('supCeus').value.trim();
  if (!title) throw new Error('اكتبي عنوان الشهادة.');
  if (/[؀-ۿ]/.test(title)) throw new Error('عنوان الشهادة يُكتب بالإنجليزية كما يُطبع.');
  if (!start) throw new Error('حددي التاريخ.');
  if (end && end < start) throw new Error('«إلى تاريخ» قبل التاريخ.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(ceus)) throw new Error('اكتبي الساعات رقماً، مثل 0.5.');
  const f = iso => iso.slice(8, 10) + ' ' + SUP_M[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4);
  const held = (end && end !== start ? 'Held From ' + f(start) + ' to ' + f(end) : 'Held on ' + f(start)) + ' | ' + ceus + ' Learning CEUs';
  return { kind, title, start, end: end && end !== start ? end : '', ceus, held };
}
function supPeople() {
  const ok = [], bad = [];
  $('supList').value.split(/\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
    const m = l.match(/[^\s,;\t<>]+@[^\s,;\t<>]+\.[^\s,;\t<>]+/);
    const name = titleName(l.replace(m ? m[0] : '', '').replace(/[<>]/g, '').replace(/[,;\t]+/g, ' ').replace(/\s+/g, ' ').trim());
    if (!m || !/^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'\-]{1,79}$/.test(name)) bad.push(l); else ok.push({ nameEn: name, email: m[0].toLowerCase() });
  });
  return { ok, bad };
}
$('supList').oninput = () => {
  const p = supPeople();
  $('supParsed').innerHTML = !p.ok.length && !p.bad.length ? '' : 'جاهز: <b>' + p.ok.length + '</b>' +
    (p.bad.length ? ' · <span style="color:var(--err)">أسطر غير صحيحة (اسم إنجليزي + بريد): ' + p.bad.map(esc).join('، ') + '</span>' : '');
  $('bSupGo').textContent = 'إصدار وإرسال' + (p.ok.length ? ' (' + p.ok.length + ')' : '');
};
$('bSupPrev').onclick = async () => {
  const b = $('bSupPrev'); busy(b, true); clearMsg($('supMsg'));
  try {
    const c = supForm(), p = supPeople();
    const out = await generateCertificate(c.kind === 'aba' ? c.template : 'sup-' + c.kind, { nameEn: (p.ok[0] || {}).nameEn || 'Recipient Name', title: c.title, held: c.held,
      course: c.title, start: c.start, end: c.end,
      certNo: 'SLK-0000-000000', verifyUrl: location.origin + '/?v=SLK-0000-000000' });
    $('supPrev').innerHTML = '<p class="hint">معاينة (الرقم ورمز QR الحقيقيان يُضافان عند الإصدار):</p>'; $('supPrev').appendChild(out.canvas);
  } catch (e) { msg($('supMsg'), e.message, 'err'); }
  busy(b, false);
};
$('bSupGo').onclick = async () => {
  const b = $('bSupGo'); clearMsg($('supMsg'));
  let c, p;
  try { c = supForm(); p = supPeople(); if (!p.ok.length) throw new Error('أضيفي مستلماً واحداً على الأقل (الاسم بالإنجليزية، البريد).');
    if (p.bad.length) throw new Error('صحّحي الأسطر غير الصحيحة أو احذفيها أولاً.'); }
  catch (e) { msg($('supMsg'), e.message, 'err'); return; }
  if (!confirm('ستُصدر ' + p.ok.length + ' شهادة «' + c.title + '» وتُرسل لكل مستلم على بريده. متابعة؟')) return;
  busy(b, true); $('bSupPrev').disabled = true;
  $('supOut').innerHTML = '<table><tr><th>الاسم</th><th>البريد</th><th>النتيجة</th></tr>' + p.ok.map((x, i) =>
    '<tr><td dir="ltr" style="text-align:right">' + esc(x.nameEn) + '</td><td dir="ltr" style="text-align:right">' + esc(x.email) + '</td><td id="supR' + i + '" class="hint">بالانتظار</td></tr>').join('') + '</table>';
  let done = 0;
  for (let i = 0; i < p.ok.length; i++) {
    const cell = $('supR' + i); cell.textContent = 'جارٍ الإصدار...';
    try {
      const r = await api(c.kind === 'aba' ? 'adminDirectReserve' : 'adminSupReserve', { token: SESSION.token, data: Object.assign({}, c, p.ok[i]) });
      const out = await generateCertificate(r.template, { nameEn: r.nameEn, title: r.title, held: r.held, course: r.course, start: r.start, end: r.end,
        certNo: r.certNo, verifyUrl: r.verifyUrl });
      await api('adminSupSend', { token: SESSION.token, data: { id: r.id, certNo: r.certNo, pdf: out.pdfBase64 } });
      cell.innerHTML = '<span class="pill p-ok">صدرت وأُرسلت</span> <span dir="ltr" class="hint">' + esc(r.certNo) + '</span>'; done++;
    } catch (e) { cell.innerHTML = '<span class="pill p-no">تعذّر</span> ' + esc(e.message); }
  }
  msg($('supMsg'), 'صدرت ' + done + ' من ' + p.ok.length + ' شهادة.' + (done < p.ok.length ? ' أعيدي إصدار من تعذّر بعد التصحيح.' : ''), done === p.ok.length ? 'ok' : 'err');
  if (done === p.ok.length) { $('supList').value = ''; $('supParsed').innerHTML = ''; $('bSupGo').textContent = 'إصدار وإرسال'; }
  busy(b, false); $('bSupPrev').disabled = false;
  try { ALL = await api('adminList', { token: SESSION.token }); } catch (e) { }
};
