import { json, getDB, saveDB, getAdmin } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    
    const db = await getDB(env);
    
    // ============ PRODUCTS ============
    const products = [
      // Mobile Legends
      { id: 1, game: 'Mobile Legends', name: '86 Diamonds', price: 3000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 2, game: 'Mobile Legends', name: '172 Diamonds', price: 5500, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 3, game: 'Mobile Legends', name: '257 Diamonds', price: 8000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 4, game: 'Mobile Legends', name: '355 Diamonds', price: 11000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 5, game: 'Mobile Legends', name: '706 Diamonds', price: 22000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 6, game: 'Mobile Legends', name: '2195 Diamonds', price: 65000, image: '💎', category: 'MOBA', subCategory: null, imgUrl: '' },
      // PUBG Mobile
      { id: 7, game: 'PUBG Mobile', name: '60 UC', price: 2500, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 8, game: 'PUBG Mobile', name: '325 UC', price: 12000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 9, game: 'PUBG Mobile', name: '660 UC', price: 24000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 10, game: 'PUBG Mobile', name: '1800 UC', price: 65000, image: '🔫', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      // Magic Chess
      { id: 11, game: 'Magic Chess', name: '86 Diamonds', price: 3000, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 12, game: 'Magic Chess', name: '172 Diamonds', price: 5500, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 13, game: 'Magic Chess', name: '257 Diamonds', price: 8000, image: '♟️', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 14, game: 'Magic Chess', name: 'Weekly Pass', price: 6000, image: '🎫', category: 'Casual', subCategory: null, imgUrl: '' },
      // App Premium
      { id: 15, game: 'App Premium', name: '1 Month', price: 15000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 16, game: 'App Premium', name: '3 Months', price: 40000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 17, game: 'App Premium', name: '1 Year', price: 120000, image: '⭐', category: 'Premium', subCategory: null, imgUrl: '' }
    ];
    
    db.products = products;
    
    // ============ GAME IMAGES ============
    db.gameImages = {
      'Mobile Legends': 'https://i.imgur.com/II8UVaO.jpeg',
      'PUBG Mobile': 'https://i.imgur.com/pgJ40tp.jpeg',
      'Magic Chess': 'https://i.imgur.com/cwKbLD6.jpeg',
      'App Premium': 'https://i.imgur.com/jnz2vQg.jpeg'
    };
    
    // ============ BANNERS ============
    db.banners = [
      { title: 'Welcome to Safe Zone', subtitle: 'Fast & Safe Game Top-Up', bg: 'linear-gradient(135deg,#38bdf8,#a855f7)' },
      { title: 'MLBB Diamonds', subtitle: '5000 Ks မှစ၍', bg: 'linear-gradient(135deg,#10b981,#3b82f6)' },
      { title: 'Magic Chess', subtitle: 'အထူး Promotion များ', bg: 'linear-gradient(135deg,#a855f7,#ec4899)' }
    ];
    
    // ============ CONFIG UPDATE ============
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
    
    // ============ BOT RULES ============
    db.config.chatBot = {
      enabled: true,
      rules: [
        { keywords: ['hi','hello','hey','မင်္ဂလာပါ'], reply: '👋 မင်္ဂလာပါ! Safe Zone မှ ကြိုဆိုပါတယ်\n\n💰 ငွေဖြည့် · 📦 Order · 🎁 Promo' },
        { keywords: ['deposit','ငွေဖြည့်'], reply: '💰 Wallet tab မှာ ငွေဖြည့်ပါ' },
        { keywords: ['order','ဝယ်','မှာတမ်း'], reply: '📦 Home မှာ ဂိမ်းရွေးပြီး Order တင်ပါ' },
        { keywords: ['ကျေးဇူး','thanks'], reply: '🙏 ကျေးဇူးတင်ပါတယ်!' }
      ]
    };
    
    // ============ ADMIN ACCOUNT ============
    if (!db.admins || !db.admins.length) {
      db.admins = [{ username: 'admin', password: '2102002', role: 'super' }];
    }
    
    // Save
    await saveDB(env, db);
    
    return json({
      success: true,
      message: 'Data ပြန်ထည့်ပြီ',
      stats: {
        products: db.products.length,
        banners: db.banners.length,
        gameImages: Object.keys(db.gameImages).length,
        botRules: db.config.chatBot.rules.length
      }
    });
  } catch(e) {
    return json({ success: false, error: e.message }, 500);
  }
}
