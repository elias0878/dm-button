/* =========================================================
   زر الرسائل الخاصة — فريق ابونواف
   ant.xo.je  ·  حقوق ابونواف © 2026
   ========================================================= */

const $ = id => document.getElementById(id);
const LS = 'ant_dm_v3';
const ID_RE = /^\d{5,25}$/;

/* ---- حساباتنا الرسمية ---- */
const ICONS = {
  tg : '<path d="M21.5 3.5 2.8 10.9c-.8.3-.8 1.1.1 1.3l4.3 1.2 1.6 5.2c.2.6 1 .7 1.4.2l2.3-2.7 4.5 3.3c.5.4 1.2.1 1.3-.5l3.3-14c.1-.6-.5-1.1-1.1-.9Z"/><path d="m9.4 13.6 8.5-5.6"/>',
  sn : '<path d="M12 3c4 0 7 2.7 7 6.3 0 1.6-.4 2.7-.4 3.9 0 .6.3 1 .8 1.3.7.4 1.6.2 1.6 1.3 0 1.5-2.7 2.5-4.7 2.5-.7 0-1.3.2-1.6.6-.3.4-.5 1-.5 1.8 0 .6-.5 1.1-1.2 1.1s-1.2-.5-1.2-1.1c0-.8-.2-1.4-.5-1.8-.3-.4-.9-.6-1.6-.6-2 0-4.7-1-4.7-2.5 0-1.1.9-.9 1.6-1.3.5-.3.8-.7.8-1.3 0-1.2-.4-2.3-.4-3.9C5 5.7 8 3 12 3Z"/><circle cx="9.7" cy="10.2" r=".9" fill="currentColor" stroke="none"/><circle cx="14.3" cy="10.2" r=".9" fill="currentColor" stroke="none"/>',
  ig : '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
  tt : '<path d="M14.5 3v10.8a3.6 3.6 0 1 1-3.6-3.6c.3 0 .6 0 .9.1"/><path d="M14.5 3c.4 2.3 2 3.9 4.3 4.1"/>',
  x  : '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" fill="currentColor" stroke="none"/>',
  fb : '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M14.5 8h2V5.6c-.5-.3-1.2-.5-2.1-.5-2.1 0-3.5 1.3-3.5 3.8V11H8.7v2.8h2.2V21h3v-7.2h2.2l.4-2.8h-2.6V9.1c0-.7.2-1.1.6-1.1Z"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>',
};

const SOCIAL = [
  { n:'تليجرام',  i:'tg',  u:'https://t.me/KSA_hack01' },
  { n:'سناب شات', i:'sn',  u:'https://www.snapchat.com/add/ant_ceh' },
  { n:'إنستجرام', i:'ig',  u:'https://www.instagram.com/ksa_hack01' },
  { n:'تيك توك',  i:'tt',  u:'https://www.tiktok.com/@ksa_hack01' },
  { n:'تويتر X',  i:'x',   u:'https://twitter.com/ksa_hack2' },
  { n:'فيسبوك',   i:'fb',  u:'https://www.facebook.com/profile.php?id=61554330014413' },
  { n:'الموقع',   i:'web', u:'https://ant.xo.je' },
];

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

  $('social').innerHTML = SOCIAL.map(s =>
    '<a class="soc" href="' + esc(s.u) + '" target="_blank" rel="noopener" title="' + esc(s.n) + '">' +
      '<svg viewBox="0 0 24 24">' + (ICONS[s.i] || '') + '</svg>' +
      '<span>' + esc(s.n) + '</span></a>').join('');

  $('go').onclick = go;
  $('handle').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('handle').addEventListener('dblclick', manual);
  $('copy').onclick = copyText;
  $('yr').textContent = new Date().getFullYear();
}

init();
