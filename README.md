# سلوكيرا — نظام الشهادات
موقع `certificates.sulukera.com`: طلب الشهادة، المراجعة والاعتماد، الإصدار والإرسال التلقائي، والتحقق برمز QR.
التعليمات الكاملة للتطوير في `CLAUDE.md`.

| المسار | المحتوى |
|---|---|
| `index.html` | بوابة المتدرب (دخول برمز، طلب، «شهاداتي») + صفحة التحقق `?v=SLK-2026-000001` |
| `admin.html` | لوحة المراجعة (للمشرفين فقط، يتحقق الخادم) |
| `assets/` | CSS، `common.js`، `portal.js`، `admin.js`، `render.js` (رسم الشهادة)، `generate.js` (PDF)، `config.js` (رابط الخلفية)، `vendor/` |
| `templates/` | `courses.json` + لكل دورة `background.jpg` و`layout.json` |
| `backend/` | Google Apps Script (`Code.gs`, `appsscript.json`) يُرفع بـ `clasp push` |
| `tools/` | `psd_to_template.py` و`preview.js` والخطوط |
| `tests/` | `npm test` و`npm run test:e2e` |
| `reference/` | النموذج الأولي الأصلي (للمرجع فقط) |

## إضافة دورة جديدة
```bash
python3 tools/psd_to_template.py course.psd templates/<course-id>/
node tools/preview.js templates/<course-id>
```
ثم أضف `{ "id": "<course-id>", "name": "...", "active": true }` إلى `templates/courses.json`.
