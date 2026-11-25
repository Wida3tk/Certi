/* محاكاة خدمات Google Apps Script في الذاكرة لتشغيل backend/Code.gs محلياً بـ node */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

function pad(n, w = 2) { return String(n).padStart(w, '0'); }
function formatDate(d, tz, f) {
  // التوقيت المحلي للآلة يكفي للاختبار
  return f.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, t => ({
    yyyy: d.getFullYear(), yy: pad(d.getFullYear() % 100), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()),
    HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()),
  })[t]);
}

function makeSheet(name) {
  const data = [];
  const sh = {
    name, data,
    getName: () => name, getSheetId: () => name.length * 7,
    getLastRow: () => data.length,
    getLastColumn: () => Math.max(0, ...data.map(r => r.length)),
    getMaxRows: () => Math.max(1000, data.length),
    setFrozenRows() { return sh; }, setRightToLeft() { return sh; },
    appendRow(row) { data.push(row.slice()); return sh; },
    getDataRange() { return { getValues: () => data.map(r => r.slice()) }; },
    getRange(r, c, nr = 1, nc = 1) {
      const rng = {
        setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { (data[r - 1 + i] = data[r - 1 + i] || [])[c - 1 + j] = x; })); return rng; },
        setValue(x) { (data[r - 1] = data[r - 1] || [])[c - 1] = x; return rng; },
        getValues() { const o = []; for (let i = 0; i < nr; i++) { o.push([]); for (let j = 0; j < nc; j++) o[i].push((data[r - 1 + i] || [])[c - 1 + j] ?? ''); } return o; },
        setFontWeight: () => rng, setBackground: () => rng, setFontColor: () => rng, setNumberFormat: () => rng,
      };
      return rng;
    },
  };
  return sh;
}

function createEnv(opts = {}) {
  const props = {}, cache = new Map(), files = {}, mails = [], spreadsheets = {}, shared = {}, docs = {};
  const site = opts.coursesJson || JSON.stringify([
    { id: 'persuasion-influence', nameAr: 'فن الإقناع والتأثير', name: 'The Art of Persuasion and Influence', type: 'short', active: true },
    { id: 'specialist', nameAr: 'إعداد الأخصائي', name: 'ABA Specialist', type: 'short', minDays: 10, active: true },
    { id: 'abat', nameAr: 'شهادة أخصائي تحليل السلوك التطبيقي ABAT', aliases: ['شهادة فني تحليل السلوك التطبيقي ABAT'], name: 'ABAT 40-Hour Training',
      type: 'short', minDays: 10, active: true, templates: [{ dir: 'abat-baik', label: 'أماني' }, { dir: 'abat-ghazal', label: 'حسين' }] },
    { id: 'old-course', nameAr: 'قديمة', name: 'Old', active: false }]);
  let nextId = 1;
  const newId = p => p + (nextId++);

  function makeSS(id) {
    const sheets = [makeSheet('Sheet1')];
    const ss = {
      sheets, getId: () => id, getUrl: () => 'https://sheet/' + id,
      getSheets: () => sheets.slice(),
      getSheetByName: n => sheets.find(s => s.name === n) || null,
      insertSheet(n) { const s = makeSheet(n); sheets.push(s); return s; },
      deleteSheet(s) { sheets.splice(sheets.indexOf(s), 1); },
    };
    spreadsheets[id] = ss; return ss;
  }
  // شيتات إضافية للاختبار (مثل ردود Google Form): { id: { tab: [[...], ...] } }
  Object.keys(opts.extraSheets || {}).forEach(id => {
    const ss = makeSS(id);
    Object.keys(opts.extraSheets[id]).forEach(tab => { const t = ss.insertSheet(tab); opts.extraSheets[id][tab].forEach(r => t.appendRow(r)); });
    ss.sheets.splice(0, 1); // بدون Sheet1
  });
  // نظام العمليات
  if (opts.ops !== false) {
    const ops = makeSS('OPS'); const t = ops.insertSheet('العملاء');
    t.appendRow(['الاسم', 'البريد الإلكتروني', 'البرنامج', 'تاريخ التسجيل', 'تاريخ التفعيل']);
    (opts.opsRows || []).forEach(r => t.appendRow(r));
  }

  function blob(bytes, type, name) {
    bytes = Buffer.from(Array.isArray(bytes) ? bytes.map(b => b & 255) : bytes);
    return { getDataAsString: () => bytes.toString('utf8'), getBytes: () => Array.from(bytes).map(b => b > 127 ? b - 256 : b), _buf: bytes, getMimeType: () => type, getName: () => name, setName(n) { name = n; return this; }, copyBlob: () => blob(bytes, type, name) };
  }
  function folder(id) {
    return {
      getId: () => id, getUrl: () => 'https://drive/' + id,
      createFolder(n) { return folder(newId('F')); },
      addEditor(e) { (shared[id] = shared[id] || []).push(e); },
      createFile(b) { const fid = newId('FILE'); files[fid] = { blob: b, folder: id, trashed: false }; return { getId: () => fid }; },
    };
  }

  const ctx = {
    console: { log() {}, error() {} },
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'UTC', getEffectiveUser: () => ({ getEmail: () => 'maryam@sulukera.com' }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    SpreadsheetApp: {
      create: () => makeSS(newId('SS')),
      openById: id => { if (!spreadsheets[id]) throw new Error('No access to ' + id); return spreadsheets[id]; },
      flush() {},
    },
    DriveApp: {
      createFolder: () => folder(newId('F')),
      getFolderById: id => folder(id),
      getFileById: id => {
        if (docs[id]) { // مستند Google Docs مؤقت (المخالصة)
          const d = docs[id];
          return { getAs: () => blob(Buffer.from('%PDF-1.4\n' + d.text.join('\n')), 'application/pdf', d.name + '.pdf'), setTrashed(t) { d.trashed = t; } };
        }
        if (!files[id]) { if (/^SS/.test(id)) return { moveTo() {} }; throw new Error('file not found'); }
        const f = files[id];
        return { getName: () => f.blob.getName(), getMimeType: () => f.blob.getMimeType(), getBlob: () => f.blob,
          setTrashed(t) { f.trashed = t; }, moveTo() {} };
      },
    },
    CacheService: { getScriptCache: () => ({
      get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: k => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: m => mails.push(Object.assign({ via: 'MailApp' }, m)) },
    GmailApp: {
      getAliases: () => (opts.aliases || ['care@sulukera.com']),
      sendEmail: (to, subject, body, o) => mails.push(Object.assign({ via: 'GmailApp', to, subject }, o)),
    },
    UrlFetchApp: { fetch: (url, o) => {
      if (/upload\/drive\/v3\/files/.test(url)) { // تحويل HTML ← مستند Google Docs (المخالصة)
        const raw = Buffer.from((o.payload || []).map(b => b & 255)).toString('utf8');
        const html = raw.slice(raw.indexOf('<html>'), raw.lastIndexOf('</html>') + 7);
        const id = newId('DOC');
        docs[id] = { name: JSON.parse(raw.match(/\{.*\}/)[0]).name, html, text: html.replace(/<[^>]+>/g, '\n').split('\n').map(x => x.trim()).filter(Boolean),
          images: (html.match(/<img /g) || []).length, trashed: false, saved: false, font: '' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id }) };
      }
      return { getResponseCode: () => 200, getContentText: () => site, getBlob: () => blob(Buffer.from('PNG'), 'image/png', 'x.png'), _url: url };
    } },
    ScriptApp: { getOAuthToken: () => 'TOKEN' },
    DocumentApp: {
      HorizontalAlignment: { RIGHT: 'R', CENTER: 'C', LEFT: 'L' },
      ElementType: { INLINE_IMAGE: 'IMG', PARAGRAPH: 'P' },
      openById(id) {
        const d = docs[id]; if (!d) throw new Error('no doc');
        const par = () => ({ getNumChildren: () => 0, setAlignment() { return this; }, appendInlineImage: () => ({ setWidth() { return this; }, setHeight() { return this; } }) });
        const body = { setMarginTop() { return body; }, setMarginBottom() { return body; }, setMarginLeft() { return body; }, setMarginRight() { return body; },
          editAsText: () => ({ setFontFamily: f => { d.font = f; } }), getParagraphs: () => [par()],
          findText: t => (d.html.includes(t) ? { getElement: () => ({ getParent: () => 'P' }) } : null), getChildIndex: () => 3,
          insertPageBreak: () => { d.pageBreak = true; } };
        return { getBody: () => body, addFooter: () => ({ getParagraphs: () => [par()] }), saveAndClose() { d.saved = true; } };
      },
      create(name) {
        const id = newId('DOC'), d = docs[id] = { name, text: [], images: 0, trashed: false, saved: false };
        const chain = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : () => chain) });
        const para = txt => { if (txt) d.text.push(txt); return new Proxy({}, { get: (t, k) => {
          if (k === 'appendInlineImage') return () => { d.images++; return chain; };
          if (k === 'editAsText') return () => chain;
          return () => para(''); } }); };
        const cell = c => new Proxy({}, { get: (t, k) => (k === 'getChild' ? () => ({ asParagraph: () => para('') }) : () => cell(c)) });
        const body = new Proxy({}, { get: (t, k) => {
          if (k === 'appendParagraph') return txt => para(txt);
          if (k === 'getParagraphs') return () => [para('')];
          if (k === 'appendTable') return rows => { rows.forEach(r => d.text.push(r.join(' | '))); return {
            setBorderColor() { return this; }, getNumRows: () => rows.length, getRow: () => ({ getCell: () => cell() }) }; };
          if (k === 'appendPageBreak') return () => d.text.push('---page---');
          return () => body; } });
        return { getId: () => id, getBody: () => body, addFooter: () => ({ getParagraphs: () => [para('')] }), saveAndClose() { d.saved = true; } };
      },
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType() { return this; }, content: s }) },
    Utilities: {
      formatDate, getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
      base64EncodeWebSafe: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => Array.from(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')).map(b => b > 127 ? b - 256 : b),
      computeDigest: (alg, v) => Array.from(crypto.createHash(alg).update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map(b => b & 255))).digest()).map(b => b > 127 ? b - 256 : b),
      base64Decode: s => Array.from(Buffer.from(s, 'base64')).map(b => b > 127 ? b - 256 : b),
      base64Encode: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64'),
      newBlob: blob,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'backend', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  ctx.PropertiesService.getScriptProperties().setProperty('OPS_SHEET_ID', 'OPS');
  // التواريخ يجب أن تكون من نفس سياق vm حتى يعمل instanceof Date داخل Code.gs
  const VDate = vm.runInContext('Date', ctx);
  if (spreadsheets.OPS) spreadsheets.OPS.getSheetByName('العملاء').data.forEach((r, i) =>
    r.forEach((x, j) => { if (x instanceof Date) r[j] = new VDate(x.getTime()); }));
  if (opts.opsSheetId) props.OPS_SHEET_ID = opts.opsSheetId;

  const api = (action, body = {}) => {
    const out = ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, body)) } });
    return JSON.parse(out.content);
  };
  return { ctx, props, cache, files, mails, spreadsheets, shared, docs, api, sheet: n => spreadsheets[props.SHEET_ID].getSheetByName(n) };
}

module.exports = { createEnv };
