/* اختبارات أداة زر الرسائل الخاصة (تعمل بدون متصفح) */

const fs = require('fs');
const ID = '2068333043291402241';
const PROFILE = { ok:true, id:ID, screen_name:'2002_ANT', name:'هكر اخلاقي',
                  avatar:'https://pbs.twimg.com/x.jpg', protected:false };

const els = {};
function stub(id) {
  const t = { id, style:{}, classList:{ add(){}, remove(){}, toggle(){} },
              value:'', textContent:'', innerHTML:'', href:'', className:'', disabled:false,
              dataset:{}, addEventListener(){}, appendChild(){}, removeChild(){},
              select(){}, click(){}, querySelectorAll:()=>[] };
  return (els[id] = els[id] || new Proxy(t, {
    get:(o,k)=> (k in o ? o[k] : undefined), set:(o,k,v)=>{ o[k]=v; return true; } }));
}
global.document = { getElementById: id => stub(id), createElement: () => stub('_t'), body: stub('body') };
const store = {};
global.localStorage = { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };
global.navigator = {}; global.window = {}; global.prompt = () => null;

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✔' : '✗'} ${label}`);
  if (!ok) console.log(`      المتوقع: ${JSON.stringify(want)}\n      الفعلي : ${JSON.stringify(got)}`);
}

const code = fs.readFileSync(__dirname + '/app.js', 'utf8');

async function fresh(profile, fields = {}) {
  for (const k in els) delete els[k];
  global.fetch = async () => ({ json: async () => profile });
  const A = new Function(code + '\n; return { build, wlen, dmLink, go, draw };')();
  els.handle.value = '2002_ant';
  Object.assign(els.intro,   { value: fields.intro   ?? '' });
  Object.assign(els.emoji,   { value: fields.emoji   ?? '💬' });
  Object.assign(els.label,   { value: fields.label   ?? 'راسلني على الخاص' });
  Object.assign(els.prefill, { value: fields.prefill ?? '' });
  if (profile) await A.go();
  return A;
}

const LINK = 'https://x.com/messages/compose?recipient_id=' + ID;

(async () => {

console.log('\n── 1) الشكل الافتراضي ──');
{
  const A = await fresh(PROFILE);
  eq('الزر الافتراضي', A.build(), `💬 راسلني على الخاص 👇\n${LINK}`);
  eq('الرابط في آخر سطر', A.build().trim().split('\n').pop(), LINK);
}

console.log('\n── 2) تخصيص الإيموجي ──');
{
  const A = await fresh(PROFILE, { emoji:'📩' });
  eq('إيموجي مخصص', A.build(), `📩 راسلني على الخاص 👇\n${LINK}`);
}
{
  const A = await fresh(PROFILE, { emoji:'' });
  eq('بدون إيموجي', A.build(), `راسلني على الخاص 👇\n${LINK}`);
}

console.log('\n── 3) تخصيص نص الزر ──');
{
  const A = await fresh(PROFILE, { label:'تواصل معي على الخاص' });
  eq('نص مخصص', A.build(), `💬 تواصل معي على الخاص 👇\n${LINK}`);
}
{
  const A = await fresh(PROFILE, { label:'   ' });
  eq('نص فارغ → افتراضي', A.build(), `💬 راسلني على الخاص 👇\n${LINK}`);
}
{
  const A = await fresh(PROFILE, { emoji:'🔔', label:'استفسارات؟' });
  eq('إيموجي + نص معاً', A.build(), `🔔 استفسارات؟ 👇\n${LINK}`);
}

console.log('\n── 4) الرسالة الجاهزة (معامل X الرسمي text) ──');
{
  const A = await fresh(PROFILE, { prefill:'السلام عليكم' });
  eq('يُضاف &text= مُرمَّزاً', A.dmLink(),
     `${LINK}&text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85`);
  eq('بدون رسالة → لا معامل', (await fresh(PROFILE)).dmLink(), LINK);
}

console.log('\n── 5) النص التمهيدي ──');
{
  const A = await fresh(PROFILE, { intro:'عندك استفسار؟' });
  eq('مقدمة + زر', A.build(), `عندك استفسار؟\n\n💬 راسلني على الخاص 👇\n${LINK}`);
}

console.log('\n── 6) العدّاد الموزون ──');
{
  const A = await fresh(PROFILE);
  eq('رابط = 23', A.wlen(LINK), 23);
  eq('إيموجي = 2', A.wlen('👇'), 2);
  eq('عربي = 1/حرف', A.wlen('مرحبا'), 5);
  eq('الزر الافتراضي', A.wlen(A.build()), 23 + 23);
  eq('تحت الحد', A.wlen(A.build()) <= 280, true);
}

console.log('\n── 7) رابط النشر ──');
{
  const A = await fresh(PROFILE, { emoji:'📩', label:'راسلني' });
  A.draw();
  eq('intent صحيح', els.post.href.startsWith('https://x.com/intent/tweet?text='), true);
  eq('الإيموجي مُرمَّز', els.post.href.includes(encodeURIComponent('📩 راسلني')), true);
}

console.log('\n── 8) حالات الخطأ ──');
{
  const A = await fresh({ ok:false, error:'الحساب غير موجود أو محذوف.' });
  eq('لا تُبنى تغريدة', A.build(), '');
  eq('الصندوقان مخفيان', els.box.style.display + '/' + els.box2.style.display, 'none/none');
  eq('رسالة الخطأ', els.msg.innerHTML, 'الحساب غير موجود أو محذوف.');
}

console.log('\n── 9) حساب محمي ──');
{
  const A = await fresh(Object.assign({}, PROFILE, { protected:true }));
  eq('تحذير يظهر', els.msg.innerHTML.includes('محمي'), true);
  eq('التغريدة تُبنى', A.build().includes(ID), true);
}

console.log('\n── 10) روابط التواصل في الفوتر ──');
{
  const A = await fresh(PROFILE);
  const html = els.social.innerHTML;
  eq('يُبنى عدد الأزرار الصحيح', (html.match(/class="soc/g) || []).length, 9);
  eq('الروابط المضافة = روابط حقيقية', (html.match(/<a class="soc"/g) || []).length, 2);
  eq('غير المضافة = معطّلة', (html.match(/class="soc off"/g) || []).length, 7);
  eq('رابط X صحيح', html.includes('https://x.com/2002_ant'), true);
  eq('النطاق موجود', html.includes('ant.xo.je'), true);
  eq('المعطّل لا يحتوي href', /class="soc off"[^>]*href/.test(html), false);
}

console.log(`\n════ النتيجة: ${pass} ناجح · ${fail} فاشل ════\n`);
process.exit(fail ? 1 : 0);

})();
