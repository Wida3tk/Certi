/* توليد الشهادة في المتصفح: القالب من templates/<id>/ ← canvas ← PDF بحجم الخلفية */
const _fontsLoaded = {};
/** خطوط Google المستخدمة في layout.json بالأوزان المستخدمة فقط (وزن غير موجود يُفشل الرابط كله) */
async function loadTemplateFonts(fields) {
  const withFont = fields.filter(f => f.font);
  const fams = [...new Set(withFont.map(f => f.font))].filter(f => !_fontsLoaded[f]);
  if (fams.length) {
    const href = 'https://fonts.googleapis.com/css2?' + fams.map(f => {
      const w = [...new Set(withFont.filter(x => x.font === f).map(x => Number(x.weight || 400)))].sort((a, b) => a - b);
      return 'family=' + f.replace(/ /g, '+') + ':wght@' + w.join(';');
    }).join('&') + '&display=block';
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    const ok = await new Promise(r => { l.onload = () => r(true); l.onerror = () => r(false); document.head.appendChild(l); });
    if (!ok) throw new Error('تعذّر تحميل خطوط القالب من Google Fonts.');
    fams.forEach(f => _fontsLoaded[f] = 1);
  }
  await Promise.all(withFont.map(f => document.fonts.load((f.weight || '400') + ' ' + (f.size || 60) + 'px "' + f.font + '"', 'Text 0123')));
  const missing = withFont.filter(f => !document.fonts.check((f.weight || '400') + ' 20px "' + f.font + '"', 'Text'));
  if (missing.length) throw new Error('الخط ' + missing[0].font + ' لم يُحمّل، لن تكون الشهادة مطابقة.');
}

const _tplCache = {};
/** يُحمَّل القالب مرة واحدة ويُشارك بين التحميل المسبق والتوليد (يُحفظ الوعد نفسه) */
function loadTemplate(courseId) {
  if (!/^[a-z0-9-]+$/.test(courseId)) return Promise.reject(new Error('معرّف دورة غير صالح.'));
  if (_tplCache[courseId]) return _tplCache[courseId];
  const base = 'templates/' + courseId + '/';
  const p = (async () => {
    const res = await fetch(base + 'layout.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('لا يوجد قالب لهذه الدورة في templates/' + courseId);
    const layout = await res.json();
    const bg = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('تعذّر تحميل خلفية القالب.')); i.src = base + 'background.jpg'; });
    return { layout, bg };
  })();
  _tplCache[courseId] = p;
  p.catch(() => { delete _tplCache[courseId]; }); // عند الفشل يُعاد المحاولة لاحقاً
  return p;
}

/** يرجع { canvas, pdfBase64 } */
async function generateCertificate(courseId, data) {
  const tpl = await loadTemplate(courseId);
  await loadTemplateFonts(tpl.layout.fields || []);
  const cv = document.createElement('canvas');
  drawCertificate(cv, tpl.bg, tpl.layout, data, window.qrcode);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: cv.width > cv.height ? 'l' : 'p', unit: 'px', format: [cv.width, cv.height], hotfixes: ['px_scaling'], compress: true });
  pdf.setProperties({ title: 'Sulukera Certificate ' + data.certNo, author: 'Sulukera', creator: 'certificates.sulukera.com' });
  pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cv.width, cv.height);
  return { canvas: cv, pdfBase64: pdf.output('datauristring').split(',')[1] };
}
