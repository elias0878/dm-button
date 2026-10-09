/* زر الرسائل الخاصة — أداة أبو نواف · ant.xo.je */

const $ = id => document.getElementById(id);
const LS = 'ant_dm_v2';
const ID_RE = /^\d{5,25}$/;

/* إيموجيات سريعة الاختيار */
const CHIPS = ['💬', '✉️', '📩', '🙋', '💌', '📞', '🔔', '👋'];

/* الحالة المحفوظة في المتصفح */
const S = { handle:'', intro:'', emoji:'💬', label:'راسلني على الخاص', prefill:'' };
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}

let P = null;      // بيانات الحساب
let TXT = '';      // نص التغريدة النهائي

/* ---------- بناء الرابط والتغريدة ---------- */
function dmLink() {
  if (!P) return '';
  let u = 'https://x.com/messages/compose?recipient_id=' + P.id;
  const t = ($('prefill').value || '').trim();
  if (t) u += '&text=' + encodeURIComponent(t);   // معامل رسمي من X
  return u;
}

function build() {
  if (!P) return '';
  const intro = ($('intro').value || '').trim();
  const em    = ($('emoji').value || '').trim();
  const lbl   = ($('label').value || '').trim() || 'راسلني على الخاص';
  const link  = dmLink();

  // الرابط دائماً في آخر سطر — شرط رسم الزر في أسفل التغريدة
  const head = (em ? em + ' ' : '') + lbl + ' 👇';
  return (intro ? intro + '\n\n' : '') + head + '\n' + link;
}

/* ---------- الطول الموزون (X: رابط=23، إيموجي=2، الباقي=1) ---------- */
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

/* ---------- الرسم ---------- */
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

function save() {
  S.handle = $('handle').value; S.intro = $('intro').value;
  S.emoji = $('emoji').value;   S.label = $('label').value;
  S.prefill = $('prefill').value;
  try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
}

function say(cls, html) { $('msg').className = 'msg on ' + cls; $('msg').innerHTML = html; }

function toast(m) {
  $('toast').textContent = m;
  $('toast').classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $('toast').classList.remove('on'), 1800);
}

/* ---------- التحقق من الحساب ---------- */
async function go() {
  const u = $('handle').value.trim().replace(/^@/, '');
  if (!u) return say('err', 'اكتب اسم المستخدم أولاً.');

  $('go').disabled = true;
  say('ok', 'جارٍ التحقق…');

  try {
    const r = await fetch('/api/lookup?u=' + encodeURIComponent(u));
    const d = await r.json();

    if (!d.ok) {
      P = null;
      $('who').innerHTML = '';
      $('box').style.display = 'none';
      $('box2').style.display = 'none';
      $('tip').style.display = 'none';
      return say('err', esc(d.error || 'تعذّر التحقق.'));
    }

    P = d;
    save();

    $('who').innerHTML =
      '<div class="who">' +
        (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') +
        '<div><div class="n">' + esc(d.name) + '</div>' +
        '<div class="h">@' + esc(d.screen_name) + '</div></div>' +
      '</div><div class="id">' + esc(d.id) + '</div>';

    say('ok', d.protected
      ? '✔ تم التحقق — لكن حسابك <b>محمي</b>، وغير المتابعين لن يقدروا على الإرسال.'
      : '✔ تم التحقق من @' + esc(d.screen_name) + ' بنجاح.');

    $('box').style.display = 'block';
    $('box2').style.display = 'block';
    $('tip').style.display = 'block';
    draw();
  } catch (e) {
    say('err', 'تعذّر الاتصال بالخادم. جرّب مرة أخرى، أو أدخل الرقم التعريفي يدوياً.');
  } finally {
    $('go').disabled = false;
  }
}

/* ---------- إدخال يدوي للرقم التعريفي (يعمل بدون خادم) ---------- */
function manual() {
  if (P) return;
  const id = prompt('أدخل الرقم التعريفي (User ID) لحسابك:');
  if (!id || !ID_RE.test(id.trim())) return;
  P = { id: id.trim(), screen_name: 'حسابك', name: 'إدخال يدوي', avatar: null, protected: false };
  $('box').style.display = 'block';
  $('box2').style.display = 'block';
  say('ok', '✔ تم استخدام الرقم التعريفي الذي أدخلته يدوياً.');
  draw();
}

/* ---------- التهيئة ---------- */
function init() {
  $('handle').value = S.handle; $('intro').value = S.intro; $('emoji').value = S.emoji;
  $('label').value = S.label;   $('prefill').value = S.prefill;

  $('chips').innerHTML = CHIPS.map(c => '<button class="chip" data-e="' + c + '">' + c + '</button>').join('');
  $('chips').querySelectorAll('.chip').forEach(b => {
    b.onclick = () => { $('emoji').value = b.dataset.e; markChip(); save(); draw(); };
  });

  $('go').onclick = go;
  $('handle').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  ['intro','emoji','label','prefill'].forEach(id => {
    $(id).addEventListener('input', () => { markChip(); save(); draw(); });
  });

  $('copy').onclick = () => {
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
  };

  $('who').addEventListener('dblclick', manual);   // سرّي: نقرة مزدوجة للإدخال اليدوي
  markChip();
}

function markChip() {
  const cur = ($('emoji').value || '').trim();
  $('chips').querySelectorAll('.chip').forEach(b => {
    b.classList.toggle('on', b.dataset.e === cur);
  });
}

init();
