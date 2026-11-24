# قوالب بانتظار موافقة مريم (لا تظهر في الموقع)
43 قالباً محوّلاً من مجلد Drive «الدورات القصيرة». اسم كل مجلد = معرّف ملف PSD في Drive.
`rows.json`: بيانات كل قالب (اسم الملف، العنوان الإنجليزي، المدرب، النوع المقترح، ملاحظات التعارض).
قرارات مريم (اسم عربي، نوع، أقل مدة، اعتماد/تعديل/استبعاد) محفوظة في صفحة المراجعة:
https://claude.ai/artifact/VqgcDJRXGn3f18mLm5zgV9 — تُقرأ بأداة ArtifactData (collection `templates`، doc_id = معرّف الملف).
عند الاعتماد: انقل المجلد إلى `templates/<course-id>/` بمعرّف إنجليزي مقروء، وأضفه إلى `courses.json` بـ `active: true`.
تحويل جديد: `python3 tools/psd_to_template.py X.psd out/ --name-size 220.8 --name-maxwidth 2300` ثم `node tools/center_name.js out/`.
