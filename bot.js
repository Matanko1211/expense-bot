// ═══════════════════════════════════════════════════════════
//  💰 בוט ניהול הוצאות לוואצפ
//  💎 גרוש גרוש הופך לרכוש
// ═══════════════════════════════════════════════════════════

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import express from 'express';
import QRCode  from 'qrcode';
import pino    from 'pino';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// ─── שמירת נתונים לדיסק ─────────────────────────────────────
const DATA_FILE = './data.json';

function loadData() {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
      Object.assign(userState,    raw.userState    || {});
      Object.assign(userExpenses, raw.userExpenses || {});
      Object.assign(userCats,     raw.userCats     || {});
      Object.assign(alertedCats,  raw.alertedCats  || {});
      console.log('✅ נתונים נטענו מהדיסק');
    }
  } catch (e) { console.log('⚠️ לא הצלחתי לטעון נתונים:', e.message); }
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      writeFileSync(DATA_FILE, JSON.stringify({ userState, userExpenses, userCats, alertedCats }));
    } catch (e) { console.log('⚠️ שגיאה בשמירה:', e.message); }
  }, 3000); // שמור 3 שניות אחרי השינוי האחרון
}

// ── שרת HTTP — מציג QR כדף אינטרנט ─────────────────────────
const app = express();
let currentQR   = null;
let isConnected = false;

app.get('/', async (req, res) => {
  if (isConnected) {
    return res.send(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>בוט הוצאות</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:Arial;text-align:center;padding:40px;background:#e5ddd5}
    .box{background:#fff;border-radius:16px;padding:30px;max-width:400px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,.15)}
    h1{color:#075e54}p{font-size:18px;color:#555}</style></head>
    <body><div class="box"><h1>💰 בוט ניהול הוצאות</h1>
    <p>✅ הבוט מחובר ופעיל!</p><p>💎 <em>גרוש גרוש הופך לרכוש</em></p></div></body></html>`);
  }
  if (!currentQR) {
    return res.send(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>בוט הוצאות</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3">
    <style>body{font-family:Arial;text-align:center;padding:40px;background:#e5ddd5}
    .box{background:#fff;border-radius:16px;padding:30px;max-width:400px;margin:auto}</style></head>
    <body><div class="box"><h1>💰 בוט הוצאות</h1><p>⏳ מכין QR... הדף יתרענן אוטומטית</p></div></body></html>`);
  }
  try {
    const qrImage = await QRCode.toDataURL(currentQR, { width: 300, margin: 2 });
    res.send(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>חבר בוט לוואצפ</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="30">
    <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;text-align:center;padding:20px;background:#e5ddd5;margin:0}
    .box{background:#fff;border-radius:16px;padding:24px;max-width:380px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,.15)}
    h1{color:#075e54;font-size:22px}.sub{color:#888;font-style:italic;font-size:14px;margin-bottom:20px}
    img{border:3px solid #25d366;border-radius:12px;width:260px}
    .steps{text-align:right;margin-top:20px;background:#f0f9f4;border-radius:12px;padding:16px}
    .steps h3{color:#075e54;margin:0 0 12px;font-size:15px}
    .step{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:14px;color:#333}
    .num{background:#25d366;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0;font-size:13px}
    .warn{color:#856404;background:#fff3cd;border-radius:8px;padding:10px;font-size:13px;margin-top:14px}</style></head>
    <body><div class="box"><h1>💰 בוט ניהול הוצאות</h1><div class="sub">💎 גרוש גרוש הופך לרכוש</div>
    <img src="${qrImage}" alt="QR Code"/>
    <div class="steps"><h3>📱 איך לחבר:</h3>
    <div class="step"><div class="num">1</div><div>פתח <strong>וואצפ</strong> בטלפון</div></div>
    <div class="step"><div class="num">2</div><div>לחץ על <strong>⋮</strong> (שלוש נקודות)</div></div>
    <div class="step"><div class="num">3</div><div>בחר <strong>מכשירים מקושרים</strong></div></div>
    <div class="step"><div class="num">4</div><div>לחץ <strong>קשר מכשיר</strong></div></div>
    <div class="step"><div class="num">5</div><div>סרוק את ה-QR למעלה ✅</div></div></div>
    <div class="warn">⏱️ ה-QR מתרענן כל 30 שניות אוטומטית</div></div></body></html>`);
  } catch { res.send('שגיאה. רענן את הדף.'); }
});

app.listen(process.env.PORT || 3000, () => console.log('✅ שרת HTTP פעיל'));

// ─── קבועים ────────────────────────────────────────────────
const CURRENCY        = '₪';
const ALERT_THRESHOLD = 65;
const AUTH_FOLDER     = './auth_info';

// מילות מפתח לזיהוי קטגוריה אוטומטי
const KEYWORDS = {
  food:          ['אוכל','מסעדה','סופר','קפה','פיצה','מקדונלד','שוקולד','לחם','ירקות','בשר','דג','פרי','מזון','ארוחה','בורגר','שווארמה','פלאפל','סושי','ממתקים','חלב','ביצים','גבינה','יוגורט','מיץ','שתייה','אינסטה','רולדין','מעדנייה'],
  health:        ['רופא','תרופה','תרופות','בית חולים','מרפאה','בריאות','כדור','כדורים','ביטוח בריאות','אופטיקה','משקפיים','דנטל','שיניים','פיזיו','דיאטה','קופת חולים','ניתוח'],
  shopping:      ['קניות','ביגוד','נעליים','חולצה','מכנסיים','שמלה','חנות','אמזון','זארה','hm','אייס','קסטרו','רנואר','תכשיט','ג\'ינס','סניקרס'],
  home:          ['שכירות','ארנונה','חשמל','מים','גז','אינטרנט','בזק','וויפי','ריהוט','מזגן','תיקון','שיפוץ','ניקיון','דיור','וילון','מטבח'],
  transport:     ['אוטובוס','רכבת','מונית','אובר','גט','תחבורה','כרטיס','חופשי חודשי','מעבר','טיסה','נסיעה','מטרו','טרמינל'],
  entertainment: ['קולנוע','סרט','נטפליקס','ספוטיפיי','בידור','קונצרט','הופעה','ספר','משחק','גיים','פלייסטיישן','חופשה','מלון','נופש','זום','דיסני'],
  fuel:          ['דלק','תדלוק','פז','סונול','דלקן','ב.פ','bp','תחנת דלק','גז לרכב'],
};

const DEFAULT_CATEGORIES = [
  { id: 'food',          name: 'אוכל',    emoji: '🍔', budget: 1500, goal: 0 },
  { id: 'health',        name: 'בריאות',  emoji: '💊', budget: 500,  goal: 0 },
  { id: 'shopping',      name: 'קניות',   emoji: '🛍️', budget: 1000, goal: 0 },
  { id: 'home',          name: 'דיור',    emoji: '🏠', budget: 4000, goal: 0 },
  { id: 'transport',     name: 'תחבורה',  emoji: '🚗', budget: 600,  goal: 0 },
  { id: 'entertainment', name: 'בידור',   emoji: '🎬', budget: 600,  goal: 0 },
  { id: 'fuel',          name: 'דלק',     emoji: '⛽', budget: 800,  goal: 0 },
];

// ─── מאגר נתונים ────────────────────────────────────────────
const userState    = {};
const userExpenses = {};
const userCats     = {};
const alertedCats  = {};
let   waSocket     = null;

function initUser(from) {
  if (!userState[from])    userState[from]    = { mode: 'main', pending: {}, pendingCat: {}, setup: false };
  if (!userExpenses[from]) userExpenses[from] = [];
  if (!userCats[from])     userCats[from]     = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  if (!alertedCats[from])  alertedCats[from]  = {};
}

// ─── זיהוי קטגוריה חכם ─────────────────────────────────────
function detectCategory(text, cats) {
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const cat of cats) {
    const kws   = KEYWORDS[cat.id] || [];
    const score = kws.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return bestScore > 0 ? best : null;
}

// ─── עזר ────────────────────────────────────────────────────
const filterMonth = exps => {
  const now = new Date();
  return exps.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
};
const filterToday = exps => {
  const t = new Date().toDateString();
  return exps.filter(e => new Date(e.date).toDateString() === t);
};
const filterWeek = exps => {
  const now = new Date();
  return exps.filter(e => (now - new Date(e.date)) / 86400000 <= 7);
};
const getBar = pct => {
  const n = Math.min(Math.round(pct / 10), 10);
  const c = pct >= 100 ? '🟥' : pct >= ALERT_THRESHOLD ? '🟨' : '🟩';
  return c.repeat(n) + '⬜'.repeat(10 - n);
};
const fmtDate = str => new Date(str).toLocaleDateString('he-IL', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

// ─── Onboarding ──────────────────────────────────────────────
function startOnboarding(from) {
  userState[from].mode = 'setup_intro';
  return `👋 *שלום וברוך הבא!*
💎 _גרוש גרוש הופך לרכוש_

━━━━━━━━━━━━━━━━━━
אני עוזר לך לעקוב אחרי ההוצאות ולעמוד ביעדים החודשיים שלך.

*איך זה עובד?*
• שלח לי הוצאה — לדוגמה: *85 סופר*
• אני אסווג אותה ואעדכן את התקציב שלך
• בסוף החודש תדע בדיוק לאן הלך הכסף 💰

━━━━━━━━━━━━━━━━━━
*1* — בוא נגדיר יחד כמה לבזבז בכל קטגוריה
*2* — התחל עם ברירות מחדל`;
}

function onboardingStep(from, t) {
  const state = userState[from];
  const cats  = userCats[from];
  const now   = new Date();
  const monthName = now.toLocaleDateString('he-IL', { month: 'long' });

  // ── מסך פתיחה ──
  if (state.mode === 'setup_intro') {
    if (t === '2') {
      // ברירת מחדל — עדיין שואל יעדים
      state.mode = 'setup_goals';
      state.pending.setupIdx = 0;
      const cat = cats[0];
      return _goalQuestion(cat, 1, cats.length, monthName, true);
    }
    state.mode = 'setup_name';
    return `😊 כיף!\n\nאיך קוראים לך?`;
  }

  // ── שם ──
  if (state.mode === 'setup_name') {
    state.pending.userName = t;
    state.mode = 'setup_goals';
    state.pending.setupIdx = 0;
    const cat = cats[0];
    return `נעים מאוד *${t}*! 🙌\n\nעכשיו נגדיר כמה תכנן להוציא החודש על כל קטגוריה.\n_אל דאגה, אפשר לשנות בכל עת_ 😊\n\n` + _goalQuestion(cat, 1, cats.length, monthName, false);
  }

  // ── יעד לכל קטגוריה (שלב אחד בלבד) ──
  if (state.mode === 'setup_goals') {
    const idx = state.pending.setupIdx;
    const num = parseFloat(t.replace(',', '.'));

    // שמור יעד אם הוזן סכום חוקי
    if (!isNaN(num) && num > 0) {
      cats[idx].goal   = num;
      cats[idx].budget = Math.round(num * 1.3); // תקציב מקסימלי = 130% מהיעד
    }

    const next = idx + 1;
    if (next < cats.length) {
      state.pending.setupIdx = next;
      return _goalQuestion(cats[next], next + 1, cats.length, monthName, false);
    }

    // סיום
    state.setup = true;
    state.mode  = 'main';
    const name  = state.pending.userName ? `, *${state.pending.userName}*` : '';
    state.pending = {};
    scheduleSave();

    // בנה סיכום יעדים
    let summary = '';
    cats.forEach(cat => {
      if (cat.goal > 0) summary += `${cat.emoji} ${cat.name}: ${CURRENCY}${cat.goal}\n`;
    });

    return `🎉 *מושלם${name}!*
━━━━━━━━━━━━━━━━━━
*יעדי ההוצאה שלך לחודש ${monthName}:*

${summary || 'לא הוגדרו יעדים (אפשר להגדיר דרך הגדרות)'}
━━━━━━━━━━━━━━━━━━
⚠️ אשלח לך התראה כשתתקרב לגבול בכל קטגוריה.
✏️ אפשר לעדכן הכל בכל עת דרך *הגדרות*.

` + mainMenu();
  }

  return mainMenu();
}

// ─── שאלת יעד לקטגוריה ──────────────────────────────────────
function _goalQuestion(cat, num, total, monthName, isDefault) {
  const progress = `${'🟩'.repeat(num - 1)}${'⬜'.repeat(total - (num - 1))} ${num}/${total}`;
  return `${progress}

${cat.emoji} *${cat.name}*
━━━━━━━━━━━━━━━━━━
כמה תכנן להוציא על *${cat.name}* בחודש *${monthName}*?

${isDefault ? `ברירת מחדל: ${CURRENCY}${cat.budget}` : `לדוגמה: ${CURRENCY}${cat.budget}`}

_שלח סכום — או *0* לדלג_`;
}

// ─── תפריט ──────────────────────────────────────────────────
function mainMenu() {
  return `💰 *בוט ניהול הוצאות*
💎 _גרוש גרוש הופך לרכוש_
━━━━━━━━━━━━━━━━━━

1️⃣  הוסף הוצאה
2️⃣  סיכום חודשי
3️⃣  סיכום יומי
4️⃣  סיכום שבועי
5️⃣  תקציב ויעדים
6️⃣  היסטוריה
7️⃣  הגדרות

_שלח מספר או מילת מפתח_`;
}

// ─── סיכומים ─────────────────────────────────────────────────
function buildMonthlySummary(from) {
  const cats  = userCats[from];
  const mExp  = filterMonth(userExpenses[from]);
  const total = mExp.reduce((s, e) => s + e.amount, 0);
  const now   = new Date();
  if (!mExp.length) return '📊 אין הוצאות החודש עדיין.\nשלח *1* להוספת הוצאה ➕';
  let msg = `📊 *סיכום חודשי*\n(${now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })})\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `💸 סה"כ: *${CURRENCY}${total.toFixed(2)}*\n\n`;
  cats.forEach(cat => {
    const amt  = mExp.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0);
    if (!amt) return;
    const pct  = cat.budget > 0 ? Math.round((amt / cat.budget) * 100) : 0;
    const rem  = cat.budget - amt;
    const warn = pct >= 100 ? ' ❌' : pct >= ALERT_THRESHOLD ? ' ⚠️' : '';
    msg += `${cat.emoji} *${cat.name}*${warn}\n`;
    msg += `   💰 ${CURRENCY}${amt.toFixed(0)} מתוך ${CURRENCY}${cat.budget}\n`;
    msg += rem >= 0 ? `   נותר: ${CURRENCY}${rem.toFixed(0)}\n` : `   ❌ חריגה: ${CURRENCY}${Math.abs(rem).toFixed(0)}\n`;
    if (cat.goal > 0) {
      const gRem = cat.goal - amt;
      msg += `   🎯 יעד: ${gRem >= 0 ? `נותר ${CURRENCY}${gRem.toFixed(0)}` : `❌ חרגת ב-${CURRENCY}${Math.abs(gRem).toFixed(0)}`}\n`;
    }
    if (cat.budget > 0) msg += `   ${getBar(pct)} ${pct}%\n`;
    msg += '\n';
  });
  return msg + 'שלח *תפריט* לחזרה 🏠';
}

function buildSimpleSummary(from, expList, label) {
  const cats  = userCats[from];
  const total = expList.reduce((s, e) => s + e.amount, 0);
  if (!expList.length) return `📊 אין הוצאות ל${label} עדיין.\nשלח *1* להוספת הוצאה ➕`;
  let msg = `📊 *סיכום ${label}*\n━━━━━━━━━━━━━━━━━━\n💸 סה"כ: *${CURRENCY}${total.toFixed(2)}*\n\n`;
  cats.forEach(cat => {
    const amt = expList.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0);
    if (!amt) return;
    msg += `${cat.emoji} *${cat.name}*: ${CURRENCY}${amt.toFixed(2)}\n`;
  });
  return msg + '\nשלח *תפריט* לחזרה 🏠';
}

function buildBudget(from) {
  const cats = userCats[from];
  const mExp = filterMonth(userExpenses[from]);
  const now  = new Date();
  let msg = `💼 *תקציב ויעדים*\n(${now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })})\n━━━━━━━━━━━━━━━━━━\n\n`;
  cats.forEach(cat => {
    const used = mExp.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0);
    const pct  = cat.budget > 0 ? Math.min(Math.round((used / cat.budget) * 100), 100) : 0;
    const rem  = cat.budget - used;
    const icon = pct >= 100 ? '🔴' : pct >= ALERT_THRESHOLD ? '🟡' : '🟢';
    msg += `${icon} ${cat.emoji} *${cat.name}*\n`;
    msg += `   💰 ${CURRENCY}${used.toFixed(0)} / ${CURRENCY}${cat.budget}\n`;
    if (cat.budget > 0) msg += `   ${getBar(pct)} ${pct}%\n`;
    msg += rem >= 0 ? `   נותר: ${CURRENCY}${rem.toFixed(0)}\n` : `   ❌ חריגה: ${CURRENCY}${Math.abs(rem).toFixed(0)}\n`;
    if (cat.goal > 0) {
      const gRem = cat.goal - used;
      msg += `   🎯 יעד: ${CURRENCY}${cat.goal} — ${gRem >= 0 ? `נותר ${CURRENCY}${gRem.toFixed(0)}` : `❌ חרגת ב-${CURRENCY}${Math.abs(gRem).toFixed(0)}`}\n`;
    }
    msg += '\n';
  });
  return msg + 'שלח *תפריט* לחזרה 🏠';
}

function buildHistory(from) {
  const cats   = userCats[from];
  const recent = [...userExpenses[from]].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  if (!recent.length) return '📋 אין היסטוריה עדיין.\nשלח *1* להוספת הוצאה ➕';
  let msg = '📋 *10 הוצאות אחרונות:*\n━━━━━━━━━━━━━━━━━━\n\n';
  recent.forEach((e, i) => {
    const cat = cats.find(c => c.id === e.category);
    msg += `${i + 1}. ${cat?.emoji} *${cat?.name}* — ${CURRENCY}${e.amount}\n`;
    msg += `   📅 ${fmtDate(e.date)}`;
    if (e.note) msg += ` | 📝 ${e.note}`;
    msg += '\n\n';
  });
  return msg + 'שלח *תפריט* לחזרה 🏠';
}

// ─── התראות ─────────────────────────────────────────────────
function checkAlerts(from) {
  if (!waSocket) return;
  const cats = userCats[from];
  const now  = new Date();
  const mKey = `${now.getFullYear()}-${now.getMonth()}`;
  const mExp = filterMonth(userExpenses[from]);
  cats.forEach(cat => {
    const used = mExp.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0);
    if (cat.budget > 0) {
      const pct = Math.round((used / cat.budget) * 100);
      const key = `budget-${mKey}-${cat.id}`;
      if (pct >= ALERT_THRESHOLD && !alertedCats[from][key]) {
        alertedCats[from][key] = true;
        const rem = cat.budget - used;
        const txt = pct >= 100
          ? `🚨 *חריגה מהתקציב!*\n\n${cat.emoji} *${cat.name}*\nחרגת ב-${CURRENCY}${Math.abs(rem).toFixed(0)}!\n${getBar(100)} 100%`
          : `⚠️ *התראת תקציב!*\n\n${cat.emoji} *${cat.name}*\n${CURRENCY}${used.toFixed(0)} מתוך ${CURRENCY}${cat.budget}\n${getBar(pct)} ${pct}%\n\n⚡ נשארו ${CURRENCY}${rem.toFixed(0)} (${100 - pct}%)`;
        setTimeout(() => waSocket?.sendMessage(from, { text: txt }), 2000);
      }
    }
    if (cat.goal > 0) {
      const key = `goal-${mKey}-${cat.id}`;
      if (used >= cat.goal && !alertedCats[from][key]) {
        alertedCats[from][key] = true;
        const txt = `🎯 *חרגת מהיעד החודשי!*\n\n${cat.emoji} *${cat.name}*\nיעד: ${CURRENCY}${cat.goal}\nהוצאת: ${CURRENCY}${used.toFixed(0)}\nחריגה: ${CURRENCY}${(used - cat.goal).toFixed(0)}`;
        setTimeout(() => waSocket?.sendMessage(from, { text: txt }), 3000);
      }
    }
  });
}

// ─── שמירת הוצאה ────────────────────────────────────────────
function saveExpense(from, expense) {
  const cats = userCats[from];
  const exps = userExpenses[from];
  exps.push(expense);
  scheduleSave();
  userState[from].pending = {};
  userState[from].mode    = 'main';

  const cat  = cats.find(c => c.id === expense.category) || {};
  const mAmt = filterMonth(exps).filter(e => e.category === expense.category).reduce((s, e) => s + e.amount, 0);
  const pct  = cat.budget > 0 ? Math.round((mAmt / cat.budget) * 100) : 0;
  const rem  = cat.budget - mAmt;

  let msg = `✅ *נשמר!*\n\n${cat.emoji} ${cat.name}: *${CURRENCY}${expense.amount}*`;
  if (expense.note) msg += ` | 📝 ${expense.note}`;
  if (cat.budget > 0) {
    msg += `\n\n📊 תקציב חודשי:\n${CURRENCY}${mAmt.toFixed(0)} מתוך ${CURRENCY}${cat.budget}\n`;
    msg += rem >= 0 ? `נותר: ${CURRENCY}${rem.toFixed(0)}\n` : `❌ חריגה: ${CURRENCY}${Math.abs(rem).toFixed(0)}\n`;
    msg += `${getBar(pct)} ${pct}%`;
  }
  if (cat.goal > 0) {
    const gRem = cat.goal - mAmt;
    msg += `\n🎯 יעד: ${gRem >= 0 ? `נותר ${CURRENCY}${gRem.toFixed(0)}` : `❌ חרגת ב-${CURRENCY}${Math.abs(gRem).toFixed(0)}`}`;
  }
  msg += '\n\nשלח *תפריט* לחזרה 🏠';
  setTimeout(() => checkAlerts(from), 1000);
  return msg;
}

// ─── לוגיקה ראשית ────────────────────────────────────────────
function handleMessage(from, text) {
  initUser(from);
  const t     = (text || '').trim();
  const state = userState[from];
  const cats  = userCats[from];
  const exps  = userExpenses[from];

  // Onboarding למשתמשים חדשים
  if (!state.setup) {
    // אפשר תמיד לברוח עם ביטול/תפריט — יטען ברירות מחדל
    if (['תפריט','menu','ביטול','דלג'].includes(t.toLowerCase())) {
      state.setup = true; state.mode = 'main'; state.pending = {}; state.pendingCat = {};
      return `✅ *הגדרות ברירת מחדל נטענו*\n\nאפשר לשנות הכל בכל עת דרך *הגדרות*.\n\n` + mainMenu();
    }
    if (state.mode === 'main') return startOnboarding(from);
    const setupModes = ['setup_intro', 'setup_name', 'setup_goals'];
    if (setupModes.includes(state.mode)) return onboardingStep(from, t);
  }

  // ביטול / תפריט
  if (['תפריט','menu','ביטול','חזור','0'].includes(t.toLowerCase())) {
    state.mode = 'main'; state.pending = {}; state.pendingCat = {};
    return mainMenu();
  }

  // ── תפריט ראשי ──
  if (state.mode === 'main') {
    if (t === '1' || t.includes('הוסף') || t.includes('הוצאה')) {
      state.mode = 'add_amount';
      return `➕ *הוסף הוצאה*\n\nכמה שילמת?\nאפשר לכתוב גם הערה, לדוגמה:\n• *85 סופר*\n• *120 תרופות*\n• *45.50*\n\nאני אנסה לזהות את הקטגוריה לבד 🤖\n\n_שלח ביטול לחזרה_`;
    }
    if (t === '2' || t.includes('חודשי'))    return buildMonthlySummary(from);
    if (t === '3' || t.includes('יומי'))     return buildSimpleSummary(from, filterToday(exps), 'היום');
    if (t === '4' || t.includes('שבועי'))    return buildSimpleSummary(from, filterWeek(exps), 'שבוע האחרון');
    if (t === '5' || t.includes('תקציב') || t.includes('יעד')) return buildBudget(from);
    if (t === '6' || t.includes('היסטוריה')) return buildHistory(from);
    if (t === '7' || t.includes('הגדרות')) {
      state.mode = 'settings';
      return `⚙️ *הגדרות*\n━━━━━━━━━━━━━━━━━━\n\n1. 💰 עדכן תקציב\n2. 🎯 עדכן יעד חודשי\n3. ➕ הוסף קטגוריה\n4. 🗑️ מחק הוצאה\n\nשלח מספר:`;
    }
    return mainMenu();
  }

  // ── הוסף הוצאה: סכום + זיהוי חכם ──
  if (state.mode === 'add_amount') {
    const match = t.match(/\d[\d.,]*/);
    // בעברית: פסיק = מפריד אלפים (1,200 = 1200), נקודה = עשרוני (45.50)
    const rawNum = match ? match[0] : '';
    const cleaned = rawNum.replace(/,(?=\d{3})/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num) || num <= 0) return `❌ לא הבנתי.\nנסה: *85* או *85 סופר* או *45.50* או *1,200*`;

    const noteHint = t.replace(match[0], '').trim();
    state.pending  = { amount: num, noteHint };

    const detected = noteHint ? detectCategory(noteHint, cats) : null;
    if (detected) {
      state.pending.suggestedCat = detected.id;
      state.mode = 'confirm_category';
      const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}`).join('\n');
      return `💰 *${CURRENCY}${num}*${noteHint ? ` | 📝 ${noteHint}` : ''}\n\n🤖 זיהיתי: ${detected.emoji} *${detected.name}*\nהאם זו הקטגוריה הנכונה?\n\n*כן* — שמור\n*לא* — שלח מספר אחר:\n━━━━━━━━━━━━━━━━━━\n${list}`;
    }

    state.mode = 'add_category';
    const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}  (${CURRENCY}${c.budget}/חודש)`).join('\n');
    return `💰 *${CURRENCY}${num}*${noteHint ? ` | 📝 ${noteHint}` : ''}\n\nבחר קטגוריה:\n━━━━━━━━━━━━━━━━━━\n${list}\n\n_שלח מספר_`;
  }

  // ── אישור / שינוי קטגוריה ──
  if (state.mode === 'confirm_category') {
    if (['כן','yes','✅','אישור'].includes(t.toLowerCase())) {
      return saveExpense(from, {
        amount: state.pending.amount, category: state.pending.suggestedCat,
        note: state.pending.noteHint || '', date: new Date().toISOString(), id: Date.now(),
      });
    }
    const num = parseInt(t);
    const cat = (!isNaN(num) && num >= 1 && num <= cats.length)
      ? cats[num - 1]
      : cats.find(c => c.name.includes(t));
    if (!cat) {
      const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}`).join('\n');
      return `❌ לא נמצא.\nשלח *כן* לאישור או מספר לשינוי:\n${list}`;
    }
    return saveExpense(from, {
      amount: state.pending.amount, category: cat.id,
      note: state.pending.noteHint || '', date: new Date().toISOString(), id: Date.now(),
    });
  }

  // ── בחירת קטגוריה ידנית ──
  if (state.mode === 'add_category') {
    const num = parseInt(t);
    const cat = (!isNaN(num) && num >= 1 && num <= cats.length)
      ? cats[num - 1]
      : cats.find(c => c.name.includes(t) || t.includes(c.name));
    if (!cat) {
      const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}`).join('\n');
      return `❌ לא נמצא. שלח מספר:\n${list}`;
    }
    return saveExpense(from, {
      amount: state.pending.amount, category: cat.id,
      note: state.pending.noteHint || '', date: new Date().toISOString(), id: Date.now(),
    });
  }

  // ── הגדרות ──
  if (state.mode === 'settings') {
    if (t === '1' || t.includes('תקציב')) {
      state.mode = 'budget_pick';
      const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name} — ${CURRENCY}${c.budget}/חודש`).join('\n');
      return `💰 *עדכון תקציב*\n━━━━━━━━━━━━━━━━━━\n${list}\n\nשלח מספר:`;
    }
    if (t === '2' || t.includes('יעד')) {
      state.mode = 'goal_pick';
      const list = cats.map((c, i) => `${i + 1}. ${c.emoji} ${c.name} — ${c.goal > 0 ? '🎯 ' + CURRENCY + c.goal : 'אין יעד'}`).join('\n');
      return `🎯 *עדכון יעד חודשי*\n━━━━━━━━━━━━━━━━━━\n${list}\n\nשלח מספר:`;
    }
    if (t === '3' || t.includes('הוסף')) { state.mode = 'newcat_name'; return `➕ *קטגוריה חדשה*\n\nמה שם הקטגוריה?`; }
    if (t === '4' || t.includes('מחק')) {
      const recent = [...exps].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
      if (!recent.length) { state.mode = 'main'; return 'אין הוצאות למחיקה.'; }
      state.mode = 'del_expense';
      state.pending.recentIds = recent.map(e => e.id);
      let list = '🗑️ *בחר הוצאה למחיקה:*\n━━━━━━━━━━━━━━━━━━\n\n';
      recent.forEach((e, i) => {
        const cat = cats.find(c => c.id === e.category);
        list += `${i + 1}. ${cat?.emoji} ${CURRENCY}${e.amount} — ${cat?.name} | ${fmtDate(e.date)}\n`;
        if (e.note) list += `   📝 ${e.note}\n`;
      });
      return list + '\nשלח מספר:';
    }
    return `⚙️ שלח 1, 2, 3 או 4:`;
  }

  if (state.mode === 'budget_pick') {
    const num = parseInt(t);
    if (isNaN(num) || num < 1 || num > cats.length) return `❌ שלח מספר בין 1 ל-${cats.length}:`;
    state.pending.budgetIdx = num - 1; state.mode = 'budget_set';
    const cat = cats[num - 1];
    return `💰 *${cat.emoji} ${cat.name}*\nתקציב נוכחי: ${CURRENCY}${cat.budget}/חודש\n\nמה התקציב החדש?`;
  }
  if (state.mode === 'budget_set') {
    const num = parseFloat(t.replace(',', '.'));
    if (isNaN(num) || num < 0) return `❌ הכנס מספר תקין:`;
    const cat = cats[state.pending.budgetIdx];
    cat.budget = num; state.pending = {}; state.mode = 'main';
    scheduleSave();
    return `✅ *תקציב עודכן!*\n${cat.emoji} ${cat.name}: ${CURRENCY}${num}/חודש\n\nשלח *תפריט* 🏠`;
  }
  if (state.mode === 'goal_pick') {
    const num = parseInt(t);
    if (isNaN(num) || num < 1 || num > cats.length) return `❌ שלח מספר בין 1 ל-${cats.length}:`;
    state.pending.goalIdx = num - 1; state.mode = 'goal_set';
    const cat = cats[num - 1];
    return `🎯 *${cat.emoji} ${cat.name}*\nתקציב: ${CURRENCY}${cat.budget}/חודש\nיעד נוכחי: ${cat.goal > 0 ? CURRENCY + cat.goal : 'לא הוגדר'}\n\nמה היעד החדש?\n_שלח *0* לביטול היעד_`;
  }
  if (state.mode === 'goal_set') {
    const num = parseFloat(t.replace(',', '.'));
    if (isNaN(num) || num < 0) return `❌ הכנס מספר תקין:`;
    const cat = cats[state.pending.goalIdx];
    cat.goal = num; state.pending = {}; state.mode = 'main';
    scheduleSave();
    return `✅ *יעד עודכן!*\n${cat.emoji} ${cat.name}: ${num > 0 ? `🎯 ${CURRENCY}${num}/חודש` : 'ללא יעד'}\n\nשלח *תפריט* 🏠`;
  }
  if (state.mode === 'newcat_name') {
    if (t.length < 2) return `❌ שם קצר מדי:`;
    state.pendingCat = { name: t }; state.mode = 'newcat_emoji';
    return `📂 *${t}*\n\nשלח אמוג'י (לדוגמה: 🎮 ✈️ 🐾)\nאו *דלג* ← 📦`;
  }
  if (state.mode === 'newcat_emoji') {
    state.pendingCat.emoji = (t === 'דלג') ? '📦' : t;
    state.mode = 'newcat_budget';
    return `${state.pendingCat.emoji} *${state.pendingCat.name}*\n\nתקציב חודשי?\n_שלח *0* ללא הגבלה_`;
  }
  if (state.mode === 'newcat_budget') {
    const num = parseFloat(t.replace(',', '.'));
    if (isNaN(num) || num < 0) return `❌ הכנס מספר:`;
    const newCat = { ...state.pendingCat, id: 'cat_' + Date.now(), budget: num, goal: 0 };
    cats.push(newCat);
    const catName = newCat.name || 'קטגוריה';
    state.pendingCat = {}; state.mode = 'main';
    return `✅ *${newCat.emoji} ${catName} נוספה!*\n${num > 0 ? `תקציב: ${CURRENCY}${num}/חודש` : 'ללא הגבלה'}\n\nשלח *תפריט* 🏠`;
  }
  if (state.mode === 'del_expense') {
    const num = parseInt(t);
    const ids = state.pending.recentIds || [];
    if (isNaN(num) || num < 1 || num > ids.length) return `❌ שלח מספר בין 1 ל-${ids.length}:`;
    const idx = exps.findIndex(e => e.id === ids[num - 1]);
    if (idx === -1) { state.mode = 'main'; return '❌ לא נמצא.'; }
    const [removed] = exps.splice(idx, 1);
    const cat = cats.find(c => c.id === removed.category);
    state.pending = {}; state.mode = 'main';
    scheduleSave();
    return `✅ *נמחק!*\n${cat?.emoji} ${cat?.name} — ${CURRENCY}${removed.amount}\n\nשלח *תפריט* 🏠`;
  }

  return mainMenu();
}

// ─── חיבור WhatsApp ──────────────────────────────────────────
async function connectToWhatsApp() {
  if (!existsSync(AUTH_FOLDER)) mkdirSync(AUTH_FOLDER, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  let version;
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
    console.log(`✅ Baileys version: ${version.join('.')}`);
  } catch (err) {
    version = [2, 3000, 1015901307];
    console.log('⚠️ לא הצלחתי לקבל גרסה חדשה — משתמש בגרסת fallback');
  }

  const sock = makeWASocket({
    version, auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });
  waSocket = sock;

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) { currentQR = qr; isConnected = false; console.log('📱 QR מוכן — פתח את כתובת ה-Railway'); }
    if (connection === 'open')  { currentQR = null; isConnected = true; console.log('✅ הבוט מחובר! 💰'); }
    if (connection === 'close') {
      isConnected = false;
      const ok = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (ok) { console.log('⚠️ מנסה מחדש...'); setTimeout(connectToWhatsApp, 5000); }
      else      console.log('🚪 מחק auth_info והפעל מחדש');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue;
      const from = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text.trim()) continue;
      try {
        const reply = handleMessage(from, text);
        if (reply) await sock.sendMessage(from, { text: reply }, { quoted: msg });
      } catch (err) {
        console.error('שגיאה:', err.message);
        try { await sock.sendMessage(from, { text: 'אירעה שגיאה. שלח *תפריט* לחזרה.' }); } catch {}
      }
    }
  });
}

console.log('🚀 מפעיל את הבוט...');
loadData();
connectToWhatsApp();
