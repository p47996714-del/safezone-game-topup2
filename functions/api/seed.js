import { getDB, saveDB, getAdmin } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return new Response('Unauthorized', { status: 401 });
    
    const db = await getDB(env);
    db.products = [
      { id: 1, game: 'Mobile Legends', name: '86 Diamonds', price: 3000, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 2, game: 'Mobile Legends', name: '172 Diamonds', price: 5500, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 3, game: 'Mobile Legends', name: '257 Diamonds', price: 8000, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 4, game: 'Mobile Legends', name: '355 Diamonds', price: 11000, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 5, game: 'Mobile Legends', name: '706 Diamonds', price: 22000, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 6, game: 'Mobile Legends', name: '2195 Diamonds', price: 65000, image: 'D', category: 'MOBA', subCategory: null, imgUrl: '' },
      { id: 7, game: 'PUBG Mobile', name: '60 UC', price: 2500, image: 'U', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 8, game: 'PUBG Mobile', name: '325 UC', price: 12000, image: 'U', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 9, game: 'PUBG Mobile', name: '660 UC', price: 24000, image: 'U', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 10, game: 'PUBG Mobile', name: '1800 UC', price: 65000, image: 'U', category: 'Battle Royale', subCategory: null, imgUrl: '' },
      { id: 11, game: 'Magic Chess', name: '86 Diamonds', price: 3000, image: 'C', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 12, game: 'Magic Chess', name: '172 Diamonds', price: 5500, image: 'C', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 13, game: 'Magic Chess', name: '257 Diamonds', price: 8000, image: 'C', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 14, game: 'Magic Chess', name: 'Weekly Pass', price: 6000, image: 'P', category: 'Casual', subCategory: null, imgUrl: '' },
      { id: 15, game: 'App Premium', name: '1 Month', price: 15000, image: 'S', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 16, game: 'App Premium', name: '3 Months', price: 40000, image: 'S', category: 'Premium', subCategory: null, imgUrl: '' },
      { id: 17, game: 'App Premium', name: '1 Year', price: 120000, image: 'S', category: 'Premium', subCategory: null, imgUrl: '' }
    ];
    db.gameImages = {
      'Mobile Legends': 'https://i.imgur.com/II8UVaO.jpeg',
      'PUBG Mobile': 'https://i.imgur.com/pgJ40tp.jpeg',
      'Magic Chess': 'https://i.imgur.com/cwKbLD6.jpeg',
      'App Premium': 'https://i.imgur.com/jnz2vQg.jpeg'
    };
    db.banners = [
      { title: 'Welcome to Safe Zone', subtitle: 'Fast Safe Top-Up', bg: 'linear-gradient(135deg,#38bdf8,#a855f7)' },
      { title: 'MLBB Diamonds', subtitle: '5000 Ks up', bg: 'linear-gradient(135deg,#10b981,#3b82f6)' },
      { title: 'Magic Chess', subtitle: 'Special Promo', bg: 'linear-gradient(135deg,#a855f7,#ec4899)' }
    ];
    if (!db.config) db.config = {};
    db.config.siteName = 'Safe Zone Game Topup';
    db.config.payNumber = '09763442881';
    db.config.payName = 'Safe Zone';
    db.config.hero = { title: 'Safe Zone Topup', subtitle: 'Instant Delivery 24/7', videoUrl: '' };
    db.config.theme = { primary: '#38bdf8', secondary: '#a855f7' };
    db.config.labels = { balance: 'Balance', gamesTitle: 'Games', searchPlaceholder: 'Search', popularTitle: 'Popular', paymentTitle: 'Payment' };
    db.config.trustBadges = [{ icon: 'V', text: 'Verified Shop' }, { icon: 'F', text: 'Fast Delivery' }, { icon: 'S', text: 'Safe Payment' }];
    db.config.faq = [
      { q: 'Deposit time?', a: '5-15 minutes' },
      { q: 'Order reject?', a: 'Balance refunded' },
      { q: 'Server ID needed?', a: 'For MLBB/Magic Chess' }
    ];
    db.config.chatBot = {
      enabled: true,
      rules: [
        { keywords: ['hi', 'hello', 'hey'], reply: 'Welcome to Safe Zone!' },
        { keywords: ['deposit'], reply: 'Go to Wallet tab' },
        { keywords: ['order'], reply: 'Select game on Home' }
      ]
    };
    db.config.payments = [
      { name: 'KBZ Pay', short: 'KBZ', cls: 'kbz' },
      { name: 'Wave Money', short: 'Wave', cls: 'wave' },
      { name: 'UAB Pay', short: 'UAB', cls: 'uab' },
      { name: 'AYA Pay', short: 'AYA', cls: 'aya' }
    ];
    db.config.maintenance = { enabled: false, message: 'Under maintenance' };
    db.config.pointsBaseRate = 100;
    db.config.pointsMultiplier = 1;
    db.config.pointsRedeemRate = 10;
    if (!db.admins || !db.admins.length) db.admins = [{ username: 'admin', password: '2102002', role: 'super' }];
    if (!db.users) db.users = [];
    if (!db.orders) db.orders = [];
    if (!db.deposits) db.deposits = [];
    if (!db.chats) db.chats = [];
    if (!db.sessions) db.sessions = {};
    if (!db.coupons) db.coupons = {};
    await saveDB(env, db);
    return new Response(JSON.stringify({ success: true, products: db.products.length, banners: db.banners.length, botRules: db.config.chatBot.rules.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
