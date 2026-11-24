// يضبط مركز الاسم الأفقي ليكون منتصف الخط المرسوم تحته في الخلفية (لا موضع اسم المتدرب القديم في PSD)
// node tools/center_name.js templates/<id>   — يعدّل layout.json ويطبع النتيجة
const fs = require('fs'), path = require('path');
const { loadImage, createCanvas } = require('canvas');
(async () => {
  const dir = process.argv[2];
  const lp = path.join(dir, 'layout.json'), layout = JSON.parse(fs.readFileSync(lp));
  const f = layout.fields.find(x => x.key === 'nameEn');
  const im = await loadImage(path.join(dir, 'background.jpg'));
  const c = createCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
  let best = null;
  for (let y = Math.round(f.y) - 40; y < f.y + 140; y++) {
    const d = x.getImageData(0, y, im.width, 1).data;
    let run = 0, start = 0;
    for (let i = 0; i <= im.width; i++) {
      const dark = i < im.width && (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 < 150;
      if (dark) { if (!run) start = i; run++; }
      else { if (run > 1200 && (!best || run > best.len)) best = { y, x0: start, len: run }; run = 0; }
    }
  }
  if (!best) { console.log('NO-LINE', dir); process.exit(2); }
  const cx = Math.round((best.x0 + best.len / 2) * 10) / 10;
  console.log(path.basename(dir), 'x', f.x, '->', cx, 'line', best.x0, best.len, 'y', best.y);
  f.x = cx; f.maxWidth = Math.min(f.maxWidth || best.len, best.len - 80);
  fs.writeFileSync(lp, JSON.stringify(layout, null, 1));
})();
