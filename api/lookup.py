# -*- coding: utf-8 -*-
"""
دالة Vercel الخادمية (Serverless Function)
ant.xo.je  ·  حقوق ابونواف © 2026

تجلب بيانات حساب X العامة وتستخرج الرقم التعريفي.
مكتبات Python القياسية فقط — بلا تبعيات.
"""

from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
import json
import re
import urllib.error
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

HANDLE_RE = re.compile(r"^[A-Za-z0-9_]{1,15}$")
SNOW_EPOCH = 1288834974657      # بداية عصر Snowflake في X

CACHE = {}                      # ذاكرة مؤقتة في الذاكرة (نطاق الدالة الدافئة)
CACHE_TTL = 6 * 3600
FETCH_TIMEOUT = 20


# ---------------- أدوات ----------------
def js_bool(v):
    """X يخزّن القيم المنطقية مضغوطة: !1 = false و !0 = true"""
    if v is None:
        return False
    v = v.strip()
    if v.startswith("!"):
        return v[1:] not in ("1", "true")
    return v in ("1", "true")


def fetch_profile(username):
    url = "https://x.com/" + urllib.parse.quote(username)
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "identity",
        "Connection": "close",
    })
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def parse_profile(html):
    d = {}

    # الهوية الرقمية + اسم المستخدم (الزوج الموثوق الوحيد)
    m = re.search(r'restId:"(\d+)",screenName:"([A-Za-z0-9_]+)"', html)
    if not m:
        return None
    d["id"], d["screen_name"] = m.group(1), m.group(2)

    # الاسم المعروض + تاريخ الإنشاء
    m = re.search(
        r'core:\$R\[\d+\]={created_at_ms:(\d+),name:"((?:[^"\\]|\\.)*)",screen_name:"([A-Za-z0-9_]+)"',
        html)
    if m:
        d["created_at_ms"] = int(m.group(1))
        d["name"] = m.group(2).replace('\\"', '"')
    else:
        m2 = re.search(r'<meta property="og:title" content="([^"]*)"', html)
        d["name"] = m2.group(1) if m2 else d["screen_name"]

    # البايو
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    d["description"] = (m.group(1) if m else "").strip()
    if not d["description"] or d["description"].startswith("The latest"):
        d["description"] = ""

    # الصورة الرمزية
    m = re.search(r'profile_images/(\d+)/([A-Za-z0-9_\-]+)_(?:normal|400x400|bigger)', html)
    d["avatar"] = ("https://pbs.twimg.com/profile_images/%s/%s_400x400.jpg" % (m.group(1), m.group(2))
                   if m else None)

    # الإحصائيات
    m = re.search(r'relationship_counts:\$R\[\d+\]={followers:(\d+),following:(\d+)}', html)
    d["followers"], d["following"] = (int(m.group(1)), int(m.group(2))) if m else (None, None)

    m = re.search(r'restId:"%s",screenName:"[A-Za-z0-9_]+",tweets:(\d+)' % re.escape(d["id"]), html)
    d["tweets"] = int(m.group(1)) if m else None

    # الحالة
    d["protected"] = js_bool((re.search(r'privacy:\$R\[\d+\]={protected:(!?\d|true|false)', html) or [None, None])[1])
    d["verified"] = (js_bool((re.search(r'isVerified:(!?\d|true|false)', html) or [None, None])[1])
                     or js_bool((re.search(r'is_blue_verified:(!?\d|true|false)', html) or [None, None])[1]))

    m = re.search(r'(?<!profile_)location:"((?:[^"\\]|\\.){0,60})"', html)
    d["location"] = m.group(1).replace('\\"', '"') if m else ""

    d["created_at"] = (datetime.fromtimestamp(d["created_at_ms"] / 1000, tz=timezone.utc)
                       .strftime("%Y-%m-%d")) if d.get("created_at_ms") else ""

    # تحقق إضافي: فك ترميز Snowflake يقابل تاريخ الإنشاء
    try:
        if not d.get("created_at_ms"):
            d["snowflake"] = "na"
        elif d["created_at_ms"] < SNOW_EPOCH:
            d["snowflake"] = "na"           # حسابات ما قبل نوفمبر 2010: مُعرِّفات تسلسلية
        else:
            snow_ms = ((int(d["id"]) >> 22) + SNOW_EPOCH)
            d["snowflake"] = "ok" if abs(snow_ms - d["created_at_ms"]) < 86400000 else "fail"
    except Exception:
        d["snowflake"] = "na"

    return d


def lookup(username):
    import time
    username = username.strip().lstrip("@")
    if not HANDLE_RE.match(username):
        return {"ok": False,
                "error": "اسم المستخدم غير صالح (حروف إنجليزية وأرقام و _ فقط، 15 خانة كحد أقصى)."}

    key = username.lower()
    hit = CACHE.get(key)
    if hit and time.time() - hit.get("_ts", 0) < CACHE_TTL:
        return dict(((k, v) for k, v in hit.items() if not k.startswith("_")), cached=True)

    try:
        html = fetch_profile(username)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"ok": False, "error": "الحساب غير موجود أو محذوف."}
        if e.code == 429:
            return {"ok": False, "error": "X حدّد عدد الطلبات مؤقتاً. انتظر دقيقة وجرّب مرة أخرى."}
        return {"ok": False, "error": "X ردّ بالخطأ %d. جرّب مرة أخرى." % e.code}
    except Exception:
        return {"ok": False, "error": "تعذّر الاتصال بـ X. جرّب مرة أخرى بعد قليل."}

    data = parse_profile(html)
    if not data:
        return {"ok": False,
                "error": "ما قدرت أقرأ بيانات الحساب. إما محجوب، أو محمي، أو X يعرض صفحة تسجيل دخول."}

    data.update(ok=True, cached=False,
                checked_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    CACHE[key] = dict(data, _ts=time.time())
    return data


# ---------------- مُعالج Vercel ----------------
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        u = (q.get("u") or [""])[0]
        res = lookup(u) if u else {"ok": False, "error": "لم تُدخل اسم المستخدم."}

        body = json.dumps(res, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # تخزين مؤقت على حافة الشبكة 6 ساعات
        self.send_header("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):
        pass
