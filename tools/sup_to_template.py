#!/usr/bin/env python3
"""قالب شهادة إشراف من PSD: الخلفية بدون (الاسم، العنوان، سطر التاريخ والساعات) + layout.json
الاستخدام: python3 tools/sup_to_template.py <ملف.psd> templates/<المجلد>/
الثابت في الخلفية: CERTIFICATE، السطر التمهيدي (حضور جلسة / تقديم دورة)، توقيع الرئيس التنفيذي، الختم، أرقام البورد."""
import json, os, re, sys
from psd_tools import PSDImage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
psd = PSDImage.open(src)
types = [l for l in psd.descendants() if l.kind == 'type' and l.visible]
def font(l):
    ss = l.engine_dict['StyleRun']['RunArray'][0]['StyleSheet']['StyleSheetData']
    return str(l.resource_dict['FontSet'][ss.get('Font', 0)]['Name']).strip("'\""), float(ss.get('FontSize', 12)) * l.transform[0], ss
name = next(l for l in types if 'tangerine' in font(l)[0].lower())
held = next(l for l in types if l.text.strip().lower().startswith('held'))
title = max((l for l in types if l not in (name, held) and l.text.strip().upper() != 'CERTIFICATE' and 'centaur' in font(l)[0].lower()),
            key=lambda l: font(l)[1])
for n, l in (('name', name), ('title', title), ('held', held)): print(n, repr(l.text.strip()[:60]), font(l)[:2], l.bbox, l.transform[4:])
embedded = psd.topil().convert('RGB')
for l in (name, title, held): l.visible = False
clean = psd.composite(force=True).convert('RGB')
W, H = embedded.size
for l in (name, title, held):
    x0, y0, x1, y1 = l.bbox
    box = (max(0, x0 - 40), max(0, y0 - 25), min(W, x1 + 40), min(H, y1 + 25))
    embedded.paste(clean.crop(box), box[:2])
embedded.save(os.path.join(out, 'background.jpg'), quality=92)
def color(l):
    v = font(l)[2].get('FillColor', {}).get('Values', [1, 0, 0, 0]); return '#%02X%02X%02X' % tuple(round(c * 255) for c in v[1:4])
tb = title.bbox
layout = {'fields': [
    {'key': 'nameEn', 'x': W / 2, 'y': round(name.transform[5], 1), 'baseline': 'alphabetic', 'size': round(font(name)[1], 1), 'font': 'Tangerine',
     'weight': '700', 'color': color(name), 'align': 'center', 'maxWidth': 2300},
    # العنوان: خط Centaur غير متاح على الويب، فيُرسم بـ Cardo (أقرب خط كلاسيكي متاح) ويلتف على سطرين إن طال
    {'key': 'title', 'x': W / 2, 'y': 1452, 'baseline': 'middle', 'size': round(font(title)[1] * 0.9, 1), 'font': 'Cardo', 'weight': '400',
     'color': color(title), 'align': 'center', 'wrap': 2550, 'maxLines': 2, 'lineHeight': 1.12},
    {'key': 'held', 'x': W / 2, 'y': round(held.transform[5], 1), 'baseline': 'alphabetic', 'size': round(font(held)[1], 1), 'font': 'Cardo',
     'weight': '700', 'color': color(held), 'align': 'center', 'maxWidth': 2700},
    {'key': 'qr', 'x': 2210, 'y': 1930, 'size': 250, 'color': '#1F2440', 'bg': '#FFFFFF'},
    {'key': 'certNo', 'x': 2335, 'y': 2235, 'size': 34, 'font': 'Cardo', 'weight': '700', 'color': '#1F2440', 'align': 'center'},
]}
json.dump(layout, open(os.path.join(out, 'layout.json'), 'w'), indent=1, ensure_ascii=False)
print('ok', out)
