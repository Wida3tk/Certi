#!/usr/bin/env python3
"""
تحويل قالب شهادة PSD إلى قالب للنظام: background.jpg + layout.json + preview.png

الاستخدام:
    pip install psd-tools pillow
    python3 tools/psd_to_template.py <ملف.psd> templates/<معرّف-الدورة>/

ما يفعله:
  1) يجد طبقات المتغيرات: الاسم، و "Start date: ..."، و "End date: ...".
     - التواريخ: طبقة نصية تبدأ بـ Start date / End date.
     - الاسم: أكبر طبقة نصية بعد استبعاد CERTIFICATE والتواريخ وعنوان الدورة
       الطويل. إذا أخطأ، مرّري --name-layer "اسم الطبقة كما في فوتوشوب".
  2) يأخذ الصورة المدمجة الأصلية من الملف (أدق من إعادة التركيب، لأن
     psd-tools لا يعيد رسم بعض المؤثرات مثل الختم الذهبي بشكل صحيح)، ثم
     يمسح منطقة كل متغير فقط بنسخة معاد تركيبها بدون هذه الطبقات.
  3) يكتب مواقع الحقول وخطوطها وألوانها وأحجامها من بيانات الطبقة نفسها.
     رمز QR ورقم الشهادة يوضعان في الفراغ بين الختم والمدرب (قابل للتعديل).

بعد التشغيل: افتحي preview.png وتأكدي، ثم أضيفي الدورة للنظام.
تأكدي أن الخطوط المطبوعة في السجل موجودة على Google Fonts (Tangerine و Cardo موجودتان).
"""
import argparse, json, os, re, sys
from psd_tools import PSDImage
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('psd'); ap.add_argument('out')
ap.add_argument('--name-layer'); ap.add_argument('--date-format', default='MM/dd/yyyy')
ap.add_argument('--qr', default='2210,1930,250', help='x,y,size بالبكسل')
ap.add_argument('--certno', default='2335,2235,34', help='x,y,size بالبكسل (منتصف السطر)')
ap.add_argument('--name-size', type=float, help='حجم خط الاسم الأساسي (يتجاهل حجم الاسم المحفوظ في الملف)')
ap.add_argument('--name-maxwidth', type=float, help='أقصى عرض للاسم بالبكسل (طول الخط تحته)')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

psd = PSDImage.open(a.psd)
types = [l for l in psd.descendants() if l.kind == 'type' and l.visible]

def style(l):
    ed = l.engine_dict
    ss = ed['StyleRun']['RunArray'][0]['StyleSheet']['StyleSheetData']
    font = str(l.resource_dict['FontSet'][ss.get('Font', 0)]['Name']).strip("'\"")
    sx = l.transform[0]
    size = float(ss.get('FontSize', 12)) * sx
    v = ss.get('FillColor', {}).get('Values', [1, 0, 0, 0])
    color = '#%02X%02X%02X' % tuple(round(c * 255) for c in v[1:4])
    just = ed['ParagraphRun']['RunArray'][0]['ParagraphSheet']['Properties'].get('Justification', 0)
    family = re.sub(r'([a-z])([A-Z])', r'\1 \2', font.split('-')[0])
    weight = '700' if re.search(r'bold', font, re.I) else '400'
    return dict(font=family, weight=weight, size=round(size, 1), color=color,
                align={0: 'left', 1: 'right', 2: 'center'}.get(just, 'left'),
                x=round(l.transform[4], 1), y=round(l.transform[5], 1), psFont=font)

start = next((l for l in types if l.text.strip().lower().startswith('start date')), None)
end = next((l for l in types if l.text.strip().lower().startswith('end date')), None)
if a.name_layer:
    name = next((l for l in types if l.name == a.name_layer), None)
else:
    cands = [l for l in types if l not in (start, end) and l.text.strip().upper() != 'CERTIFICATE'
             and '\r' not in l.text.strip() and len(l.text.strip()) < 60]
    # خط الاسم في قوالب سلوكيرا هو Tangerine؛ نفضّله على «أكبر طبقة» لأنه أدق
    script = [l for l in cands if 'tangerine' in style(l)['psFont'].lower()]
    name = max(script or cands, key=lambda l: style(l)['size'], default=None)
missing = [n for n, l in (('الاسم', name), ('تاريخ البدء', start), ('تاريخ الانتهاء', end)) if l is None]
if missing:
    sys.exit('لم أجد: ' + '، '.join(missing) + ' — مرّري --name-layer أو تأكدي من نص الطبقات.')

for n, l in (('الاسم', name), ('البدء', start), ('الانتهاء', end)):
    s = style(l); print(f'{n}: طبقة «{l.name}» | {s["psFont"]} {s["size"]}px {s["color"]} {s["align"]} @ {s["x"]},{s["y"]}')

# الخلفية: الصورة المدمجة + ترقيع مناطق المتغيرات فقط
embedded = psd.topil().convert('RGB')
for l in (name, start, end): l.visible = False
clean = psd.composite(force=True).convert('RGB')
W, H = embedded.size
for l in (name, start, end):
    x0, y0, x1, y1 = l.bbox
    box = (max(0, x0 - 25), max(0, y0 - 15), min(W, x1 + 25), min(H, y1 + 15))
    embedded.paste(clean.crop(box), box[:2])
embedded.save(os.path.join(a.out, 'background.jpg'), quality=92)

def field(key, l, extra):
    s = style(l); s.pop('psFont')
    d = dict(key=key, baseline='alphabetic', **s); d.update(extra); return d

qx, qy, qs = map(float, a.qr.split(',')); cx, cy, cs = map(float, a.certno.split(','))
nb = name.bbox
layout = {'fields': [
    field('nameEn', name, dict({'maxWidth': a.name_maxwidth or round((nb[2] - nb[0]) * 1.5)},
                               **({'size': a.name_size} if a.name_size else {}))),
    field('start', start, {'prefix': 'Start date: ', 'format': a.date_format}),
    field('end', end, {'prefix': 'End date: ', 'format': a.date_format}),
    {'key': 'qr', 'x': qx, 'y': qy, 'size': qs, 'color': '#1F2440', 'bg': '#FFFFFF'},
    {'key': 'certNo', 'x': cx, 'y': cy, 'size': cs, 'font': style(start)['font'], 'weight': '700',
     'color': '#1F2440', 'align': 'center'},
]}
json.dump(layout, open(os.path.join(a.out, 'layout.json'), 'w'), indent=1, ensure_ascii=False)
print('تم:', os.path.join(a.out, 'background.jpg'), '+ layout.json')
print('للمعاينة: node tools/preview.js', a.out)
