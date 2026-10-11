import { json, getDB, saveDB } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== 'safezone2026') {
      return new Response('<h2>❌ Key မှား</h2>', { status: 401, headers: { 'Content-Type': 'text/html' } });
    }
    
    const db = await getDB(env);
    
    // PRODUCTS
    db.products = [
      { id: 1, game: 'Mobile Legends', name: '86 Diamonds', price: 3000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 2, game: 'Mobile Legends', name: '172 Diamonds', price: 5500, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 3, game: 'Mobile Legends', name: '257 Diamonds', price: 8000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 4, game: 'Mobile Legends', name: '355 Diamonds', price: 11000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 5, game: 'Mobile Legends', name: '706 Diamonds', price: 22000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 6, game: 'Mobile Legends', name: '2195 Diamonds', price: 65000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 7, game: 'PUBG Mobile', name: '60 UC', price: 2500, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 8, game: 'PUBG Mobile', name: '325 UC', price: 12000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 9, game: 'PUBG Mobile', name: '660 UC', price: 24000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 10, game: 'PUBG Mobile', name: '1800 UC', price: 65000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 11, game: 'Magic Chess', name: '86 Diamonds', price: 3000, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 12, game: 'Magic Chess', name: '172 Diamonds', price: 5500, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 13, game: 'Magic Chess', name: '257 Diamonds', price: 8000, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 14, game: 'Magic Chess', name: 'Weekly Pass', price: 6000, image: '🎫', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 15, game: 'App Premium', name: '1 Month', price: 15000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 16, game: 'App Premium', name: '3 Months', price: 40000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 17, game: 'App Premium', name: '1 Year', price: 120000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' }
    ];
    
    // GAME IMAGES
    db.gameImages = {
      'Mobile Legends': 'https://i.imgur.com/II8UVaO.jpeg',
      'PUBG Mobile': 'https://i.imgur.com/pgJ40tp.jpeg',
      'Magic Chess': 'https://i.imgur.com/cwKbLD6.jpeg',
      'App Premium': 'https://i.imgur.com/jnz2vQg.jpeg'
    };
    
    // BANNERS
    db.banners = [
      { title: 'Welcome to Safe Zone', subtitle: 'Fast & Safe Game Top-Up', bg: 'linear-gradient(135deg,#38bdf8,#a855f7)' },
      { title: 'MLBB Diamonds', subtitle: '5000 Ks မှစ၍', bg: 'linear-gradient(135deg,#10b981,#3b82f6)' },
      { title: 'Magic Chess', subtitle: 'အထူး Promotion များ', bg: 'linear-gradient(135deg,#a855f7,#ec4899)' }
    ];
    
    // CONFIG
    if (!db.config) db.config = {};
    db.config.siteName = 'Safe Zone Game Topup';
    db.config.payNumber = '09763442881';
    db.config.payName = 'Safe Zone';
    db.config.hero = { title: 'Safe Zone Topup', subtitle: '⚡ Instant Delivery · 24/7', videoUrl: '' };
    db.config.theme = { primary: '#38bdf8', secondary: '#a855f7' };
    db.config.labels = {
      balance: '💰 လက်ကျန်ငွေ',
      gamesTitle: '🎮 ဂိမ်းများ',
      searchPlaceholder: '🔍 ဂိမ်း ရှာပါ...',
      popularTitle: '🔥 Popular',
      paymentTitle: '💰 Wallet ဖြည့်ရန်'
    };
    db.config.trustBadges = [
      { icon: '✅', text: 'Verified Shop' },
      { icon: '⚡', text: 'Fast Delivery' },
      { icon: '🛡️', text: 'Safe Payment' }
    ];
    db.config.faq = [
      { q: '💰 Deposit ဘယ်လောက်ကြာ?', a: '၅-၁၅ မိနစ်အတွင်း approve' },
      { q: '❌ Order Reject ရင်?', a: 'Balance ပြန်အမ်းပါတယ်' },
      { q: '🆔 Server ID လိုလား?', a: 'MLBB/Magic Chess အတွက် လိုတယ်' }
    ];
    db.config.chatBot = {
      enabled: true,
      rules: [
        { keywords: ['hi','hello','hey','မင်္ဂလာပါ'], reply: '👋 မင်္ဂလာပါ! Safe Zone မှ ကြိုဆိုပါတယ်\n\n💰 ငွေဖြည့် · 📦 Order · 🎁 Promo' },
        { keywords: ['deposit','ငွေဖြည့်'], reply: '💰 Wallet tab မှာ ငွေဖြည့်ပါ' },
        { keywords: ['order','ဝယ်','မှာတမ်း'], reply: '📦 Home မှာ ဂိမ်းရွေးပြီး Order တင်ပါ' },
        { keywords: ['ကျေးဇူး','thanks'], reply: '🙏 ကျေးဇူးတင်ပါတယ်!' }
      ]
    };
    db.config.payments = [
      { name: 'KBZ Pay', short: 'KBZ', cls: 'kbz' },
      { name: 'Wave Money', short: 'Wave', cls: 'wave' },
      { name: 'UAB Pay', short: 'UAB', cls: 'uab' },
      { name: 'AYA Pay', short: 'AYA', cls: 'aya' }
    ];
    db.config.maintenance = { enabled: false, message: '🔧 ပြုပြင်နေပါသည်။' };
    db.config.pointsBaseRate = 100;
    db.config.pointsMultiplier = 1;
    db.config.pointsRedeemRate = 10;
    
    if (!db.admins || !db.admins.length) {
      db.admins = [{ username: 'admin', password: '2102002', role: 'super' }];
    }
    if (!db.users) db.users = [];
    if (!db.orders) db.orders = [];
    if (!db.deposits) db.deposits = [];
    if (!db.chats) db.chats = [];
    if (!db.sessions) db.sessions = {};
    if (!db.coupons) db.coupons = {};
    
    await saveDB(env, db);
    
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Seed Done</title>
<style>body{background:#0f172a;color:#22c55e;font-family:sans-serif;text-align:center;padding:40px}
h1{font-size:28px;margin-bottom:20px}
.box{background:#1e293b;padding:20px;border-radius:16px;display:inline-block;text-align:left;margin-top:20px}
.row{padding:8px 0;color:#fff;font-size:14px}
.row b{color:#38bdf8}
a{display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#38bdf8,#a855f7);color:#fff;text-decoration:none;border-radius:12px;font-weight:bold}
</style>
</head>
<body>
<h1>✅ Data ပြန်ထည့်ပြီ!</h1>
<div class="box">
<div class="row">📦 Products: <b>${db.products.length}</b></div>
<div class="row">🎮 Game Images: <b>${Object.keys(db.gameImages).length}</b></div>
<div class="row">🖼️ Banners: <b>${db.banners.length}</b></div>
<div class="row">🤖 Bot Rules: <b>${db.config.chatBot.rules.length}</b></div>
<div class="row">💰 Payments: <b>${db.config.payments.length}</b></div>
</div>
<div><a href="/">← Site ပြန်သွား</a></div>
</body>
</html>`;
    
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch(e) {
    return new Response('<h2>❌ Error: ' + e.message + '</h2>', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
