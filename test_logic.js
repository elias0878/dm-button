/* اختبارات أداة زر الرسائل الخاصة (تعمل بدون متصفح) */

const fs = require('fs');
const ID = '2068333043291402241';
const PROFILE = { ok:true, id:ID, screen_name:'2002_ANT', name:'هكر اخلاقي',
                  avatar:'https://pbs.twimg.com/x.jpg', followers:65,
                  protected:false, snowflake:'ok' };

const els = {};
function stub(id) {
  const cls = new Set();
  const t = {
    id, style:{}, value:'', textContent:'', innerHTML:'', href:'', className:'',
    disabled:false, dataset:{},
    addEventListener(){}, appendChild(){}, removeChild(){}, select(){}, click(){},
    querySelectorAll: () => [],
    classList:{
      add:(...c) => c.forEach(x => cls.add(x)),
      remove:(...c) => c.forEach(x => cls.delete(x)),
      toggle:(c, f) => { f ? cls.add(c) : cls.delete(c); },
      contains: c => cls.has(c),
    },
  };
  return (els[id] = els[id] || new Proxy(t, {
    get:(o,k)=> (k in o ? o[k] : undefined), set:(o,k,v)=>{ o[k]=v; return true; } }));
}
global.document = { getElementById: id => stub(id), createElement: () => stub('_t'), body: stub('body') };
const store = {};
global.localStorage = { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };
global.navigator = {}; global.window = {}; global.prompt = () => ID;

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✔' : '✗'} ${label}`);
  if (!ok) console.log(`      المتوقع: ${JSON.stringify(want)}\n      الفعلي : ${JSON.stringify(got)}`);
}

const code = fs.readFileSync(__dirname + '/app.js', 'utf8');
const LINK = 'https://x.com/messages/compose?recipient_id=' + ID;

async function fresh(profile, handle = '2002_ant') {
  for (const k in els) delete els[k];
  global.fetch = async () => ({ json: async () => profile });
  const A = new Function(code + '\n; return { build, wlen, go, draw, manual };')();
  els.handle.value = handle;
  if (profile) await A.go();
  return A;
}

(async () => {

console.log('\n── 1) بناء التغريدة ──');
{
  const A = await fresh(PROFILE);
  eq('النص الافتراضي', A.build(), `💬 راسلني على الخاص 👇\n${LINK}`);
  eq('الرابط في آخر سطر', A.build().trim().split('\n').pop(), LINK);
}

console.log('\n── 2) العدّاد الموزون ──');
{
  const A = await fresh(PROFILE);
  eq('رابط = 23', A.wlen(LINK), 23);
  eq('إيموجي = 2', A.wlen('👇'), 2);
  eq('عربي = 1/حرف', A.wlen('مرحبا'), 5);
  eq('التغريدة كاملة', A.wlen(A.build()), 46);
  eq('تحت الحد 280', A.wlen(A.build()) <= 280, true);
}

console.log('\n── 3) رابط النشر ──');
{
  const A = await fresh(PROFILE);
  A.draw();
  eq('intent صحيح', els.post.href.startsWith('https://x.com/intent/tweet?text='), true);
  eq('النص العربي مُرمَّز', els.post.href.includes('%D8%B1%D8%A7%D8%B3%D9%84%D9%86%D9%8A'), true);
}

console.log('\n── 4) بطاقة الحساب ──');
{
  await fresh(PROFILE);
  eq('الرقم ظاهر', els.who.innerHTML.includes(ID), true);
  eq('المعامل @ ظاهر', els.who.innerHTML.includes('@2002_ANT'), true);
  eq('عدد المتابعين', els.who.innerHTML.includes('65'), true);
  eq('شارة المطابقة الزمنية', els.who.innerHTML.includes('مطابق زمنياً'), true);
}

console.log('\n── 5) حالات الخطأ ──');
{
  const A = await fresh({ ok:false, error:'الحساب غير موجود أو محذوف.' });
  eq('لا تُبنى تغريدة', A.build(), '');
  eq('صندوق النتيجة مخفي', els.box.classList.contains('hidden'), true);
  eq('نص الخطأ صحيح', els.msg.innerHTML, 'الحساب غير موجود أو محذوف.');
}
{
  await fresh(PROFILE, '');
  eq('اسم فارغ → رسالة تنبيه', els.msg.innerHTML, 'اكتب اسم المستخدم أولاً.');
}

console.log('\n── 6) حساب محمي ──');
{
  await fresh(Object.assign({}, PROFILE, { protected:true }));
  eq('تحذير الحماية ظاهر', els.who.innerHTML.includes('محمي'), true);
}

console.log('\n── 7) الإدخال اليدوي (إن حجب X الخادم) ──');
{
  const A = await fresh({ ok:false, error:'X حجب الطلب.' });
  eq('مخفي قبل الإدخال', els.box.classList.contains('hidden'), true);
  A.manual();
  eq('يظهر بعد الإدخال', els.box.classList.contains('hidden'), false);
  eq('التغريدة تُبنى', A.build(), `💬 راسلني على الخاص 👇\n${LINK}`);
}

console.log('\n── 8) حسابات التواصل الرسمية ──');
{
  await fresh(PROFILE);
  const h = els.social.innerHTML;
  eq('٧ حسابات', (h.match(/class="soc"/g) || []).length, 7);
  eq('كلها روابط حقيقية (لا وهمية)', (h.match(/<a class="soc" href="https/g) || []).length, 7);
  eq('لا توجد أزرار معطّلة', /class="soc off"/.test(h), false);
  eq('تيليجرام', h.includes('t.me/KSA_hack01'), true);
  eq('سناب شات', h.includes('snapchat.com/add/ant_ceh'), true);
  eq('إنستجرام', h.includes('instagram.com/ksa_hack01'), true);
  eq('تيك توك', h.includes('tiktok.com/@ksa_hack01'), true);
  eq('تويتر X', h.includes('twitter.com/ksa_hack2'), true);
  eq('فيسبوك', h.includes('facebook.com'), true);
  eq('الموقع', h.includes('ant.xo.je'), true);
  eq('كل رابط يفتح بنافذة آمنة', (h.match(/rel="noopener"/g) || []).length, 7);
}

console.log(`\n════ النتيجة: ${pass} ناجح · ${fail} فاشل ════\n`);
process.exit(fail ? 1 : 0);

})();
