/* أدوات مشتركة بين بوابة المتدرب ولوحة المراجعة */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* «تذكّرني»: localStorage يبقى بعد إغلاق المتصفح، وإلا sessionStorage */
const keep = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } },
  del(k) { try { sessionStorage.removeItem(k); } catch (e) { } },
};
function msg(el, t, kind) { el.textContent = t; el.className = 'msg ' + (kind || 'info'); }
function clearMsg(el) { el.textContent = ''; el.className = 'msg'; }
function busy(btn, on) { if (btn) { btn.disabled = on; btn.classList.toggle('busy', !!on); } }
const ST = { PENDING: 'بانتظار المراجعة', ISSUED: 'صادرة', REJECTED: 'مرفوضة', REVOKED: 'ملغاة', HELD: 'معتمدة بانتظار المخالصة' };
const CLR = { FINANCE: 'بانتظار المالية', DUE: 'بانتظار السداد', SIGN: 'بانتظار التوقيع', SIGNED: 'موقّعة' };
function pill(s) {
  const c = s === ST.ISSUED ? 'p-ok' : s === ST.REJECTED ? 'p-no' : s === ST.REVOKED ? 'p-rev' : 'p-wait';
  return '<span class="pill ' + c + '">' + esc(s) + '</span>';
}
/** توحيد الاسم الإنجليزي: أول حرف من كل اسم كبير والباقي صغير (REEM AL-HARBI ← Reem Al-Harbi) */
function titleName(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|[\s\-'.])([a-z\u00E0-\u024F])/g, (m, p, c) => p + c.toUpperCase());
}
/** yyyy-MM-dd ← MM/dd/yyyy (صيغة الشهادة) */
function usDate(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[2] + '/' + m[3] + '/' + m[1] : String(iso || ''); }

let onSessionExpired = () => { };
/** استدعاء الخلفية: POST بـ text/plain لتجنّب CORS preflight */
async function api(action, body) {
  const url = window.SLK_CONFIG && window.SLK_CONFIG.API_URL;
  if (!url) throw new Error('الموقع غير مربوط بالخلفية بعد (API_URL فارغ في assets/config.js).');
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, body || {})), redirect: 'follow' });
  } catch (e) { throw new Error('تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.'); }
  let j;
  try { j = await res.json(); } catch (e) { throw new Error('رد غير متوقع من الخادم (' + res.status + ').'); }
  if (!j.ok) {
    if (/انتهت الجلسة/.test(j.error || '')) onSessionExpired();
    throw new Error(j.error || 'حدث خطأ.');
  }
  return j.data;
}

function downloadB64(name, b64, type) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u], { type: type || 'application/pdf' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/** دخول برمز من 6 أرقام — نفس المنطق في الصفحتين */
function setupLogin(opts) {
  const TOKEN_KEY = 'slk_tok', EMAIL_KEY = 'slk_email';
  const session = { token: store.get(TOKEN_KEY) || keep.get(TOKEN_KEY), email: store.get(EMAIL_KEY) || keep.get(EMAIL_KEY) };
  function showWho() {
    $('who').classList.toggle('hide', !session.token);
    $('whoEmail').textContent = session.email || '';
  }
  function logout(silent) {
    if (session.token) api('logout', { token: session.token }).catch(() => { });
    store.del(TOKEN_KEY); store.del(EMAIL_KEY); keep.del(TOKEN_KEY); keep.del(EMAIL_KEY); session.token = null; session.email = null;
    showWho(); opts.onLogout();
    if (silent !== true) { $('step2').classList.add('hide'); $('step1').classList.remove('hide'); clearMsg($('lMsg')); }
  }
  onSessionExpired = () => { logout(true); msg($('lMsg'), 'انتهت الجلسة. سجّل الدخول من جديد.', 'err'); };
  $('logout').onclick = () => logout();
  $('bSend').onclick = async () => {
    const b = $('bSend'); busy(b, true);
    try {
      await api('requestCode', { email: $('lEmail').value });
      $('step1').classList.add('hide'); $('step2').classList.remove('hide');
      $('sentTo').textContent = $('lEmail').value.trim();
      msg($('lMsg'), 'أرسلنا الرمز إلى بريدك. إن لم تجده تحقق من البريد غير المرغوب (Spam).', 'ok');
      $('lCode').value = ''; $('lCode').focus();
    } catch (e) { msg($('lMsg'), e.message, 'err'); }
    busy(b, false);
  };
  $('bBack').onclick = () => { $('step2').classList.add('hide'); $('step1').classList.remove('hide'); clearMsg($('lMsg')); };
  $('bVerify').onclick = async () => {
    const b = $('bVerify'); busy(b, true);
    try {
      const remember = !!($('lRemember') && $('lRemember').checked);
      const r = await api('verifyCode', { email: $('lEmail').value, code: $('lCode').value.replace(/\D/g, ''), remember: remember });
      if (opts.adminOnly && !r.isAdmin) {
        api('logout', { token: r.token }).catch(() => { });
        throw new Error('هذا البريد غير مصرّح له بلوحة المراجعة.');
      }
      session.token = r.token; session.email = r.email;
      (remember ? keep : store).set(TOKEN_KEY, r.token); (remember ? keep : store).set(EMAIL_KEY, r.email);
      clearMsg($('lMsg')); showWho(); opts.onLogin(session, r.data);
    } catch (e) { msg($('lMsg'), e.message, 'err'); }
    busy(b, false);
  };
  $('lEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('bSend').click(); });
  $('lCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('bVerify').click(); });
  $('lCode').addEventListener('input', () => { if ($('lCode').value.replace(/\D/g, '').length === 6) $('bVerify').click(); });
  showWho();
  return { session, logout };
}
