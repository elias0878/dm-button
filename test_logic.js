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

console.log('\n── 8) حسابات التواصل (ثابتة في HTML للزواحف) ──');
{
  const h = fs.readFileSync(__dirname + '/index.html', 'utf8');
  eq('٧ حسابات', (h.match(/class="soc"/g) || []).length, 7);
  eq('كلها روابط حقيقية', (h.match(/class="soc" href="https/g) || []).length, 7);
  eq('لا توجد أزرار معطّلة', /class="soc off"/.test(h), false);
  eq('تيليجرام', h.includes('t.me/KSA_hack01'), true);
  eq('سناب شات', h.includes('snapchat.com/add/ant_ceh'), true);
  eq('إنستجرام', h.includes('instagram.com/ksa_hack01'), true);
  eq('تيك توك', h.includes('tiktok.com/@ksa_hack01'), true);
  eq('تويتر X', h.includes('twitter.com/ksa_hack2'), true);
  eq('فيسبوك', h.includes('facebook.com'), true);
  eq('الموقع', h.includes('ant.xo.je'), true);
  eq('كلها آمنة (noopener)', (h.match(/rel="noopener/g) || []).length >= 7, true);
}

console.log('\n── 9) تحسين محركات البحث (SEO) ──');
{
  const h = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const has = s => h.includes(s);
  eq('lang="ar"', has('lang="ar"'), true);
  eq('dir="rtl"', has('dir="rtl"'), true);
  eq('عنوان فريد', /<title>[^<]{20,70}<\/title>/.test(h), true);
  eq('وصف meta', has('name="description"'), true);
  eq('كلمات مفتاحية', has('name="keywords"'), true);
  eq('رابط قانوني canonical', has('rel="canonical"'), true);
  eq('وسم robots', has('name="robots" content="index, follow'), true);
  eq('og:title', has('property="og:title"'), true);
  eq('og:description', has('property="og:description"'), true);
  eq('og:image', has('property="og:image"'), true);
  eq('og:image بأبعاد', has('og:image:width') && has('og:image:height'), true);
  eq('og:url', has('property="og:url"'), true);
  eq('og:locale عربي', has('og:locale" content="ar_SA"'), true);
  eq('twitter:card كبير', has('twitter:card" content="summary_large_image"'), true);
  eq('twitter:image', has('name="twitter:image"'), true);
  eq('twitter:site', has('twitter:site" content="@ksa_hack2"'), true);
  eq('بيانات منظّمة JSON-LD', has('application/ld+json'), true);
  eq('JSON-LD صالح', (() => { try {
        const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        return !!m && !!JSON.parse(m[1]);
      } catch (e) { return false; } })(), true);
  eq('href لخريطة الموقع في robots', fs.readFileSync(__dirname + '/robots.txt', 'utf8')
      .includes('Sitemap: https://dm-button.vercel.app/sitemap.xml'), true);
  eq('sitemap.xml صالح', (() => { try {
        const x = fs.readFileSync(__dirname + '/sitemap.xml', 'utf8');
        return x.includes('<loc>https://dm-button.vercel.app/</loc>') && x.includes('<urlset');
      } catch (e) { return false; } })(), true);
  eq('صورة المشاركة موجودة', fs.existsSync(__dirname + '/assets/og-image.png'), true);
  eq('alt لكل الصور', (h.match(/<img[^>]+alt="/g) || []).length >= 2, true);
  eq('عنوان h1 واحد فقط', (h.match(/<h1/g) || []).length, 1);
  eq('أيقونة favicon', has('rel="icon"'), true);
  eq('theme-color', has('name="theme-color"'), true);
}

console.log(`\n════ النتيجة: ${pass} ناجح · ${fail} فاشل ════\n`);
process.exit(fail ? 1 : 0);

})();
