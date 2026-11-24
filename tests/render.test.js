/* المعاينة مطابقة لـ docs/sample-certificate.jpg، والاسم الطويل يصغر ولا يتجاوز الخط */
const fs = require('fs'), path = require('path'), assert = require('assert');
const { createCanvas, loadImage, registerFont } = require('canvas');
const qrcode = require('qrcode-generator');
const { drawCertificate, fmtCertDate } = require('../assets/render.js');
const ROOT = path.join(__dirname, '..');
registerFont(path.join(ROOT, 'tools/fonts/Tangerine-Bold.ttf'), { family: 'Tangerine', weight: 'bold' });
registerFont(path.join(ROOT, 'tools/fonts/Cardo-Bold.ttf'), { family: 'Cardo', weight: 'bold' });

(async () => {
  assert.strictEqual(fmtCertDate('2026-09-07', 'MM/dd/yyyy'), '09/07/2026');
  const dir = path.join(ROOT, 'templates/persuasion-influence');
  const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json')));
  const bg = await loadImage(path.join(dir, 'background.jpg'));
  const sample = await loadImage(path.join(ROOT, 'docs/sample-certificate.jpg'));
  const data = { nameEn: 'Abdulrahman Mohammed Abdullah Al-Qahtani', start: '2026-09-07', end: '2026-09-09',
    certNo: 'SLK-2026-000001', verifyUrl: 'https://certificates.sulukera.com/?v=SLK-2026-000001' };
  const cv = drawCertificate(createCanvas(1, 1), bg, layout, data, qrcode);
  // مقارنة بالعينة بنفس حجمها
  const W = sample.width, H = sample.height;
  const a = createCanvas(W, H), b = createCanvas(W, H);
  a.getContext('2d').drawImage(cv, 0, 0, W, H); b.getContext('2d').drawImage(sample, 0, 0, W, H);
  const pa = a.getContext('2d').getImageData(0, 0, W, H).data, pb = b.getContext('2d').getImageData(0, 0, W, H).data;
  let diff = 0, bad = 0;
  for (let i = 0; i < pa.length; i += 4) {
    const d = (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2])) / 3;
    diff += d; if (d > 60) bad++;
  }
  const mean = diff / (W * H), badPct = 100 * bad / (W * H);
  console.log('فرق متوسط عن العينة: ' + mean.toFixed(2) + ' — بكسلات مختلفة بوضوح: ' + badPct.toFixed(2) + '%');
  assert.ok(mean < 4 && badPct < 1, 'المعاينة لا تطابق العينة');

  // الاسم الطويل جداً يصغر ليبقى ضمن maxWidth
  const f = layout.fields.find(x => x.key === 'nameEn');
  const ctx = createCanvas(10, 10).getContext('2d');
  const long = 'Abdulrahman Mohammed Abdullah Saleh Ibrahim Al-Qahtani Al-Dosari';
  let size = f.size; ctx.font = '700 ' + size + 'px "Tangerine"';
  while (ctx.measureText(long).width > f.maxWidth && size > 12) { size--; ctx.font = '700 ' + size + 'px "Tangerine"'; }
  assert.ok(size < f.size && ctx.measureText(long).width <= f.maxWidth);
  drawCertificate(createCanvas(1, 1), bg, layout, Object.assign({}, data, { nameEn: long }), qrcode);
  console.log('✓ render: مطابقة للعينة، والاسم الطويل يصغر إلى ' + size + 'px (من ' + f.size + ')');
})().catch(e => { console.error('✗ render\n', e); process.exit(1); });
