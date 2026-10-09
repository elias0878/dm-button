/* =========================================================
   زر الرسائل الخاصة — فريق ابونواف
   ant.xo.je  ·  حقوق ابونواف © 2026
   ========================================================= */

const $ = id => document.getElementById(id);
const LS = 'ant_dm_v3';
const ID_RE = /^\d{5,25}$/;

let P = null;    /* بيانات الحساب */
let TXT = '';    /* نص التغريدة */

/* ---------------- بناء التغريدة ---------------- */
function build() {
  if (!P) return '';
  return '💬 راسلني على الخاص 👇\nhttps://x.com/messages/compose?recipient_id=' + P.id;
}

/* ---------------- الطول الموزون (X: رابط=23، إيموجي=2) ---------------- */
const URL_RE = /https?:\/\/[^\s]+/g;
const EMOJI = [[0x2190,0x21FF],[0x2300,0x23FF],[0x2460,0x24FF],[0x2500,0x27BF],
               [0x2B00,0x2BFF],[0x1F000,0x1FAFF],[0x1F1E6,0x1F1FF],[0x3030,0x303D]];
function wlen(t) {
  let n = (t.match(URL_RE) || []).length * 23;
  for (const ch of t.replace(URL_RE, '')) {
    const c = ch.codePointAt(0);
    n += (c !== 0xFE0F && EMOJI.some(r => c >= r[0] && c <= r[1])) ? 2 : 1;
  }
  return n;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- الرسم ---------------- */
function draw() {
  TXT = build();
  if (!TXT) return;
  $('out').innerHTML = esc(TXT).replace(URL_RE, m => '<span class="u">' + m + '</span>');
  const n = wlen(TXT);
  $('cnt').textContent = n;
  $('cnt').className = n > 280 ? 'over' : '';
  $('copy').disabled = false;
  $('post').href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(TXT);
}

function save() { try { localStorage.setItem(LS, $('handle').value.trim()); } catch (e) {} }

function say(cls, html) { $('msg').className = 'msg on ' + cls; $('msg').innerHTML = html; }

function toast(m) {
  $('toast').textContent = m;
  $('toast').classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $('toast').classList.remove('on'), 1800);
}

/* ---------------- التحقق ---------------- */
async function go() {
  const u = $('handle').value.trim().replace(/^@/, '');
  if (!u) return say('err', 'اكتب اسم المستخدم أولاً.');

  $('go').disabled = true;
  say('ok', 'جارٍ التحقق… <span class="spin"></span>');

  try {
    const r = await fetch('/api/lookup?u=' + encodeURIComponent(u));
    const d = await r.json();

    if (!d.ok) {
      P = null; $('who').innerHTML = ''; $('box').classList.add('hidden');
      return say('err', esc(d.error || 'تعذّر التحقق.'));
    }

    P = d; save();

    $('who').innerHTML =
      '<div class="who">' +
        (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') +
        '<div><div class="n">' + esc(d.name) + '</div>' +
        '<div class="h">@' + esc(d.screen_name) + '</div></div>' +
      '</div>' +
      '<div class="idbox"><div class="lbl">الرقم التعريفي</div>' +
      '<div class="val">' + esc(d.id) + '</div></div>' +
      '<div class="chk">' +
        '<span>الحساب عام ✔</span>' +
        (d.snowflake === 'ok' ? '<span>مطابق زمنياً ✔</span>' : '') +
        '<span>' + (d.followers ?? '—') + ' متابع</span>' +
      '</div>' +
      (d.protected ? '<div class="msg on err" style="margin-top:11px">حسابك محمي — غير المتابعين لن يتمكنوا من الإرسال.</div>' : '');

    say('ok', '✔ تم التحقق من <b>@' + esc(d.screen_name) + '</b> بنجاح.');
    $('box').classList.remove('hidden');
    draw();
  } catch (e) {
    say('err', 'تعذّر الاتصال بالخادم. أعد المحاولة أو استخدم «إدخال الرقم يدوياً».');
  } finally {
    $('go').disabled = false;
  }
}

/* ---------------- إدخال الرقم يدوياً ---------------- */
function manual() {
  const id = prompt('أدخل الرقم التعريفي (User ID):\n\n'
    + 'ستجده في: الإعدادات ← حسابك ← تنزيل أرشيف ← account.js ← accountId');
  if (!id || !ID_RE.test(id.trim())) return;
  P = { id: id.trim(), name: 'إدخال يدوي', screen_name: '—', avatar: null };
  $('box').classList.remove('hidden');
  say('ok', '✔ تم استخدام الرقم التعريفي المُدخل يدوياً.');
  draw();
}

/* ---------------- النسخ ---------------- */
function copyText() {
  const done = () => toast('تم النسخ ✔');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(TXT).then(done).catch(fallback);
  } else fallback();
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = TXT;
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('انسخ يدوياً من الصندوق'); }
    document.body.removeChild(ta);
  }
}

/* ---------------- التهيئة ---------------- */
function init() {
  try {
    const h = localStorage.getItem(LS);
    if (h) $('handle').value = h;
  } catch (e) {}

  $('go').onclick = go;
  $('handle').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('handle').addEventListener('dblclick', manual);
  $('copy').onclick = copyText;
  $('yr').textContent = new Date().getFullYear();
}

init();
