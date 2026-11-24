/* توليد الشهادة على canvas — يعمل في المتصفح، ونفسه يُختبر في Node */
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* format: dd / d / MM / MMMM (اسم الشهر) / yyyy — lang: 'ar' | 'en' — digits: 'ar' للأرقام العربية */
function fmtCertDate(iso, format, lang, digits) {
  if (!iso) return '';
  const m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const y = m[1], mo = Number(m[2]), d = Number(m[3]);
  const pad = n => ('0' + n).slice(-2);
  const month = (lang === 'ar' ? AR_MONTHS : EN_MONTHS)[mo - 1];
  let out = String(format || 'dd/MM/yyyy').replace(/yyyy|MMMM|MM|dd|d/g, t =>
    ({ yyyy: y, MMMM: '\u0001', MM: pad(mo), dd: pad(d), d: String(d) })[t]).replace('\u0001', month);
  if (digits === 'ar') out = out.replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[c]);
  return out;
}

/**
 * layout = { fields:[ {key, x, y, size, font, weight, color, align, dir, maxWidth, format, digits} ,
 *                     {key:'qr', x, y, size, color, bg} ] }
 * x,y بالبكسل على صورة الخلفية الأصلية؛ y = منتصف السطر، أو خط الأساس إذا baseline:'alphabetic'.
 * data = { nameAr, nameEn, course, start, end, certNo, verifyUrl }
 */
function drawCertificate(canvas, bg, layout, data, qrFactory) {
  canvas.width = bg.width; canvas.height = bg.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bg, 0, 0, bg.width, bg.height);
  (layout.fields || []).forEach(f => {
    if (f.key === 'qr') {
      if (!data.verifyUrl || !qrFactory) return;
      const qr = qrFactory(0, 'M'); qr.addData(data.verifyUrl); qr.make();
      const n = qr.getModuleCount(), q = 2, cell = f.size / (n + q * 2);
      ctx.fillStyle = f.bg || '#FFFFFF'; ctx.fillRect(f.x, f.y, f.size, f.size);
      ctx.fillStyle = f.color || '#000000';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) ctx.fillRect(f.x + (c + q) * cell, f.y + (r + q) * cell, Math.ceil(cell), Math.ceil(cell));
      return;
    }
    let text = data[f.key];
    if (f.key === 'start' || f.key === 'end') text = fmtCertDate(text, f.format, f.lang, f.digits);
    if (f.prefix) text = f.prefix + text;
    if (!text) return;
    const isAr = /[؀-ۿ]/.test(text);
    let size = f.size || 60;
    const font = s => (f.weight || '400') + ' ' + s + 'px "' + (f.font || 'Cairo') + '", Tahoma, sans-serif';
    ctx.font = font(size);
    if (f.maxWidth) while (ctx.measureText(text).width > f.maxWidth && size > 12) { size -= 1; ctx.font = font(size); }
    ctx.fillStyle = f.color || '#1F3A5F';
    ctx.textAlign = f.align || 'center';
    ctx.textBaseline = f.baseline || 'middle';
    ctx.direction = f.dir || (isAr ? 'rtl' : 'ltr');
    ctx.fillText(text, f.x, f.y);
  });
  return canvas;
}

if (typeof module !== 'undefined') module.exports = { drawCertificate, fmtCertDate };
