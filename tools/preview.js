// معاينة قالب: node tools/preview.js templates/<معرّف> ["Student Name"]
// يحتاج: npm i canvas qrcode-generator  — وملفات الخطوط (ttf) داخل tools/fonts/
const fs = require('fs'), path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const qrcode = require('qrcode-generator');
const { drawCertificate } = require('../assets/render.js');
for (const f of fs.readdirSync(path.join(__dirname, 'fonts'))) {
  const m = f.match(/^(.+?)-(Bold|Regular)\.ttf$/i); if (!m) continue;
  registerFont(path.join(__dirname, 'fonts', f), { family: m[1].replace(/([a-z])([A-Z])/g, '$1 $2'), weight: /bold/i.test(m[2]) ? 'bold' : 'normal' });
}
(async () => {
  const dir = process.argv[2], name = process.argv[3] || 'Abdulrahman Mohammed Al-Qahtani';
  const layout = JSON.parse(fs.readFileSync(path.join(dir, 'layout.json')));
  const bg = await loadImage(path.join(dir, 'background.jpg'));
  const cv = createCanvas(1, 1);
  drawCertificate(cv, bg, layout, { nameEn: name, start: '2026-09-07', end: '2026-09-09',
    certNo: 'SLK-2026-000001', verifyUrl: 'https://certificates.sulukera.com/?v=SLK-2026-000001' }, qrcode);
  fs.writeFileSync(path.join(dir, 'preview.png'), cv.toBuffer('image/png'));
  console.log('preview:', path.join(dir, 'preview.png'));
})();
