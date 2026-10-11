export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function getDB(env) {
  try {
    const raw = await env.DB.get('safezone_data');
    if (!raw) return getDefault();
    return JSON.parse(raw);
  } catch(e) {
    return getDefault();
  }
}

export async function saveDB(env, db) {
  await env.DB.put('safezone_data', JSON.stringify(db));
}

export function getDefault() {
  return {
    users: [], orders: [], deposits: [], products: [], chats: [],
    coupons: {},
    admins: [{ username: 'admin', password: '2102002', role: 'super' }],
    sessions: {},
    config: {
      siteName: 'Safe Zone Game Topup',
      logoUrl: 'https://i.imgur.com/iRwIfqs.png',
      payNumber: '09763442881', payName: 'Safe Zone',
      hero: { title: 'Safe Zone Topup', subtitle: 'Instant Delivery', videoUrl: '' },
      theme: { primary: '#38bdf8', secondary: '#a855f7' },
      musicUrl: '', musicList: [],
      labels: { balance: 'Balance', gamesTitle: 'Games', searchPlaceholder: 'Search...', popularTitle: 'Popular', paymentTitle: 'Payment' },
      social: { facebook: '', tiktok: '', whatsapp: '', viber: '', telegram: '' },
      payments: [
        { name: 'KBZ Pay', short: 'KBZ', cls: 'kbz' },
        { name: 'Wave Money', short: 'Wave', cls: 'wave' },
        { name: 'UAB Pay', short: 'UAB', cls: 'uab' },
        { name: 'AYA Pay', short: 'AYA', cls: 'aya' }
      ],
      trustBadges: [{ icon: '✅', text: 'Verified Shop' }],
      faq: [], terms: '', privacy: '',
      maintenance: { enabled: false, message: 'Under maintenance' },
      pointsBaseRate: 100, pointsMultiplier: 1, pointsRedeemRate: 10,
      chatBot: { enabled: true, rules: [] }
    },
    banners: [], gameImages: {}
  };
}

export async function getUser(env, req) {
  try {
    const token = req.headers.get('Authorization');
    if (!token) return null;
    const db = await getDB(env);
    const session = (db.sessions || {})[token];
    if (!session) return null;
    return db.users.find(u => u.id === session.userId) || null;
  } catch(e) { return null; }
}

export async function getAdmin(env, req) {
  try {
    const u = req.headers.get('x-admin-user');
    const p = req.headers.get('x-admin-pass');
    const db = await getDB(env);
    return db.admins.find(a => a.username === u && a.password === p) || null;
  } catch(e) { return null; }
}

export function genId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}
