const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const crypto = require('crypto');
const startBot = require('./bot');
const app = express();

app.use(express.json({limit:'20mb'}));

// ===== RATE LIMITING (Feature 58) =====
const rateLimits = {};
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    if (!rateLimits[key]) rateLimits[key] = [];
    rateLimits[key] = rateLimits[key].filter(t => now - t < windowMs);
    if (rateLimits[key].length >= max) return res.status(429).json({error:'အများကြီး လုပ်နေတယ်။ ခဏနေမှ ပြန်စမ်း'});
    rateLimits[key].push(now);
    next();
  };
}

// ===== MAINTENANCE =====
app.use('/api', (req, res, next) => {
  const m = db?.config?.maintenance;
  if (!m || !m.enabled) return next();
  const p = req.path;
  if (p.startsWith('/admin') || p === '/maintenance' || p === '/site' || p === '/health') return next();
  return res.status(503).json({ maintenance: true, message: m.message });
});

app.use(express.static('public'));

const DB_FILE = 'db.json';
webpush.setVapidDetails('mailto:safezone@example.com', 'BHgYbat8Lapx6QOcpjI9O9MO5b5PEtKQ85XROqdt-YPY7g0n6-nLUqNDirlppGMmSfOOcde_ycD6DZV4J9YkG9Q', 'gLa6zljKqbBBir9XmK8_YNnqA0A_DaiA7w8lnJc6vh8');

function defaultDB() {
  return {
    users: [], orders: [], deposits: [], sessions: {}, chats: [], notifications: [], activityLog: [], uploads: {}, subscriptions: [],
    otps: {}, banned: [], broadcasts: [], coupons: {}, cashbacks: {},
    boxesOpened: {}, missions: {}, reviews: [],
    products: [
      { id: 1, game: 'Mobile Legends', name: '86 Diamonds', price: 3000, image: '💎', category: 'MOBA' },
      { id: 2, game: 'Mobile Legends', name: '172 Diamonds', price: 5500, image: '💎', category: 'MOBA' },
      { id: 3, game: 'Mobile Legends', name: '257 Diamonds', price: 8000, image: '💎', category: 'MOBA' },
      { id: 4, game: 'PUBG Mobile', name: '60 UC', price: 2500, image: '🎮', category: 'Battle Royale' },
      { id: 5, game: 'PUBG Mobile', name: '325 UC', price: 12000, image: '🎮', category: 'Battle Royale' },
      { id: 6, game: 'PUBG Mobile', name: '660 UC', price: 24000, image: '🎮', category: 'Battle Royale' },
      { id: 7, game: 'Magic Chess', name: '100 Diamonds', price: 2500, image: '♟️', category: 'Casual' },
      { id: 8, game: 'Magic Chess', name: '310 Diamonds', price: 6500, image: '♟️', category: 'Casual' },
      { id: 9, game: 'App Premium', name: '1 Month', price: 15000, image: '⭐', category: 'Premium' },
      { id: 10, game: 'App Premium', name: '3 Months', price: 40000, image: '⭐', category: 'Premium' }
    ],
    gameImages: {
      'Mobile Legends': 'https://i.imgur.com/II8UVaO.jpeg',
      'PUBG Mobile': 'https://i.imgur.com/pgJ40tp.jpeg',
      'Magic Chess': 'https://i.imgur.com/x0CrjZi.jpeg',
      'App Premium': 'https://i.imgur.com/jnz2vQg.jpeg'
    },
    admins: [{username:'admin', password:'2102002', role:'super', createdAt: Date.now()}],
    config: {
      siteName: 'Safe Zone Game Topup',
      payNumber: '09763442881',
      payName: 'Mg Pyae Phyo Kyaw',
      telegramBotToken: '',
      telegramChatId: '',
      whatsapp: '09763442881',
      viber: '09763442881',
      tiktok: 'https://tiktok.com/@safezone',
      facebook: 'https://facebook.com/safezone',
      terms: 'Safe Zone Game Topup ကို အသုံးပြုခြင်းဖြင့် အောက်ပါ စည်းကမ်းချက်များကို လက်ခံပါသည်:\n\n1. User သည် မှန်ကန်သော အချက်အလက်များ ဖြည့်ရမည်\n2. Deposit လုပ်သောအခါ Ref No. မှန်ရမည်\n3. Order Reject ဖြစ်ပါက 100% ပြန်အမ်းပါမည်\n4. Fraud ဖြစ်ပါက Account ပိတ်ပါမည်\n5. ငွေလွှဲပြီးမှသာ Balance ဝင်ပါမည်\n6. မည်သည့် Dispute မဆို Admin ဆုံးဖြတ်ချက်သည် အတည်ဖြစ်သည်',
      privacy: 'Safe Zone သည် သင့် Data များကို လုံခြုံစွာ ထိန်းသိမ်းပါသည်။ Phone number ကို Admin သာ မြင်နိုင်သည်။ Password ကို encrypt မလုပ်ထားပါ (Demo) — Production အတွက် bcrypt သုံးပါ။',
      adsBanner: { enabled: false, text: '' }, logoUrl: 'https://i.imgur.com/iRwIfqs.png',
      musicUrl: '', customSound: '',
      autoReply: {}, maintenance: { enabled: false, message: '🔧 ခဏပိတ်ထားပါသည်။ မကြာမီ ပြန်လည်ဖွင့်ပေးပါမည်။' },
      logoUrl: 'https://i.imgur.com/iRwIfqs.png',
      hero: {
        title: 'Safe Zone Topup',
        subtitle: '⚡ Instant Delivery · 24/7 Service',
        videoUrl: 'https://cdn.pixabay.com/video/2023/10/20/185683-876929862_tiny.mp4'
      },
      theme: { primary: '#38bdf8', secondary: '#a855f7' },
      payments: [
        { name: 'KBZ Pay', short: 'KBZ', cls: 'kbz' },
        { name: 'Wave Money', short: 'Wave', cls: 'wave' },
        { name: 'UAB Pay', short: 'UAB', cls: 'uab' },
        { name: 'AYA Pay', short: 'AYA', cls: 'aya' }
      ],
      social: {
        facebook: 'https://facebook.com/safezone',
        tiktok: 'https://tiktok.com/@safezone',
        whatsapp: '09763442881',
        viber: '09763442881',
        telegram: ''
      ,
      videos: [
        { id: 'v1', title: 'Wallet ဖြည့်နည်း', url: 'https://www.youtube.com/', icon: '💰', category: 'Beginner', desc: '' },
        { id: 'v2', title: 'MLBB ဝယ်နည်း', url: 'https://www.youtube.com/', icon: '🎮', category: 'Game', desc: '' },
        { id: 'v3', title: 'Points လဲနည်း', url: 'https://www.youtube.com/', icon: '⭐', category: 'Points', desc: '' }
      ],
      videoCategories: ['Beginner', 'Game', 'Points', 'Advanced'],
      videoGuideTitle: '📺 Video Guides',
      videoGuideDesc: 'App အသုံးပြုနည်း Video တွေ',
      videoSectionEnabled: true},
      trustBadges: [
        { icon: '✅', text: 'Verified Shop' },
        { icon: '⚡', text: 'Fast Delivery' },
        { icon: '🛡️', text: 'Safe Payment' }
      ],
      labels: {
        balance: '💰 လက်ကျန်ငွေ',
        gamesTitle: '🎮 ဂိမ်းများ',
        searchPlaceholder: '🔍 ဂိမ်း ရှာပါ...',
        popularTitle: '🔥 Popular Games',
        quickActions: '⚡ Quick Actions',
        paymentTitle: '💰 Wallet ဖြည့်ရန်'
      },
      faq: [
        { q: '💰 Deposit တင်ပြီး ဘယ်လောက်ကြာမလဲ?', a: 'ပုံမှန် ၅-၁၅ မိနစ်အတွင်း approve လုပ်ပေးပါတယ်။' },
        { q: '❌ Order Reject ဖြစ်ရင် ငွေပြန်ရလား?', a: 'ရပါတယ်။ Balance ကို အလိုအလျောက် ပြန်အမ်းပါတယ်။' },
        { q: '🆔 Server ID ဆိုတာ ဘာလဲ?', a: 'MLBB/Magic Chess မှာ Player ID နဲ့အတူ Server ID လိုအပ်ပါတယ်။' },
        { q: '💬 Live Chat ဖွင့်ချိန်?', a: '၂၄ နာရီ ဖွင့်ပါတယ်။' }
      ],
      spinConfig: {
        enabled: true,
        prizes: [
          { value: 50, weight: 30 },
          { value: 100, weight: 25 },
          { value: 200, weight: 20 },
          { value: 500, weight: 12 },
          { value: 1000, weight: 8 },
          { value: 2000, weight: 3 },
          { value: 5000, weight: 1 },
          { value: 0, weight: 1 }
        ]
      },
      pointsMultiplier: 1,
      pointsBaseRate: 100,
      pointsRedeemRate: 10,
      coupons: { 'WELCOME100': { amount: 100, uses: 1000, usesLeft: 1000, expires: 0 } }
    },
    banners: [
      {title:'💎 MLBB Diamonds', subtitle:'5000 Ks မှစ၍', bg:'linear-gradient(135deg,#10b981,#3b82f6)'},
      {title:'🎮 PUBG UC', subtitle:'Instant Delivery', bg:'linear-gradient(135deg,#f59e0b,#ef4444)'},
      {title:'♟️ Magic Chess', subtitle:'အထူးဈေး', bg:'linear-gradient(135deg,#8b5cf6,#ec4899)'}
    ]
  };
}
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return defaultDB();
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const def = defaultDB();
    return { ...def, ...d,
      config: {...def.config, ...(d.config||{}),
        hero: {...def.config.hero, ...((d.config||{}).hero||{})},
        theme: {...def.config.theme, ...((d.config||{}).theme||{})},
        social: {...def.config.social, ...((d.config||{}).social||{})},
        labels: {...def.config.labels, ...((d.config||{}).labels||{})},
        maintenance: {...def.config.maintenance, ...((d.config||{}).maintenance||{})}},
      admins: d.admins || def.admins, products: d.products || def.products,
      gameImages: d.gameImages || def.gameImages, banners: d.banners || def.banners,
      chats: d.chats || [], banned: d.banned || [], broadcasts: d.broadcasts || [],
      otps: d.otps || {}, cashbacks: d.cashbacks || {}, boxesOpened: d.boxesOpened || {},
      missions: d.missions || {}, reviews: d.reviews || []
    };
  } catch(e) { return defaultDB(); }
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function logActivity(admin, action, detail) {
  if (!db.activityLog) db.activityLog = [];
  db.activityLog.push({ id:'A'+Date.now(), admin, action, detail: detail||'', at: Date.now() });
  if (db.activityLog.length > 500) db.activityLog = db.activityLog.slice(-500);
}
let db = loadDB();

// SAFE DEFAULTS — auto-fill empty config fields
(function applyDefaults() {
  var DEFAULTS = {
    siteName: 'Safe Zone Game Topup',
    payNumber: '09763442881',
    payName: 'Mg Pyae Phyo Kyaw',
    whatsapp: '09763442881',
    viber: '09763442881',
    tiktok: 'https://tiktok.com/@safezone',
    facebook: 'https://facebook.com/safezone',
    logoUrl: 'https://i.imgur.com/iRwIfqs.png',
    terms: 'Safe Zone Game Topup ကို အသုံးပြုခြင်းဖြင့် စည်းကမ်းချက်များကို လက်ခံပါသည်။',
    privacy: 'Safe Zone သည် သင့် Data များကို လုံခြုံစွာ ထိန်းသိမ်းပါသည်။',
    hero: { title: 'Safe Zone Topup', subtitle: '⚡ Instant Delivery · 24/7 Service', videoUrl: 'https://cdn.pixabay.com/video/2023/10/20/185683-876929862_tiny.mp4' },
    theme: { primary: '#38bdf8', secondary: '#a855f7' },
    payments: [
      { name: 'KBZ Pay', short: 'KBZ', cls: 'kbz' },
      { name: 'Wave Money', short: 'Wave', cls: 'wave' },
      { name: 'UAB Pay', short: 'UAB', cls: 'uab' },
      { name: 'AYA Pay', short: 'AYA', cls: 'aya' }
    ],
    social: { facebook: 'https://facebook.com/safezone', tiktok: 'https://tiktok.com/@safezone', whatsapp: '09763442881', viber: '09763442881', telegram: '' },
    trustBadges: [
      { icon: '✅', text: 'Verified Shop' },
      { icon: '⚡', text: 'Fast Delivery' },
      { icon: '🛡️', text: 'Safe Payment' }
    ],
    labels: {
      balance: '💰 လက်ကျန်ငွေ',
      gamesTitle: '🎮 ဂိမ်းများ',
      searchPlaceholder: '🔍 ဂိမ်း ရှာပါ...',
      popularTitle: '🔥 Popular Games',
      quickActions: '⚡ Quick Actions',
      paymentTitle: '💰 Wallet ဖြည့်ရန်'
    },
    faq: [
      { q: '💰 Deposit တင်ပြီး ဘယ်လောက်ကြာမလဲ?', a: 'ပုံမှန် ၅-၁၅ မိနစ်အတွင်း approve လုပ်ပေးပါတယ်။' },
      { q: '❌ Order Reject ဖြစ်ရင် ငွေပြန်ရလား?', a: 'ရပါတယ်။ Balance ကို အလိုအလျောက် ပြန်အမ်းပါတယ်။' },
      { q: '🆔 Server ID ဆိုတာ ဘာလဲ?', a: 'MLBB/Magic Chess မှာ Server ID လိုအပ်ပါတယ်။' },
      { q: '💬 Live Chat ဖွင့်ချိန်?', a: '၂၄ နာရီ ဖွင့်ပါတယ်။' }
    ]
  };
  if (!db.config) db.config = {};
  var changed = false;
  for (var k in DEFAULTS) {
    var cur = db.config[k];
    var def = DEFAULTS[k];
    if (cur === undefined || cur === null || cur === '') {
      db.config[k] = def;
      changed = true;
    } else if (Array.isArray(def) && (!Array.isArray(cur) || cur.length === 0)) {
      db.config[k] = def;
      changed = true;
    } else if (typeof def === 'object' && !Array.isArray(def) && typeof cur === 'object' && !Array.isArray(cur)) {
      for (var kk in def) {
        if (cur[kk] === undefined || cur[kk] === '' || (Array.isArray(def[kk]) && (!Array.isArray(cur[kk]) || cur[kk].length === 0))) {
          cur[kk] = def[kk];
          changed = true;
        }
      }
    }
  }
  if (changed) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch(e){}
    console.log('✅ Config defaults applied');
  }
})();

if (!db.config.githubBackup) {
  db.config.githubBackup = { enabled: false, token: '', owner: '', repo: '', branch: 'main', path: 'db.json', intervalMin: 5, lastBackup: 0 };
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !db.sessions[token]) return res.status(401).json({error:'Login လိုပါတယ်'});
  req.user = db.users.find(u => u.id === db.sessions[token]);
  if (!req.user) return res.status(401).json({error:'User မတွေ့'});
  if (db.banned.includes(req.user.username)) return res.status(403).json({error:'Account ပိတ်ထားသည်'});
  req.token = token; next();
}
function adminAuth(req, res, next) {
  const u = req.headers['x-admin-user'], p = req.headers['x-admin-pass'];
  const a = db.admins.find(x => x.username === u && x.password === p);
  if (!a) return res.status(401).json({error:'Admin မှား'});
  req.admin = a; next();
}
function superAdmin(req, res, next) {
  if (req.admin.role !== 'super') return res.status(403).json({error:'Super admin လိုတယ်'});
  next();
}

// ===== PUBLIC =====
app.get('/api/health', (req, res) => res.json({ok:true, ts:Date.now()}));
app.get('/api/maintenance', (req, res) => res.json(db.config.maintenance || {enabled:false}));
app.get('/api/site', (req, res) => res.json({ musicList: db.config.musicList || [], musicUrl: db.config.musicUrl || '',
  siteName: db.config.siteName, banners: db.banners,
  payNumber: db.config.payNumber, payName: db.config.payName,
  gameImages: db.gameImages,
  whatsapp: db.config.whatsapp, viber: db.config.viber,
  tiktok: db.config.tiktok, facebook: db.config.facebook, botUsername: db.config.botUsername || null,
  adsBanner: db.config.adsBanner || {enabled:false,text:''},
  logoUrl: db.config.logoUrl || 'https://i.imgur.com/iRwIfqs.png',
  customSound: db.config.customSound || '',
  musicUrl: db.config.musicUrl || '',
  spinConfig: db.config.spinConfig || { enabled: true, prizes: [] },
  pointsMultiplier: db.config.pointsMultiplier || 1,
  pointsBaseRate: db.config.pointsBaseRate || 100,
  pointsRedeemRate: db.config.pointsRedeemRate || 10,
  hero: db.config.hero || {title:'Safe Zone Topup', subtitle:'⚡ Instant Delivery', videoUrl:''},
  theme: db.config.theme || {primary:'#38bdf8', secondary:'#a855f7'},
  payments: db.config.payments || [
    {name:'KBZ Pay', short:'KBZ', cls:'kbz'},
    {name:'Wave Money', short:'Wave', cls:'wave'},
    {name:'UAB Pay', short:'UAB', cls:'uab'},
    {name:'AYA Pay', short:'AYA', cls:'aya'}
  ],
  social: db.config.social || {facebook:'',tiktok:'',whatsapp:'',viber:'',telegram:''},
  trustBadges: db.config.trustBadges || [],
  labels: db.config.labels || {},
  faq: db.config.faq || [], botUsername: db.config.botUsername || null,
  trustBadge: { users: db.users.length, orders: db.orders.length, completed: db.orders.filter(o=>o.status==='completed').length }
}));
app.get('/api/terms', (req, res) => res.json({terms: db.config.terms, privacy: db.config.privacy}));

// ===== AUTH + 2FA (Feature 57) =====
app.post('/api/register', rateLimit(60000, 5), (req, res) => {
  const { username, password, phone, referral } = req.body;
  if (!username || !password) return res.status(400).json({error:'Username နဲ့ Password ဖြည့်ပါ'});
  if (username.length < 3) return res.status(400).json({error:'Username အနည်းဆုံး ၃ လုံး ထားပါ'});
  if (password.length < 6) return res.status(400).json({error:'Password အနည်းဆုံး ၆ လုံး ထားပါ'});
  if (db.users.find(u => u.username === username)) return res.status(400).json({error:'Username ရှိပြီးသား'});
  const newUser = {
    id: Date.now().toString(), username, password, phone: phone||'',
    balance: 0, points: 0, cashback: 0, vip: 'Bronze', totalSpent: 0,
    referralCode: username.toUpperCase().slice(0,6) + Math.floor(Math.random()*900+100),
    referredBy: null, createdAt: Date.now(), usedCodes: [], telegramId: null,
    lastCheckin: 0, streak: 0, achievements: [], twoFA: false, joinedAt: Date.now()
  };
  if (referral) {
    const ref = db.users.find(u => u.referralCode === referral);
    if (ref) { ref.balance += 500; newUser.balance += 500; newUser.referredBy = ref.username; }
  }
  db.users.push(newUser); saveDB();
  res.json({success:true});
});
app.post('/api/login', rateLimit(60000, 10), (req, res) => {
  const { username, password, otp } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({error:'Username/Password မှား'});
  // 2FA check
  if (false && user.twoFA && user.telegramId) {
    if (!otp) {
      // send OTP
      const code = Math.floor(100000 + Math.random()*900000).toString();
      db.otps[username] = { code, expires: Date.now() + 300000 };
      saveDB();
      if (bot.sendOTP) bot.sendOTP(user.telegramId, code);
      return res.json({ needOTP: true, message: 'OTP ကို Telegram ဆီ ပို့ပြီးပါပြီ' });
    }
    const stored = db.otps[username];
    if (!stored || stored.code !== otp || Date.now() > stored.expires) {
      return res.status(401).json({error:'OTP မှား သို့ expired'});
    }
    delete db.otps[username];
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = user.id;
  if (!user.loginHistory) user.loginHistory = [];
  user.loginHistory.push({ ip: req.ip || 'unknown', ua: (req.headers['user-agent']||'').substring(0,80), at: Date.now() });
  if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(-20);
  saveDB();
  res.json({success:true, token, username: user.username});
});
app.post('/api/toggle-2fa', auth, (req, res) => {
  if (!req.user.telegramId) return res.status(400).json({error:'Telegram link မလုပ်ရသေးဘူး'});
  req.user.twoFA = !req.user.twoFA;
  saveDB();
  res.json({success:true, twoFA: req.user.twoFA});
});
app.post('/api/logout', auth, (req, res) => { delete db.sessions[req.token]; saveDB(); res.json({success:true}); });

// ===== 2FA LOGOUT OTP =====
app.post('/api/2fa/send-logout-otp', auth, (req, res) => {
  if (!req.user.twoFA) {
    return res.json({ success: true, no2fa: true });
  }
  if (!req.user.telegramId) {
    return res.status(400).json({ error: 'Telegram ချိတ်မထားပါ' });
  }
  
  // OTP generate
  var code = Math.floor(100000 + Math.random() * 900000).toString();
  if (!db.otps) db.otps = {};
  db.otps['logout_' + req.user.username] = {
    code: code,
    expires: Date.now() + 300000,
    attempts: 0
  };
  saveDB();
  
  // Telegram ဆီ ပို့
  try {
    if (typeof bot !== 'undefined' && bot.sendOTP) {
      bot.sendOTP(req.user.telegramId, code);
      console.log('2FA logout OTP sent to ' + req.user.username);
    } else if (typeof bot !== 'undefined' && bot.sendMessage) {
      bot.sendMessage(req.user.telegramId, '🔐 Logout OTP: ' + code + '\n\n5 မိနစ်အတွင်း ထည့်ပါ');
    }
  } catch(e) {
    console.log('OTP send error:', e.message);
  }
  
  res.json({ success: true, sent: true });
});

app.post('/api/2fa/verify-logout', auth, (req, res) => {
  var otp = (req.body.otp || '').trim();
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ error: 'OTP 6 လုံး ဖြည့်ပါ' });
  }
  
  var key = 'logout_' + req.user.username;
  var stored = db.otps ? db.otps[key] : null;
  
  if (!stored) {
    return res.status(400).json({ error: 'OTP မရှိပါ — ပြန်တောင်းပါ' });
  }
  if (Date.now() > stored.expires) {
    delete db.otps[key];
    saveDB();
    return res.status(400).json({ error: 'OTP သက်တမ်းကုန်သွားပါ' });
  }
  if (stored.attempts >= 3) {
    delete db.otps[key];
    saveDB();
    return res.status(400).json({ error: 'အကြိမ်ရေ ကျော်သွားပါ — ပြန်တောင်းပါ' });
  }
  if (stored.code !== otp) {
    stored.attempts = (stored.attempts || 0) + 1;
    saveDB();
    return res.status(400).json({ error: 'OTP မှားနေပါ (' + (3 - stored.attempts) + ' ကြိမ် ကျန်)' });
  }
  
  // အောင်မြင်
  delete db.otps[key];
  delete db.sessions[req.token];
  saveDB();
  res.json({ success: true });
});

app.get('/api/me', auth, (req, res) => {
  const unread = db.chats.filter(c => c.userId === req.user.id && c.from === 'admin' && !c.read).length;
  res.json({
    username: req.user.username, balance: req.user.balance, phone: req.user.phone,
    points: req.user.points, cashback: req.user.cashback || 0,
    vip: req.user.vip || 'Bronze', totalSpent: req.user.totalSpent || 0,
    referralCode: req.user.referralCode, unread,
    streak: req.user.streak || 0, achievements: req.user.achievements || [],
    twoFA: req.user.twoFA || false, telegramId: !!req.user.telegramId
  });
});

// ===== PRODUCTS + SEARCH (Features 9,10) =====
app.get('/api/products', (req, res) => res.json(db.products));

// ===== CHECK-IN (Feature 18) =====
app.post('/api/checkin', auth, (req, res) => {
  const today = new Date().toDateString();
  const last = req.user.lastCheckin ? new Date(req.user.lastCheckin).toDateString() : '';
  if (last === today) return res.status(400).json({error:'ဒီနေ့ check-in လုပ်ပြီးပါပြီ'});
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last === yesterday) req.user.streak = (req.user.streak || 0) + 1;
  else req.user.streak = 1;
  const rewards = [50, 80, 120, 150, 200, 300, 500];
  const idx = Math.min(req.user.streak - 1, 6);
  const reward = rewards[idx];
  req.user.balance += reward;
  req.user.lastCheckin = Date.now();
  saveDB();
  res.json({success:true, reward, streak:req.user.streak});
});

// ===== MYSTERY BOX (Feature 22) =====
app.post('/api/mystery-box', auth, (req, res) => {
  const cost = 500;
  if (req.user.balance < cost) return res.status(400).json({error:`${cost} Ks လိုတယ်`});
  const today = new Date().toDateString();
  if (db.boxesOpened[req.user.id] === today) return res.status(400).json({error:'ဒီနေ့ box ဖွင့်ပြီးပါပြီ'});
  req.user.balance -= cost;
  const prizes = [0, 200, 500, 1000, 2000, 5000, 10000];
  const weights = [40, 25, 15, 10, 6, 3, 1];
  let r = Math.random() * 100, sum = 0, prize = 0;
  for (let i = 0; i < prizes.length; i++) { sum += weights[i]; if (r < sum) { prize = prizes[i]; break; } }
  req.user.balance += prize;
  db.boxesOpened[req.user.id] = today;
  saveDB();
  res.json({success:true, prize, cost, balance:req.user.balance});
});

// ===== COUPON (Feature 24) =====
app.post('/api/redeem-coupon', auth, (req, res) => {
  const code = (req.body.code || '').toUpperCase().trim();
  const c = db.config.coupons?.[code];
  if (!c) return res.status(400).json({error:'Coupon မမှန်ပါ'});
  if (c.expires && Date.now() > c.expires) return res.status(400).json({error:'Coupon expired'});
  if (c.usesLeft <= 0) return res.status(400).json({error:'Coupon ကုန်သွားပါပြီ'});
  if (req.user.usedCodes?.includes(code)) return res.status(400).json({error:'ဒီ code သုံးပြီးသား'});
  req.user.balance += c.amount;
  req.user.usedCodes = [...(req.user.usedCodes || []), code];
  c.usesLeft--;
  saveDB();
  res.json({success:true, reward:c.amount});
});

// ===== DEPOSIT =====
app.post('/api/deposit', auth, rateLimit(60000, 5), (req, res) => {
  const { amount, method, ref, receipt } = req.body;
  if (!amount || amount < 1000) return res.status(400).json({error:'အနည်းဆုံး 1000 Ks'});
  const dep = { id:'DEP'+Date.now(), userId: req.user.id, username: req.user.username,
    amount: Number(amount), method, receipt: receipt || null, status:"pending", createdAt: Date.now() };
  db.deposits.push(dep); saveDB();
  bot.notifyDeposit(dep);
  res.json({success:true, message:'Deposit တင်ပြီးပါပြီ'});
});
app.get('/api/deposits', auth, (req, res) => res.json(db.deposits.filter(d => d.userId === req.user.id).reverse()));

// ===== ORDER + Cashback + VIP + Achievements (Features 14,19,20,23) =====
app.post('/api/order', auth, (req, res) => {
  const { productId, playerId, serverId } = req.body;
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({error:'Product မတွေ့'});
  if (!playerId) return res.status(400).json({error:'Player ID ဖြည့်ပါ'});
  // VIP discount
  const vipDiscount = {Bronze:0, Silver:2, Gold:5, Diamond:8}[req.user.vip || 'Bronze'] || 0;
  const finalPrice = Math.round(product.price * (1 - vipDiscount/100));
  if (req.user.balance < finalPrice) return res.status(400).json({error:'လက်ကျန်ငွေ မလုံလောက်ပါ'});
  req.user.balance -= finalPrice;
  var _pm = parseFloat((db.config && db.config.pointsMultiplier) || 1);
  if (isNaN(_pm) || _pm < 0) _pm = 1;
  var _base = parseFloat((db.config && db.config.pointsBaseRate) || 100);
  if (isNaN(_base) || _base < 1) _base = 100;
  req.user.points = (req.user.points || 0) + Math.floor((finalPrice / _base) * _pm);
  // cashback 2%
  const cashback = Math.floor(finalPrice * 0.02);
  req.user.cashback = (req.user.cashback || 0) + cashback;
  req.user.totalSpent = (req.user.totalSpent || 0) + finalPrice;
  // VIP update
  const spent = req.user.totalSpent;
  if (spent >= 500000) req.user.vip = 'Diamond';
  else if (spent >= 200000) req.user.vip = 'Gold';
  else if (spent >= 50000) req.user.vip = 'Silver';
  // achievements
  const ach = req.user.achievements || [];
  const userOrders = db.orders.filter(o => o.userId === req.user.id).length + 1;
  if (userOrders === 1 && !ach.includes('first_order')) ach.push('first_order');
  if (userOrders === 10 && !ach.includes('ten_orders')) ach.push('ten_orders');
  if (spent >= 100000 && !ach.includes('big_spender')) ach.push('big_spender');
  req.user.achievements = ach;

  const order = { id:'ORD'+Date.now(), userId: req.user.id, username: req.user.username,
    product: product.name, game: product.game, price: finalPrice, originalPrice: product.price,
    discount: product.price - finalPrice,
    playerId, status:'pending', createdAt: Date.now(), cashback };
  db.orders.push(order);
  db.chats.push({ id:'C'+Date.now(), userId: req.user.id, username: req.user.username,
    from:'admin', text:`✅ Order ${order.id} (${product.name}) လက်ခံရရှိပါပြီ။`,
    createdAt: Date.now(), read:false });
  saveDB();
  bot.notifyOrder(order);
  res.json({success:true, orderId: order.id, balance: req.user.balance, cashback,
    message:`Order တင်ပြီးပါပြီ (+${cashback} Ks cashback)`});
});

app.post('/api/admin/points-redeem-rate', adminAuth, superAdmin, (req, res) => {
  var rate = parseFloat(req.body.rate);
  if (isNaN(rate) || rate < 1) return res.status(400).json({error: 'Rate 1 အထက် ဖြစ်ရမယ်'});
  if (!db.config) db.config = {};
  db.config.pointsRedeemRate = rate;
  saveDB();
  res.json({ success: true, rate: rate });
});

app.get('/api/orders', auth, (req, res) => res.json(db.orders.filter(o => o.userId === req.user.id).reverse()));
// Feature 14 — Reorder
app.post('/api/reorder', auth, (req, res) => {
  const prev = db.orders.find(o => o.id === req.body.orderId && o.userId === req.user.id);
  if (!prev) return res.status(404).json({error:'Order မတွေ့'});
  const product = db.products.find(p => p.game === prev.game && p.name === prev.product);
  if (!product) return res.status(404).json({error:'Product မတွေ့တော့ပါ'});
  req.body.productId = product.id;
  req.body.playerId = prev.playerId;
  return app._router.stack.find(l => l.route?.path === '/api/order' && l.route.methods.post)?.route.stack[0].handle(req, res, () => {});
});

// ===== CHAT (Features 25,26,29) =====
app.get('/api/chat', auth, (req, res) => {
  const msgs = db.chats.filter(c => c.userId === req.user.id).sort((a,b)=>a.createdAt-b.createdAt);
  msgs.forEach(m => { if (m.from === 'admin') m.read = true; });
  saveDB();
  res.json(msgs);
});
app.post('/api/chat', auth, (req, res) => {
  const { text, image, audio } = req.body;
  if (!text && !image && !audio) return res.status(400).json({error:'စာ ရေးပါ'});
  const m = { id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId: req.user.id,
    username: req.user.username, from:'user', text: text||'', image: image||null, audio: audio||null,
    createdAt: Date.now(), read:false };
  db.chats.push(m); saveDB();
  bot.notifyChat(req.user, text || (image?'[📷 Image]':(audio?'[🎤 Voice]':'')));
  res.json({success:true, message:m});
});

// ===== LEADERBOARD =====

app.get('/api/push/vapid', (req, res) => res.json({ publicKey: 'BHgYbat8Lapx6QOcpjI9O9MO5b5PEtKQ85XROqdt-YPY7g0n6-nLUqNDirlppGMmSfOOcde_ycD6DZV4J9YkG9Q' }));

app.post('/api/push/subscribe', auth, (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) return res.status(400).json({error:'မှား'});
  if (!db.subscriptions) db.subscriptions = [];
  const ex = db.subscriptions.find(x => x.endpoint === subscription.endpoint);
  if (ex) { ex.subscription = subscription; ex.userId = req.user.id; ex.username = req.user.username; ex.at = Date.now(); }
  else db.subscriptions.push({ id:'S'+Date.now(), userId: req.user.id, username: req.user.username, endpoint: subscription.endpoint, subscription, at: Date.now() });
  saveDB();
  res.json({ success: true, total: db.subscriptions.filter(x => x.userId === req.user.id).length });
});

app.post('/api/push/test', auth, async (req, res) => {
  const sent = await sendPushToUser(req.user.id, '🔔 Test Notification', 'Push system အလုပ်လုပ်နေပါပြီ!');
  res.json({ success: true, sent });
});

app.post('/api/push/unsubscribe', auth, (req, res) => {
  db.subscriptions = (db.subscriptions||[]).filter(x => x.userId !== req.user.id);
  saveDB();
  res.json({ success: true });
});

app.get('/api/admin/subscriptions', adminAuth, (req, res) => {
  const byUser = {};
  (db.subscriptions||[]).forEach(x => { byUser[x.username] = (byUser[x.username] || 0) + 1; });
  res.json({ total: (db.subscriptions||[]).length, users: byUser });
});


app.post('/api/spin', auth, (req, res) => {
  const cfg = db.config.spinConfig || {};
  if (cfg.enabled === false) return res.status(400).json({ error: 'Spin ပိတ်ထားပါတယ်' });
  const prizes = (cfg.prizes && cfg.prizes.length) ? cfg.prizes : [
    { value: 50, weight: 30 }, { value: 100, weight: 25 }, { value: 200, weight: 20 },
    { value: 500, weight: 12 }, { value: 1000, weight: 8 }, { value: 2000, weight: 3 },
    { value: 5000, weight: 1 }, { value: 0, weight: 1 }
  ];
  const today = new Date().toDateString();
  if (req.user.lastSpin === today) return res.status(400).json({ error: 'ဒီနေ့ Spin လုပ်ပြီးပါပြီ' });
  const totalWeight = prizes.reduce((s, p) => s + (Number(p.weight) || 0), 0);
  let r = Math.random() * totalWeight, sum = 0, reward = 0;
  for (const p of prizes) {
    sum += Number(p.weight) || 0;
    if (r < sum) { reward = Number(p.value) || 0; break; }
  }
  req.user.balance = (req.user.balance || 0) + reward;
  req.user.lastSpin = today;
  saveDB();
  res.json({ success: true, reward: reward, balance: req.user.balance });
});

app.get('/api/notifications', auth, (req, res) => {
  const list = (db.notifications || []).filter(n => n.userId === req.user.id)
    .sort((a,b) => b.createdAt - a.createdAt).slice(0, 50);
  res.json(list);
});
app.post('/api/notifications/read', auth, (req, res) => {
  (db.notifications || []).filter(n => n.userId === req.user.id).forEach(n => n.read = true);
  saveDB(); res.json({success:true});
});

app.get('/api/leaderboard', (req, res) => {
  const totals = {};
  db.deposits.filter(d => d.status === 'approved').forEach(d => {
    totals[d.userId] = (totals[d.userId] || 0) + d.amount;
  });
  const list = db.users.map(u => ({ username: u.username, total: totals[u.id] || 0, vip: u.vip || 'Bronze' }))
    .filter(u => u.total > 0).sort((a,b) => b.total - a.total).slice(0, 10);
  res.json(list);
});

// ===== QR CODE (Feature 49) =====
app.get('/api/qr', (req, res) => {
  // simple QR-free — return pay info as data
  res.json({ number: db.config.payNumber, name: db.config.payName });
});

// ===== ADMIN =====
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const totalRevenue = db.orders.filter(o => o.status === 'completed').reduce((s,o) => s+o.price, 0);
  const todayRevenue = db.orders.filter(o => o.status === 'completed' && o.createdAt >= todayStart).reduce((s,o) => s+o.price, 0);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = d.getTime(); const end = start + 86400000;
    const rev = db.orders.filter(o => o.status === 'completed' && o.createdAt >= start && o.createdAt < end).reduce((s,o) => s+o.price, 0);
    days.push({ label: d.toLocaleDateString('en', {weekday:'short'}), value: rev });
  }
  res.json({ totalUsers: db.users.length, totalOrders: db.orders.length,
    pendingDeps: db.deposits.filter(d => d.status === 'pending').length,
    pendingOrders: db.orders.filter(o => o.status === 'pending').length,
    unreadChats: db.chats.filter(c => c.from === 'user' && !c.read).length,
    bannedUsers: db.banned.length,
    totalRevenue, todayRevenue,
    todayOrders: db.orders.filter(o => o.createdAt >= todayStart).length,
    todayUsers: db.users.filter(u => u.createdAt >= todayStart).length,
    chart: days, maintenance: db.config.maintenance });
});
app.get('/api/admin/deposits', adminAuth, (req, res) => res.json([...db.deposits].reverse()));
app.get('/api/admin/orders', adminAuth, (req, res) => res.json([...db.orders].reverse()));
app.get('/api/admin/users', adminAuth, (req, res) => res.json(db.users.map(u => ({
  username: u.username, balance: u.balance, phone: u.phone, points: u.points,
  cashback: u.cashback || 0, vip: u.vip || 'Bronze', totalSpent: u.totalSpent || 0,
  referralCode: u.referralCode, referredBy: u.referredBy, createdAt: u.createdAt,
  telegramId: u.telegramId || null, banned: db.banned.includes(u.username),
  achievements: u.achievements || [] }))));

// FEATURE 31 — Export CSV
app.get('/api/admin/export/:type', adminAuth, (req, res) => {
  const type = req.params.type;
  let rows = [], headers = [];
  if (type === 'users') {
    headers = ['Username','Balance','Phone','Points','VIP','TotalSpent','Referral','Joined'];
    rows = db.users.map(u => [u.username, u.balance, u.phone||'', u.points||0, u.vip||'Bronze',
      u.totalSpent||0, u.referralCode||'', new Date(u.createdAt).toISOString()]);
  } else if (type === 'orders') {
    headers = ['ID','Username','Game','Product','Price','Player','Status','Date'];
    rows = db.orders.map(o => [o.id, o.username, o.game, o.product, o.price, o.playerId, o.status, new Date(o.createdAt).toISOString()]);
  } else if (type === 'deposits') {
    headers = ['ID','Username','Amount','Method','Ref','Status','Date'];
    rows = db.deposits.map(d => [d.id, d.username, d.amount, d.method, d.ref, d.status, new Date(d.createdAt).toISOString()]);
  }
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
  res.send(csv);
});

app.post('/api/admin/approve-deposit', adminAuth, async (req, res) => {
  const dep = db.deposits.find(d => d.id === req.body.depositId);
  if (!dep || dep.status !== 'pending') return res.status(400).json({error:'Deposit မတွေ့'});
  const user = db.users.find(u => u.id === dep.userId);
  if (!user) return res.status(404).json({error:'User မတွေ့'});
  user.balance += dep.amount;
  dep.status = 'approved'; dep.approvedAt = Date.now();
  try { await sendPushToUser(user.id, '💰 Balance ဝင်ပြီ', '+' + dep.amount.toLocaleString() + ' Ks ဖြည့်ပြီးပါပြီ'); } catch(e){} dep.approvedBy = req.admin.username;
  db.chats.push({ id:'C'+Date.now(), userId: user.id, username: user.username, from:'admin',
    text:`✅ ငွေ ${dep.amount.toLocaleString()} Ks ဖြည့်မှု အတည်ပြုပြီးပါပြီ။ လက်ကျန်: ${user.balance.toLocaleString()} Ks`,
    createdAt: Date.now(), read:false });
  saveDB(); res.json({success:true});
});
app.post('/api/admin/reject-deposit', adminAuth, async (req, res) => {
  const dep = db.deposits.find(d => d.id === req.body.depositId);
  if (!dep) return res.status(404).json({error:'Deposit မတွေ့'});
  dep.status = 'rejected'; dep.rejectedBy = req.admin.username;
  db.chats.push({ id:'C'+Date.now(), userId: dep.userId, username: dep.username, from:'admin',
    text:`❌ ငွေ ${dep.amount.toLocaleString()} Ks ဖြည့်မှု ပယ်ဖျက်ခဲ့ပါတယ်။`, createdAt: Date.now(), read:false });
  saveDB(); res.json({success:true});
});
app.post('/api/admin/update-order-status', adminAuth, async (req, res) => {
  const { orderId, status } = req.body;
  const o = db.orders.find(x => x.id === orderId);
  if (!o) return res.status(404).json({error:'Order မတွေ့'});
  if (!['pending','processing','completed','rejected'].includes(status)) return res.status(400).json({error:'Status မှား'});
  if (status === 'rejected' && o.status !== 'rejected') {
    const u = db.users.find(x => x.id === o.userId);
    if (u) u.balance += o.price;
  }
  o.status = status; o.updatedAt = Date.now();
  const _pm = { processing:['⚙️ Order Processing','ပြင်ဆင်နေပါပြီ'], completed:['✅ Order Complete','ပြီးစီးပါပြီ!'], rejected:['❌ Order Reject','ပယ်ဖျက်ခဲ့ပါပြီ'] }[status];
  if (_pm) { try { await sendPushToUser(o.userId, _pm[0], _pm[1]); } catch(e){} }
  const msgs = {
    processing: `⚙️ Order ${o.id} (${o.product}) ပြင်ဆင်နေပါပြီ`,
    completed: `✅ Order ${o.id} (${o.product}) ပြီးစီးပါပြီ! ကျေးဇူးတင်ပါတယ်`,
    rejected: `❌ Order ${o.id} ပယ်ဖျက်ခဲ့ပါတယ်။ ${o.price.toLocaleString()} Ks ပြန်အမ်းပြီးပါပြီ`
  };
  if (msgs[status]) db.chats.push({ id:'C'+Date.now(), userId: o.userId, username: o.username,
    from:'admin', text: msgs[status], createdAt: Date.now(), read:false });
  saveDB(); res.json({success:true});
});
// FEATURE 38 — Bulk Order Status
app.post('/api/admin/bulk-order-status', adminAuth, (req, res) => {
  const { orderIds, status } = req.body;
  if (!Array.isArray(orderIds) || !['pending','processing','completed','rejected'].includes(status)) return res.status(400).json({error:'မှား'});
  let count = 0;
  orderIds.forEach(id => {
    const o = db.orders.find(x => x.id === id);
    if (!o || o.status === status) return;
    if (status === 'rejected' && o.status !== 'rejected') {
      const u = db.users.find(x => x.id === o.userId);
      if (u) u.balance += o.price;
    }
    o.status = status; o.updatedAt = Date.now();
    count++;
  });
  saveDB(); res.json({success:true, count});
});

// FEATURE 32 — Ban/Unban
app.post('/api/admin/ban', adminAuth, (req, res) => {
  const { username, ban } = req.body;
  if (ban) { if (!db.banned.includes(username)) db.banned.push(username); }
  else db.banned = db.banned.filter(x => x !== username);
  saveDB(); res.json({success:true, banned: db.banned.includes(username)});
});

// FEATURE 36 — Edit Balance
app.post('/api/admin/edit-balance', adminAuth, (req, res) => {
  const { username, balance } = req.body;
  const u = db.users.find(x => x.username === username);
  if (!u) return res.status(404).json({error:'User မတွေ့'});
  u.balance = Number(balance) || 0;
  saveDB(); res.json({success:true, balance: u.balance});
});

// FEATURE 37 — User History
app.get('/api/admin/user-history/:username', adminAuth, (req, res) => {
  const u = db.users.find(x => x.username === req.params.username);
  if (!u) return res.status(404).json({error:'User မတွေ့'});
  res.json({
    user: { username:u.username, balance:u.balance, phone:u.phone, vip:u.vip, totalSpent:u.totalSpent, createdAt:u.createdAt },
    orders: db.orders.filter(o => o.userId === u.id),
    deposits: db.deposits.filter(d => d.userId === u.id),
    chats: db.chats.filter(c => c.userId === u.id).length
  });
});

// FEATURE 33 — Broadcast
app.post('/api/admin/broadcast', adminAuth, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({error:'စာ ရေးပါ'});
  const b = { id:'B'+Date.now(), text, at: Date.now(), by: req.admin.username };
  db.broadcasts.push(b);
  let count = 0;
  db.users.forEach(u => {
    db.chats.push({ id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId:u.id,
      username:u.username, from:'admin', text:`📢 ${text}`, createdAt:Date.now(), read:false });
    count++;
  });
  saveDB();
  res.json({success:true, sent: count});
});
// FEATURE 34 — Bulk Chat
app.post('/api/admin/bulk-chat', adminAuth, (req, res) => {
  const { usernames, text } = req.body;
  if (!Array.isArray(usernames) || !text) return res.status(400).json({error:'ဖြည့်ပါ'});
  let count = 0;
  usernames.forEach(un => {
    const u = db.users.find(x => x.username === un);
    if (u) {
      db.chats.push({ id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId:u.id,
        username:u.username, from:'admin', text, createdAt:Date.now(), read:false });
      count++;
    }
  });
  saveDB();
  res.json({success:true, sent: count});
});

// CHAT
app.get('/api/admin/chats', adminAuth, (req, res) => {
  const map = {};
  db.chats.forEach(c => {
    if (!map[c.userId]) map[c.userId] = { userId:c.userId, username:c.username, last:null, unread:0 };
    if (!map[c.userId].last || c.createdAt > map[c.userId].last.createdAt) map[c.userId].last = c;
    if (c.from === 'user' && !c.read) map[c.userId].unread++;
  });
  res.json(Object.values(map).sort((a,b)=>(b.last?.createdAt||0)-(a.last?.createdAt||0)));
});
app.get('/api/admin/chat/:userId', adminAuth, (req, res) => {
  const msgs = db.chats.filter(c => c.userId === req.params.userId).sort((a,b)=>a.createdAt-b.createdAt);
  msgs.forEach(m => { if (m.from === 'user') m.read = true; });
  saveDB();
  res.json(msgs);
});
app.post('/api/admin/chat', adminAuth, async (req, res) => {
  const { userId, text, image, audio } = req.body;
  if (!userId || (!text && !image && !audio)) return res.status(400).json({error:'ဖြည့်ပါ'});
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({error:'User မတွေ့'});
  const m = { id:'C'+Date.now()+Math.random().toString(36).slice(2,5), userId, username: user.username,
    from:'admin', text: text||'', image: image||null, audio: audio||null,
    createdAt: Date.now(), read:false };
  db.chats.push(m); saveDB();
  if (user.telegramId && bot.notifyUser) bot.notifyUser(user, text || '[Attachment]');
  res.json({success:true, message:m});
});

// PRODUCTS
app.get('/api/admin/products', adminAuth, (req, res) => res.json(db.products));
app.post('/api/admin/products', adminAuth, superAdmin, (req, res) => {
  const { game, name, price, image, category, imgUrl, subCategory } = req.body;
  if (!game || !name || !price) return res.status(400).json({error:'ဖြည့်ပါ'});
  const id = (Math.max(0, ...db.products.map(p=>p.id)) + 1);
  db.products.push({ id, game, name, price: Number(price), image: image || '🎮', imgUrl: imgUrl || null, category: category || 'Other', subCategory: subCategory || null });
  saveDB(); res.json({success:true});
});
app.put('/api/admin/products/:id', adminAuth, superAdmin, (req, res) => {
  const p = db.products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({error:'Product မတွေ့'});
  ['game','name','price','image','category','imgUrl','subCategory'].forEach(k => { if (req.body[k] !== undefined) p[k] = k==='price'?Number(req.body[k]):req.body[k]; });
  saveDB(); res.json({success:true});
});
app.delete('/api/admin/products/:id', adminAuth, superAdmin, (req, res) => {
  db.products = db.products.filter(p => p.id !== Number(req.params.id));
  saveDB(); res.json({success:true});
});

// GAME IMAGES
app.get('/api/admin/gameImages', adminAuth, (req, res) => res.json(db.gameImages));
app.post('/api/admin/gameImages', adminAuth, superAdmin, (req, res) => {
  const { game, url } = req.body;
  if (!game) return res.status(400).json({error:'ဂိမ်းနာမည် ဖြည့်ပါ'});
  if (url) db.gameImages[game] = url; else delete db.gameImages[game];
  saveDB(); res.json({success:true});
});

// COUPONS Admin (Feature 24)
app.get('/api/admin/coupons', adminAuth, (req, res) => res.json(db.config.coupons || {}));
app.post('/api/admin/coupons', adminAuth, superAdmin, (req, res) => {
  const { code, amount, uses } = req.body;
  if (!code || !amount) return res.status(400).json({error:'ဖြည့်ပါ'});
  if (!db.config.coupons) db.config.coupons = {};
  db.config.coupons[code.toUpperCase()] = { amount:Number(amount), uses:Number(uses)||100, usesLeft:Number(uses)||100, expires:0 };
  saveDB(); res.json({success:true});
});
app.delete('/api/admin/coupons/:code', adminAuth, superAdmin, (req, res) => {
  if (db.config.coupons) delete db.config.coupons[req.params.code];
  saveDB(); res.json({success:true});
});

// ADMINS
app.get('/api/admin/activity', adminAuth, (req, res) => res.json((db.activityLog||[]).slice(-100).reverse()));
app.post('/api/admin/auto-reply', adminAuth, superAdmin, (req, res) => {
  db.config.autoReply = req.body.autoReply || {};
  saveDB(); logActivity(req.admin.username, 'update-auto-reply', ''); res.json({success:true});
});
app.get('/api/admin/auto-reply', adminAuth, (req, res) => res.json(db.config.autoReply || {}));
app.post('/api/admin/user-bonus', adminAuth, superAdmin, (req, res) => {
  const { username, amount, reason } = req.body;
  const u = db.users.find(x => x.username === username);
  if (!u) return res.status(404).json({error:'User မတွေ့'});
  u.balance = (u.balance||0) + Number(amount||0);
  if (!db.notifications) db.notifications = [];
  db.notifications.push({ id:'N'+Date.now(), userId: u.id, message: '🎁 Admin Bonus: +' + Number(amount).toLocaleString() + ' Ks' + (reason ? ' (' + reason + ')' : ''), read:false, createdAt: Date.now() });
  saveDB(); logActivity(req.admin.username, 'user-bonus', username + ' +' + amount);
  res.json({success:true, balance: u.balance});
});
app.get('/api/admin/user-report/:username', adminAuth, (req, res) => {
  const u = db.users.find(x => x.username === req.params.username);
  if (!u) return res.status(404).json({error:'User မတွေ့'});
  const orders = db.orders.filter(o => o.userId === u.id);
  const deps = db.deposits.filter(d => d.userId === u.id);
  res.json({
    user: { username: u.username, balance: u.balance, points: u.points||0, vip: u.vip||'Bronze', phone: u.phone||'', createdAt: u.createdAt, loginHistory: u.loginHistory||[], telegramId: !!u.telegramId, twoFA: u.twoFA||false },
    stats: {
      totalOrders: orders.length, completedOrders: orders.filter(o=>o.status==='completed').length,
      rejectedOrders: orders.filter(o=>o.status==='rejected').length,
      totalDeposited: deps.filter(d=>d.status==='approved').reduce((s,d)=>s+d.amount,0),
      totalSpent: orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.price,0),
      chats: db.chats.filter(c=>c.userId===u.id).length
    },
    orders: orders.slice(0,10), deposits: deps.slice(0,10)
  });
});
app.post('/api/admin/backup-now', adminAuth, async (req, res) => {
  const r = await backupToGitHub(false);
  res.json(r);
});
app.get('/api/admin/backup-config', adminAuth, (req, res) => {
  const c = db.config.githubBackup || {};
  res.json({ enabled: c.enabled, owner: c.owner, repo: c.repo, branch: c.branch, intervalMin: c.intervalMin, hasToken: !!c.token, lastBackup: c.lastBackup });
});
app.post('/api/admin/backup-config', adminAuth, superAdmin, (req, res) => {
  const { enabled, token, owner, repo, branch, intervalMin } = req.body;
  if (!db.config.githubBackup) db.config.githubBackup = {};
  const c = db.config.githubBackup;
  if (typeof enabled === 'boolean') c.enabled = enabled;
  if (token !== undefined && token !== '') c.token = token;
  if (owner !== undefined) c.owner = owner;
  if (repo !== undefined) c.repo = repo;
  if (branch !== undefined) c.branch = branch;
  if (intervalMin !== undefined) c.intervalMin = Number(intervalMin);
  if (!c.path) c.path = 'db.json';
  saveDB();
  res.json({ success: true });
});
app.post('/api/admin/restore', adminAuth, superAdmin, async (req, res) => {
  const ok = await restoreFromGitHub();
  res.json({ success: ok });
});
app.get('/api/admin/admins', adminAuth, superAdmin, (req, res) => res.json(db.admins.map(a => ({username:a.username, role:a.role, createdAt:a.createdAt}))));
app.post('/api/admin/admins', adminAuth, superAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({error:'ဖြည့်ပါ'});
  if (db.admins.find(a => a.username === username)) return res.status(400).json({error:'Admin ရှိပြီးသား'});
  db.admins.push({username, password, role: role === 'super' ? 'super' : 'normal', createdAt: Date.now()});
  saveDB(); res.json({success:true});
});
app.delete('/api/admin/admins/:username', adminAuth, superAdmin, (req, res) => {
  if (req.params.username === req.admin.username) return res.status(400).json({error:'မိမိကိုယ်ကို ဖျက်လို့မရ'});
  db.admins = db.admins.filter(a => a.username !== req.params.username);
  saveDB(); res.json({success:true});
});

// CONFIG
app.post('/api/admin/upload', adminAuth, (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:')) return res.status(400).json({error:'မှား'});
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return res.status(400).json({error:'Format မှား'});
  const mime = m[1];
  const b64 = m[2];
  const size = b64.length * 0.75;
  if (size > 5 * 1024 * 1024) return res.status(400).json({error:'File 5MB အောက်သာ'});
  if (!db.uploads) db.uploads = {};
  const id = 'u' + Date.now() + Math.random().toString(36).substring(2, 6);
  db.uploads[id] = { mime, data: b64, size: Math.floor(size), at: Date.now() };
  const keys = Object.keys(db.uploads);
  if (keys.length > 100) {
    keys.slice(0, keys.length - 100).forEach(k => delete db.uploads[k]);
  }
  saveDB();
  logActivity(req.admin.username, 'upload', id + ' (' + Math.floor(size/1024) + 'KB)');
  res.json({ success: true, url: '/api/upload/' + id, id: id, size: Math.floor(size) });
});

app.get('/api/upload/:id', (req, res) => {
  if (!db.uploads || !db.uploads[req.params.id]) return res.status(404).send('Not found');
  const u = db.uploads[req.params.id];
  const buf = Buffer.from(u.data, 'base64');
  res.setHeader('Content-Type', u.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.send(buf);
});

app.get('/api/admin/uploads', adminAuth, (req, res) => {
  const list = Object.entries(db.uploads || {}).map(([id, u]) => ({
    id, url: '/api/upload/' + id, size: u.size, mime: u.mime, at: u.at
  })).sort((a, b) => b.at - a.at);
  res.json(list);
});

app.delete('/api/admin/uploads/:id', adminAuth, superAdmin, (req, res) => {
  if (db.uploads && db.uploads[req.params.id]) {
    delete db.uploads[req.params.id];
    saveDB();
    res.json({success: true});
  } else res.status(404).json({error: 'Not found'});
});

app.get('/api/admin/config', adminAuth, (req, res) => res.json(db.config));

// ===== VIDEO GUIDES API =====
app.get('/api/admin/videos', adminAuth, (req, res) => {
  res.json({
    videos: db.config.videos || [],
    categories: db.config.videoCategories || [],
    title: db.config.videoGuideTitle || '📺 Video Guides',
    desc: db.config.videoGuideDesc || '',
    enabled: db.config.videoSectionEnabled !== false
  });
});

app.post('/api/admin/videos', adminAuth, superAdmin, (req, res) => {
  var videos = req.body.videos;
  if (!Array.isArray(videos)) return res.status(400).json({ error: 'videos must be array' });
  if (!db.config) db.config = {};
  db.config.videos = videos;
  saveDB();
  logActivity(req.admin.username, 'update-videos', videos.length + ' videos');
  res.json({ success: true, count: videos.length });
});

app.post('/api/admin/videos/settings', adminAuth, superAdmin, (req, res) => {
  var title = req.body.title;
  var desc = req.body.desc;
  var enabled = req.body.enabled;
  var categories = req.body.categories;
  if (!db.config) db.config = {};
  if (typeof title === 'string') db.config.videoGuideTitle = title;
  if (typeof desc === 'string') db.config.videoGuideDesc = desc;
  if (typeof enabled === 'boolean') db.config.videoSectionEnabled = enabled;
  if (Array.isArray(categories)) db.config.videoCategories = categories;
  saveDB();
  res.json({ success: true });
});

app.post('/api/admin/config/section', adminAuth, superAdmin, (req, res) => {
  const { section, value } = req.body;
  if (!section) return res.status(400).json({error:'Section လိုတယ်'});
  if (!db.config) db.config = {};
  db.config[section] = value;
  saveDB();
  logActivity(req.admin.username, 'config-update', section);
  res.json({success:true});
});
app.get('/api/admin/config/section/:name', adminAuth, (req, res) => {
  res.json(db.config[req.params.name] || null);
});
app.post('/api/admin/config', adminAuth, superAdmin, (req, res) => {
  const { maintenance, coupons, ...rest } = req.body;
  db.config = {...db.config, ...rest};
  saveDB(); res.json({success:true});
});
app.post('/api/admin/maintenance', adminAuth, superAdmin, (req, res) => {
  const { enabled, message } = req.body;
  if (!db.config.maintenance) db.config.maintenance = { enabled:false, message:'' };
  if (typeof enabled === 'boolean') db.config.maintenance.enabled = enabled;
  if (message !== undefined) db.config.maintenance.message = message;
  saveDB(); res.json({ success: true, maintenance: db.config.maintenance });
});

// BANNERS
app.get('/api/admin/banners', adminAuth, (req, res) => res.json(db.banners));
app.post('/api/admin/banners', adminAuth, superAdmin, (req, res) => {
  if (!Array.isArray(req.body.banners)) return res.status(400).json({error:'မှား'});
  db.banners = req.body.banners;
  saveDB(); res.json({success:true});
});

async function ghApi(method, url, token, body) {
  try {
    const r = await fetch('https://api.github.com' + url, {
      method: method,
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SafeZone-Backup'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return await r.json();
  } catch(e) { console.log('ghApi err:', e.message); return null; }
}

async function backupToGitHub(silent) {
  const cfg = db.config.githubBackup;
  if (!cfg || !cfg.enabled || !cfg.token || !cfg.owner || !cfg.repo) {
    if (!silent) console.log('GitHub backup: not configured');
    return { error: 'Not configured' };
  }
  const path = cfg.path || 'db.json';
  const data = fs.readFileSync(DB_FILE, 'utf8');
  const content = Buffer.from(data).toString('base64');
  const apiPath = '/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path;
  let sha = null;
  const existing = await ghApi('GET', apiPath + '?ref=' + (cfg.branch || 'main'), cfg.token);
  if (existing && existing.sha) sha = existing.sha;
  const body = {
    message: 'Auto backup ' + new Date().toISOString(),
    content: content,
    branch: cfg.branch || 'main'
  };
  if (sha) body.sha = sha;
  const res = await ghApi('PUT', apiPath, cfg.token, body);
  if (res && res.commit) {
    cfg.lastBackup = Date.now();
    saveDB();
    console.log('GitHub backup OK:', res.commit.sha.substring(0, 7));
    return { success: true, sha: res.commit.sha };
  } else {
    console.log('GitHub backup FAILED:', res && res.message);
    return { error: (res && res.message) || 'Failed' };
  }
}

async function restoreFromGitHub() {
  const cfg = db.config.githubBackup;
  if (!cfg || !cfg.enabled || !cfg.token || !cfg.owner || !cfg.repo) return false;
  const path = cfg.path || 'db.json';
  const apiPath = '/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path;
  const res = await ghApi('GET', apiPath + '?ref=' + (cfg.branch || 'main'), cfg.token);
  if (res && res.content) {
    try {
      const data = Buffer.from(res.content, 'base64').toString('utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.users) {
        db = parsed;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('Restored from GitHub:', parsed.users.length, 'users');
        return true;
      }
    } catch(e) { console.log('Restore parse err:', e.message); }
  }
  return false;
}

function startBackupLoop() {
  setInterval(function() {
    const cfg = db.config.githubBackup;
    if (!cfg || !cfg.enabled || !cfg.token) return;
    const minMs = (cfg.intervalMin || 5) * 60 * 1000;
    if (Date.now() - (cfg.lastBackup || 0) >= minMs) {
      backupToGitHub(true);
    }
  }, 60000);
  console.log('Backup loop started');
}


async function sendPushToUser(userId, title, body, data) {
  if (!db.subscriptions) return 0;
  const subs = db.subscriptions.filter(x => x.userId === userId);
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({
        title: title, body: body, data: data || {}, url: '/app.html'
      }));
      sent++;
    } catch(e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.subscriptions = db.subscriptions.filter(x => x.endpoint !== sub.endpoint);
      }
    }
  }
  if (sent) saveDB();
  return sent;
}
async function sendPushToAll(title, body, data) {
  const uids = [...new Set((db.subscriptions||[]).map(x => x.userId))];
  let t = 0;
  for (const uid of uids) t += await sendPushToUser(uid, title, body, data);
  return t;
}

const PORT = process.env.PORT || 3000;

// ============ REDEEM POINTS ============
app.post('/api/redeem-points', auth, (req, res) => {
  try {
    const pts = Number((req.body || {}).points) || 0;
    if (pts < 100) return res.json({ success: false, error: '100 Points အနည်းဆုံး လိုတယ်' });
    if (pts % 100 !== 0) return res.json({ success: false, error: '100 ရဲ့ ဆတိုး ဖြစ်ရမယ်' });
    const cfg = db.config || {};
    const rate = Number(cfg.pointsRedeemRate) || 10;
    const amount = pts * rate;
    const u = req.user;
    if (!u) return res.json({ success: false, error: 'User မတွေ့' });
    if ((u.points || 0) < pts) return res.json({ success: false, error: 'Points မလုံလောက်ပါ' });
    u.points = (u.points || 0) - pts;
    u.balance = (u.balance || 0) + amount;
    if (!db.redeems) db.redeems = [];
    db.redeems.push({
      id: 'R' + Date.now(),
      username: u.username,
      points: pts,
      amount: amount,
      rate: rate,
      createdAt: new Date().toISOString()
    });
    saveDB();
    res.json({ success: true, amount: amount, points: u.points, balance: u.balance });
  } catch(e) { res.json({ success: false, error: e.message }); }
});

// ============ ANNOUNCEMENT (F9) ============
app.get('/api/announcement', (req, res) => {
  const a = (db.config && db.config.announcement) || {};
  res.json({ enabled: !!a.enabled, text: String(a.text || ''), type: a.type || 'info', updatedAt: a.updatedAt || 0 });
});
app.post('/api/admin/announcement', adminAuth, (req, res) => {
  try {
    if (!db.config) db.config = {};
    db.config.announcement = {
      enabled: !!req.body.enabled,
      text: String(req.body.text || '').substring(0, 500),
      type: req.body.type || 'info',
      updatedAt: Date.now()
    };
    saveDB();
    res.json({ success: true });
  } catch(e) { res.json({ success: false, error: e.message }); }
});

// ============ GAMES LIST (F10) ============
app.get('/api/games/list', (req, res) => {
  try {
    const games = {};
    (db.products || []).forEach(p => { if (p && p.game) games[p.game] = (games[p.game] || 0) + 1; });
    res.json({ games: Object.keys(games), total: Object.keys(games).length });
  } catch(e) { res.json({ games: [], total: 0 }); }
});

app.listen(PORT, () => console.log('✅ Server running on port ' + PORT));
try { startBackupLoop(); } catch(e) { console.log("Backup loop err:", e.message); }
const bot = startBot({ getDb: () => db, saveDb: () => saveDB() });
console.log('🤖 Telegram bot starting...');
