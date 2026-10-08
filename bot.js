const BOT_VER = 'v6-BUY-' + Date.now();
const WEB_URL = 'https://safezone-game-topup2.onrender.com';
let offset = 0, running = false, getDb, saveDb;
const states = {};

function api(m, b, t) {
  if (!t) return Promise.resolve(null);
  return fetch('https://api.telegram.org/bot' + t + '/' + m, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b)
  }).then(r => r.json()).catch(e => { console.log('api err:', m, e.message); return null; });
}
function ans(id, t) {
  const db = getDb();
  return api('answerCallbackQuery', { callback_query_id: id, text: t || '' }, db.config.telegramBotToken);
}
async function send(cid, text, kb) {
  const db = getDb();
  if (!db.config.telegramBotToken) return null;
  return api('sendMessage', { chat_id: cid, text: text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb ? { inline_keyboard: kb } : undefined }, db.config.telegramBotToken);
}
async function edit(cid, mid, text, kb) {
  const db = getDb();
  if (!db.config.telegramBotToken) return null;
  const r = await api('editMessageText', { chat_id: cid, message_id: mid, text: text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb ? { inline_keyboard: kb } : undefined }, db.config.telegramBotToken);
  if (!r || !r.ok) return send(cid, text, kb);
  return r;
}

const MENU = {
  admin: [
    [{ text: '📊 Pending', callback_data: 'A_pending' }, { text: '📈 Stats', callback_data: 'A_stats' }],
    [{ text: '👥 Users', callback_data: 'A_users' }, { text: '💬 Chats', callback_data: 'A_chats' }],
    [{ text: '❓ FAQ', callback_data: 'A_faq' }, { text: '🏠 Home', callback_data: 'A_home' }]
  ],
  user: [
    [{ text: '💰 Balance', callback_data: 'U_balance' }, { text: '📦 Orders', callback_data: 'U_orders' }],
    [{ text: '🛒 Buy Now', callback_data: 'U_buy' }, { text: '💳 Deposit', callback_data: 'U_how' }],
    [{ text: '💬 Chat', callback_data: 'U_chat' }, { text: '❓ FAQ', callback_data: 'U_faq' }],
    [{ text: '👤 Profile', callback_data: 'U_profile' }, { text: '🌐 Website', url: WEB_URL }]
  ],
  guest: [
    [{ text: '🔗 Account ချိတ်', callback_data: 'G_link' }],
    [{ text: '❓ FAQ', callback_data: 'G_faq' }],
    [{ text: '🌐 Website ဖွင့်', url: WEB_URL }]
  ],
  back_a: [[{ text: '🏠 Admin Home', callback_data: 'A_home' }]],
  back_u: [[{ text: '🏠 Home', callback_data: 'U_home' }]],
  back_g: [[{ text: '🔙 Back', callback_data: 'G_home' }]]
};

function depKb(id, s) {
  if (s !== 'pending') return [];
  return [[{ text: '✅ Approve', callback_data: 'A_DA_' + id }, { text: '❌ Reject', callback_data: 'A_DR_' + id }]];
}
function ordKb(id, s) {
  if (s === 'completed' || s === 'rejected') return [];
  if (s === 'pending') return [
    [{ text: '⚙️ Processing', callback_data: 'A_OP_' + id }, { text: '✅ Complete', callback_data: 'A_OC_' + id }],
    [{ text: '❌ Reject', callback_data: 'A_OR_' + id }]
  ];
  if (s === 'processing') return [[
    { text: '✅ Complete', callback_data: 'A_OC_' + id }, { text: '❌ Reject', callback_data: 'A_OR_' + id }
  ]];
  return [];
}

const FAQ = '<b>❓ FAQ</b>\n━━━━━━━━━━━━━\n\n' +
'<b>1. Deposit ဘယ်လောက်ကြာလဲ?</b>\n5-15 မိနစ်\n\n' +
'<b>2. Order Reject ဖြစ်ရင်?</b>\nBalance ပြန်အမ်း\n\n' +
'<b>3. Player ID မှားထည့်ရင်?</b>\nChat မှာ အသိပေး\n\n' +
'<b>4. Order ဘယ်လောက်ကြာလဲ?</b>\n10-30 မိနစ်\n\n' +
'<b>5. ငွေဖြည့်နည်း?</b>\nKBZ/Wave/UAB/AYA\n09763442881';

async function showAdmin(cid, mid) {
  const t = '<b>🛡️ Admin Panel</b>\n━━━━━━━━━━━━━\n\nခလုတ်တွေ နှိပ်ပါ 👇';
  if (mid) return edit(cid, mid, t, MENU.admin);
  return send(cid, t, MENU.admin);
}
async function showGuest(cid, mid) {
  const t = '<b>🎮 Safe Zone</b>\n━━━━━━━━━━━━━\n\n👋 ကြိုဆိုပါတယ်!\n\nAccount ချိတ်ဆက်ပြီး Balance ကြည့်၊ Order တင်၊ Chat လုပ်နိုင်တယ်';
  if (mid) return edit(cid, mid, t, MENU.guest);
  return send(cid, t, MENU.guest);
}
async function showUser(cid, user, mid) {
  const t = '<b>🎮 Safe Zone</b>\n━━━━━━━━━━━━━\n\n' +
    '👤 <b>' + user.username + '</b>\n' +
    '💰 <b>' + (user.balance || 0).toLocaleString() + ' Ks</b>\n' +
    '⭐ ' + (user.points || 0) + ' Points\n' +
    '💎 ' + (user.vip || 'Bronze') + ' VIP\n\nခလုတ်တွေ နှိပ်ပါ 👇';
  if (mid) return edit(cid, mid, t, MENU.user);
  return send(cid, t, MENU.user);
}

async function finishOrder(cid, user, p, playerId, serverId, mid) {
  const db = getDb();
  if (user.balance < p.price) {
    const t = '❌ <b>Balance မလုံလောက်ပါ</b>\n━━━━━━━━━━━━━\n\n💵 လိုအပ်: <b>' + p.price.toLocaleString() + ' Ks</b>\n💰 လက်ရှိ: <b>' + user.balance.toLocaleString() + ' Ks</b>\n\nWallet ထဲ Deposit ဖြည့်ပါ';
    const kb = [[{ text: '💳 Deposit နည်း', callback_data: 'U_how' }], [{ text: '🏠 Home', callback_data: 'U_home' }]];
    if (mid) return edit(cid, mid, t, kb);
    return send(cid, t, kb);
  }
  user.balance -= p.price;
  user.points = (user.points || 0) + Math.floor(p.price / 100);
  user.totalSpent = (user.totalSpent || 0) + p.price;
  const order = {
    id: 'ORD' + Date.now(), userId: user.id, username: user.username,
    product: p.name, game: p.game, price: p.price,
    playerId: playerId, serverId: serverId || null,
    status: 'pending', createdAt: Date.now()
  };
  db.orders.push(order);
  db.chats.push({
    id: 'C' + Date.now() + Math.random().toString(36).substring(2, 5),
    userId: user.id, username: user.username, from: 'admin',
    text: '✅ Order ' + order.id + ' (' + p.name + ') လက်ခံရရှိပါပြီ',
    createdAt: Date.now(), read: false
  });
  saveDb();
  try { await notifyOrder(order); } catch(e) {}
  const sid = serverId ? ' • S:' + serverId : '';
  const t = '✅ <b>Order တင်ပြီးပါပြီ!</b>\n━━━━━━━━━━━━━\n\n' +
    '🎮 ' + p.game + '\n' +
    '📦 ' + p.name + '\n' +
    '💵 ' + p.price.toLocaleString() + ' Ks\n' +
    '🆔 ' + playerId + sid + '\n' +
    '🔖 <code>' + order.id + '</code>\n\n' +
    '💰 လက်ကျန်: <b>' + user.balance.toLocaleString() + ' Ks</b>';
  const kb = [[{ text: '📦 My Orders', callback_data: 'U_orders' }], [{ text: '🏠 Home', callback_data: 'U_home' }]];
  if (mid) return edit(cid, mid, t, kb);
  return send(cid, t, kb);
}

async function handleCallback(cq) {
  const db = getDb();
  const cid = String(cq.message.chat.id);
  const mid = cq.message.message_id;
  const d = cq.data || '';
  const adminId = String(db.config.telegramChatId || '');
  const isAdmin = (cid === adminId && adminId);

  ans(cq.id).catch(() => {});

  try {
    if (isAdmin && d.startsWith('A_')) {
      if (d === 'A_home') return showAdmin(cid, mid);
      if (d === 'A_faq') return edit(cid, mid, FAQ, MENU.back_a);
      if (d === 'A_stats') {
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        const ts = t0.getTime();
        const total = db.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.price, 0);
        const today = db.orders.filter(o => o.status === 'completed' && o.createdAt >= ts).reduce((s, o) => s + o.price, 0);
        const t = '<b>📈 Statistics</b>\n━━━━━━━━━━━━━\n\n👥 Users: <b>' + db.users.length + '</b>\n📦 Orders: <b>' + db.orders.length + '</b>\n💰 Total: <b>' + total.toLocaleString() + ' Ks</b>\n📅 Today: <b>' + today.toLocaleString() + ' Ks</b>\n\n⏳ Pending Deps: <b>' + db.deposits.filter(x => x.status === 'pending').length + '</b>\n⏳ Pending Ords: <b>' + db.orders.filter(x => x.status === 'pending').length + '</b>';
        return edit(cid, mid, t, MENU.back_a);
      }
      if (d === 'A_users') {
        const us = [...db.users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
        let t = '<b>👥 Recent Users</b>\n━━━━━━━━━━━━━\n\n';
        if (!us.length) t += 'User မရှိပါ';
        us.forEach((u, i) => { t += (i + 1) + '. <b>' + u.username + '</b>' + (u.telegramId ? ' 🔗' : '') + '\n💰 ' + (u.balance || 0).toLocaleString() + ' Ks\n\n'; });
        return edit(cid, mid, t, MENU.back_a);
      }
      if (d === 'A_chats') {
        const map = {};
        db.chats.forEach(c => {
          if (!map[c.userId]) map[c.userId] = { u: c.username, last: c, n: 0 };
          if (c.createdAt > map[c.userId].last.createdAt) map[c.userId].last = c;
          if (c.from === 'user' && !c.read) map[c.userId].n++;
        });
        const list = Object.values(map).sort((a, b) => b.last.createdAt - a.last.createdAt).slice(0, 10);
        let t = '<b>💬 Recent Chats</b>\n━━━━━━━━━━━━━\n\n';
        if (!list.length) t += 'Chat မရှိပါ';
        list.forEach(c => { t += '<b>' + c.u + '</b>' + (c.n ? ' 🔴 ' + c.n : '') + '\n<i>' + String(c.last.text || '[Media]').substring(0, 40) + '</i>\n\n'; });
        return edit(cid, mid, t, MENU.back_a);
      }
      if (d === 'A_pending') {
        const deps = db.deposits.filter(x => x.status === 'pending');
        const ords = db.orders.filter(x => x.status === 'pending' || x.status === 'processing');
        if (!deps.length && !ords.length) return edit(cid, mid, '<b>📊 Pending</b>\n\n✅ မရှိပါ 🎉', MENU.back_a);
        await edit(cid, mid, '<b>📊 Pending</b>\n\n💰 Deposits: <b>' + deps.length + '</b>\n📦 Orders: <b>' + ords.length + '</b>', MENU.back_a);
        for (const x of deps.slice(0, 5)) {
          await send(cid, '💰 <b>DEPOSIT</b>\n━━━━━━━━━━━━━\n👤 ' + x.username + '\n💵 <b>' + x.amount.toLocaleString() + ' Ks</b>\n📱 ' + x.method + '\n🆔 <code>' + x.id + '</code>', depKb(x.id, x.status));
        }
        for (const x of ords.slice(0, 5)) {
          const sid = x.serverId ? ' • S:' + x.serverId : '';
          await send(cid, '📦 <b>ORDER</b>\n━━━━━━━━━━━━━\n👤 ' + x.username + '\n🎮 ' + x.game + '\n📦 ' + x.product + '\n💵 <b>' + x.price.toLocaleString() + ' Ks</b>\n🆔 <code>' + x.playerId + sid + '</code>', ordKb(x.id, x.status));
        }
        return;
      }
      if (d.startsWith('A_DA_')) {
        const dep = db.deposits.find(x => x.id === d.substring(5));
        if (!dep || dep.status !== 'pending') return;
        const u = db.users.find(x => x.id === dep.userId);
        if (!u) return;
        u.balance += dep.amount; dep.status = 'approved'; dep.approvedAt = Date.now(); saveDb();
        if (u.telegramId) send(u.telegramId, '✅ <b>Deposit Approved</b>\n\n💵 +' + dep.amount.toLocaleString() + ' Ks\n💰 New: ' + u.balance.toLocaleString() + ' Ks', MENU.user);
        return edit(cid, mid, '✅ <b>APPROVED</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 +' + dep.amount.toLocaleString() + ' Ks\n💰 New: ' + u.balance.toLocaleString() + ' Ks', MENU.back_a);
      }
      if (d.startsWith('A_DR_')) {
        const dep = db.deposits.find(x => x.id === d.substring(5));
        if (!dep || dep.status !== 'pending') return;
        dep.status = 'rejected'; saveDb();
        const u = db.users.find(x => x.id === dep.userId);
        if (u && u.telegramId) send(u.telegramId, '❌ <b>Deposit Rejected</b>\n\n💵 ' + dep.amount.toLocaleString() + ' Ks', MENU.user);
        return edit(cid, mid, '❌ <b>REJECTED</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 ' + dep.amount.toLocaleString() + ' Ks', MENU.back_a);
      }
      if (d.startsWith('A_OP_') || d.startsWith('A_OC_') || d.startsWith('A_OR_')) {
        const act = d.includes('_OP_') ? 'processing' : d.includes('_OC_') ? 'completed' : 'rejected';
        const id = d.substring(5);
        const o = db.orders.find(x => x.id === id);
        if (!o) return;
        if (act === 'rejected' && o.status !== 'rejected') {
          const u2 = db.users.find(x => x.id === o.userId);
          if (u2) u2.balance += o.price;
        }
        o.status = act; o.updatedAt = Date.now(); saveDb();
        const u3 = db.users.find(x => x.id === o.userId);
        const em = { processing: '⚙️', completed: '✅', rejected: '❌' }[act];
        if (u3 && u3.telegramId) send(u3.telegramId, em + ' <b>Order ' + act.toUpperCase() + '</b>\n\n🎮 ' + o.game + '\n📦 ' + o.product, MENU.user);
        return edit(cid, mid, em + ' <b>' + act.toUpperCase() + '</b>\n━━━━━━━━━━━━━\n👤 ' + o.username + '\n🎮 ' + o.game + '\n📦 ' + o.product, ordKb(o.id, o.status).concat(MENU.back_a));
      }
      return;
    }

    const user = db.users.find(x => x.telegramId === cid);

    if (d === 'G_home') {
      if (user) return showUser(cid, user, mid);
      return showGuest(cid, mid);
    }
    if (d === 'G_link' || d === 'U_link') {
      states[cid] = { step: 'username', promptMid: mid };
      const back = (d === 'G_link') ? MENU.back_g : MENU.back_u;
      return edit(cid, mid, '<b>🔗 Account ချိတ်</b>\n━━━━━━━━━━━━━\n\n<b>Step 1/2</b> — Website <b>Username</b> ရိုက်ပါ', back);
    }
    if (d === 'G_faq') return edit(cid, mid, FAQ, MENU.back_g);
    if (!user) return;

    if (d === 'U_home') return showUser(cid, user, mid);
    if (d === 'U_balance') return edit(cid, mid, '<b>💰 Balance</b>\n━━━━━━━━━━━━━\n\n👤 ' + user.username + '\n💵 <b>' + (user.balance || 0).toLocaleString() + ' Ks</b>\n⭐ ' + (user.points || 0) + ' Points\n🎁 <code>' + (user.referralCode || '') + '</code>', MENU.back_u);
    if (d === 'U_orders') {
      const ords = db.orders.filter(x => x.userId === user.id).reverse().slice(0, 5);
      let t = '<b>📦 My Orders</b>\n━━━━━━━━━━━━━\n\n';
      if (!ords.length) t += 'Order မရှိပါ';
      ords.forEach(o => {
        const em = { pending: '⏳', processing: '⚙️', completed: '✅', rejected: '❌' }[o.status] || '•';
        t += em + ' <b>' + o.game + '</b>\n   ' + o.product + '\n   💵 ' + o.price.toLocaleString() + ' Ks\n\n';
      });
      return edit(cid, mid, t, MENU.back_u);
    }
    if (d === 'U_how') return edit(cid, mid, '<b>💳 Deposit နည်း</b>\n━━━━━━━━━━━━━\n\n1. KBZ/Wave/UAB/AYA ဖွင့်\n2. ငွေလွှဲ:\n   📱 <code>' + db.config.payNumber + '</code>\n   👤 ' + db.config.payName + '\n3. Ref copy\n4. Website → Wallet → Deposit\n\n⏱ 5-15 မိနစ်', MENU.back_u);
    if (d === 'U_chat') return edit(cid, mid, '<b>💬 Chat Admin</b>\n━━━━━━━━━━━━━\n\nWebsite → Chat tab\nဒါမှမဟုတ် ဒီ bot မှာ စာရေး\n\n👉 စာရေးလိုက်ပါ', MENU.back_u);
    if (d === 'U_faq') return edit(cid, mid, FAQ, MENU.back_u);
    if (d === 'U_profile') return edit(cid, mid, '<b>👤 Profile</b>\n━━━━━━━━━━━━━\n\n👤 ' + user.username + '\n📱 ' + (user.phone || '-') + '\n💰 ' + (user.balance || 0).toLocaleString() + ' Ks\n⭐ ' + (user.points || 0) + ' Points\n💎 ' + (user.vip || 'Bronze') + ' VIP', [
      [{ text: '🌐 Website', url: WEB_URL }],
      [{ text: '🚪 Unlink', callback_data: 'U_unlink' }],
      [{ text: '🏠 Home', callback_data: 'U_home' }]
    ]);
    if (d === 'U_unlink') { user.telegramId = null; saveDb(); return showGuest(cid, mid); }

    // ===== BUY NOW =====
    if (d === 'U_buy') {
      const games = [...new Set(db.products.map(p => p.game))];
      if (!games.length) return edit(cid, mid, '<b>🛒 Buy Now</b>\n\nဂိမ်း မရှိသေးပါ', MENU.back_u);
      const kb = games.map(g => [{ text: '🎮 ' + g, callback_data: 'U_bg|' + g }]);
      kb.push([{ text: '🌐 Website ဖွင့်', url: WEB_URL }]);
      kb.push([{ text: '🏠 Home', callback_data: 'U_home' }]);
      return edit(cid, mid, '<b>🛒 Buy Now</b>\n━━━━━━━━━━━━━\n\nဂိမ်း ရွေးပါ 👇', kb);
    }

    if (d.startsWith('U_bg|')) {
      const gameName = d.substring(5);
      const prods = db.products.filter(p => p.game === gameName);
      if (!prods.length) return edit(cid, mid, '❌ ဂိမ်း မတွေ့', MENU.back_u);
      const kb = prods.map(p => [{ text: (p.image || '🎮') + ' ' + p.name + ' — ' + p.price.toLocaleString() + ' Ks', callback_data: 'U_bp|' + p.id }]);
      kb.push([{ text: '🔙 Back', callback_data: 'U_buy' }]);
      return edit(cid, mid, '<b>🎮 ' + gameName + '</b>\n━━━━━━━━━━━━━\n\nPackage ရွေးပါ 👇', kb);
    }

    if (d.startsWith('U_bp|')) {
      const pid = Number(d.substring(5));
      const p = db.products.find(x => x.id === pid);
      if (!p) return edit(cid, mid, '❌ Product မတွေ့', MENU.back_u);
      if (user.balance < p.price) {
        return edit(cid, mid, '❌ <b>Balance မလုံလောက်ပါ</b>\n━━━━━━━━━━━━━\n\n💵 လိုအပ်: <b>' + p.price.toLocaleString() + ' Ks</b>\n💰 လက်ရှိ: <b>' + user.balance.toLocaleString() + ' Ks</b>\n\nWallet ထဲ Deposit ဖြည့်ပါ', [
          [{ text: '💳 Deposit နည်း', callback_data: 'U_how' }],
          [{ text: '🔙 Back', callback_data: 'U_buy' }]
        ]);
      }
      states[cid] = { step: 'order_playerid', productId: pid, promptMid: mid };
      return edit(cid, mid, '<b>📦 ' + p.name + '</b>\n━━━━━━━━━━━━━\n\n💵 ' + p.price.toLocaleString() + ' Ks\n🎮 ' + p.game + '\n\n<b>Player ID / UID</b> ရိုက်ပါ', [
        [{ text: '❌ Cancel', callback_data: 'U_buy' }]
      ]);
    }
  } catch (e) { console.log('CB error:', e.message); }
}

async function handleMessage(msg) {
  const db = getDb();
  const cid = String(msg.chat.id);
  const adminId = String(db.config.telegramChatId || '');
  const isAdmin = (cid === adminId && adminId);

  try {
    if (msg.photo && !isAdmin) {
      const user = db.users.find(x => x.telegramId === cid);
      if (user && adminId) {
        const fid = msg.photo[msg.photo.length - 1].file_id;
        await api('sendPhoto', { chat_id: adminId, photo: fid, caption: '📸 From <b>' + user.username + '</b>', parse_mode: 'HTML' }, db.config.telegramBotToken);
        return send(cid, '✅ ပုံ ပို့ပြီးပါပြီ', MENU.user);
      }
      return;
    }
    const text = (msg.text || '').trim();
    const cmd = text.split(' ')[0].toLowerCase();

    if (isAdmin) {
      if (cmd === '/version') return send(cid, '🤖 Version: <code>' + BOT_VER + '</code>', MENU.admin);
      if (cmd === '/start' || cmd === '/menu') return showAdmin(cid);
      if (cmd === '/faq') return send(cid, FAQ, MENU.back_a);

    if (cmd === '/leaderboard' || cmd === '/top') {
      const totals = {};
      db.deposits.filter(d => d.status === 'approved').forEach(d => {
        totals[d.userId] = (totals[d.userId] || 0) + d.amount;
      });
      const list = db.users.map(u => ({ username: u.username, total: totals[u.id] || 0 }))
        .filter(u => u.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
      const medals = ['🥇','🥈','🥉'];
      let t = '<b>🏆 Top Spenders</b>\n━━━━━━━━━━━━━\n\n';
      if (!list.length) t += 'ဒေတာ မရှိပါ';
      list.forEach((u, i) => {
        t += (medals[i] || (i+1) + '.') + ' <b>' + u.username + '</b>\n💰 ' + u.total.toLocaleString() + ' Ks\n\n';
      });
      return send(chatId, t, MENU.back_a);
    }

      return showAdmin(cid);
    }

    const user = db.users.find(x => x.telegramId === cid);
    const st = states[cid] || {};

    if (!user) {
      if (st.step === 'username') {
        states[cid] = { step: 'password', username: text, promptMid: st.promptMid };
        if (st.promptMid) return edit(cid, st.promptMid, '<b>🔐 Password</b>\n━━━━━━━━━━━━━\n\n<b>Step 2/2</b> — Website <b>Password</b> ရိုက်ပါ', MENU.back_g);
        return send(cid, '<b>🔐 Password</b>\n\nPassword ရိုက်ပါ', MENU.back_g);
      }
      if (st.step === 'password') {
        const f = db.users.find(u => u.username === st.username && u.password === text);
        delete states[cid];
        if (!f) {
          if (st.promptMid) return edit(cid, st.promptMid, '❌ Username/Password မှား\n\n/start ပြန်စမ်းပါ', MENU.guest);
          return send(cid, '❌ Username/Password မှား', MENU.guest);
        }
        f.telegramId = cid; saveDb();
        if (st.promptMid) return showUser(cid, f, st.promptMid);
        return showUser(cid, f);
      }
      if (cmd === '/version') return send(cid, '🤖 Version: <code>' + BOT_VER + '</code>', MENU.guest);
      if (cmd === '/start') return showGuest(cid);
      if (cmd === '/link') { states[cid] = { step: 'username', promptMid: null }; return send(cid, '<b>🔗 Account ချိတ်</b>\n\nUsername ရိုက်ပါ', MENU.back_g); }
      if (cmd === '/faq') return send(cid, FAQ, MENU.back_g);
      return showGuest(cid);
    }

    // ===== BUY FLOW STATES =====
    if (st.step === 'order_playerid') {
      const p = db.products.find(x => x.id === st.productId);
      if (!p) { delete states[cid]; return send(cid, '❌ Product မတွေ့', MENU.user); }
      const needsServer = ['Mobile Legends', 'Magic Chess'].includes(p.game);
      if (needsServer) {
        states[cid] = { step: 'order_serverid', productId: st.productId, playerId: text, promptMid: st.promptMid };
        const kb = [[{ text: '❌ Cancel', callback_data: 'U_buy' }]];
        if (st.promptMid) return edit(cid, st.promptMid, '<b>🌐 Server ID</b>\n━━━━━━━━━━━━━\n\nPlayer ID: <code>' + text + '</code>\n\n<b>Server ID</b> ရိုက်ပါ\n\n', kb);
        return send(cid, '<b>🌐 Server ID</b>\n\nServer ID ရိုက်ပါ', kb);
      }
      delete states[cid];
      return finishOrder(cid, user, p, text, null, st.promptMid);
    }

    if (st.step === 'order_serverid') {
      const p = db.products.find(x => x.id === st.productId);
      if (!p) { delete states[cid]; return send(cid, '❌ Product မတွေ့', MENU.user); }
      delete states[cid];
      return finishOrder(cid, user, p, st.playerId, text, st.promptMid);
    }

    if (cmd === '/version') return send(cid, '🤖 Version: <code>' + BOT_VER + '</code>', MENU.user);
    if (cmd === '/start' || cmd === '/menu') return showUser(cid, user);
    if (cmd === '/balance') return send(cid, '💰 <b>' + user.balance.toLocaleString() + ' Ks</b>', MENU.user);
    if (cmd === '/faq') return send(cid, FAQ, MENU.back_u);

    if (cmd === '/leaderboard' || cmd === '/top') {
      const totals = {};
      db.deposits.filter(d => d.status === 'approved').forEach(d => {
        totals[d.userId] = (totals[d.userId] || 0) + d.amount;
      });
      const list = db.users.map(u => ({ username: u.username, total: totals[u.id] || 0 }))
        .filter(u => u.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
      const medals = ['🥇','🥈','🥉'];
      let t = '<b>🏆 Top Spenders</b>\n━━━━━━━━━━━━━\n\n';
      if (!list.length) t += 'ဒေတာ မရှိပါ';
      list.forEach((u, i) => {
        t += (medals[i] || (i+1) + '.') + ' <b>' + u.username + '</b>\n💰 ' + u.total.toLocaleString() + ' Ks\n\n';
      });
      return send(cid, t, MENU.back_u);
    }

    if (cmd === '/buy') {
      const games = [...new Set(db.products.map(p => p.game))];
      if (!games.length) return send(cid, '❌ ဂိမ်း မရှိပါ', MENU.user);
      const kb = games.map(g => [{ text: '🎮 ' + g, callback_data: 'U_bg|' + g }]);
      kb.push([{ text: '🌐 Website', url: WEB_URL }]);
      kb.push([{ text: '🏠 Home', callback_data: 'U_home' }]);
      return send(cid, '<b>🛒 Buy Now</b>\n\nဂိမ်း ရွေးပါ 👇', kb);
    }
    if (cmd === '/unlink') { user.telegramId = null; saveDb(); return showGuest(cid); }

    db.chats.push({ id: 'C' + Date.now() + Math.random().toString(36).substring(2, 5), userId: user.id, username: user.username, from: 'user', text: text, createdAt: Date.now(), read: false });
    saveDb();
    if (adminId) await send(adminId, '💬 <b>Message</b>\n━━━━━━━━━━━━━\n👤 ' + user.username + '\n\n<i>' + text.substring(0, 200) + '</i>');
    return send(cid, '✅ စာ ပို့ပြီးပါပြီ\n\nAdmin ပြန်ဖြေတာ ဒီ bot မှာ ရမယ်', MENU.user);
  } catch (e) { console.log('MSG error:', e.message); }
}

async function handleUpdate(u) {
  try {
    if (u.callback_query) return await handleCallback(u.callback_query);
    if (u.message) return await handleMessage(u.message);
  } catch (e) { console.log('handler err:', e.message); }
}

async function setupBot() {
  const db = getDb();
  const token = db.config.telegramBotToken;
  if (!token) return false;
  try {
    const r1 = await api('deleteWebhook', { drop_pending_updates: true }, token);
    console.log('deleteWebhook:', r1 && r1.ok ? 'OK' : 'FAIL');
    const r2 = await api('getMe', {}, token);
    if (r2 && r2.ok) { console.log('Bot ready:', r2.result.username); return true; }
    return false;
  } catch (e) { console.log('setupBot err:', e.message); return false; }
}

async function poll() {
  if (running) return;
  running = true;
  console.log('Bot loop starting:', BOT_VER);
  let lastToken = '';
  while (true) {
    const db = getDb();
    const token = db.config.telegramBotToken;
    if (!token) { await sleep(5000); continue; }
    if (token !== lastToken) {
      const ok = await setupBot();
      if (ok) { lastToken = token; offset = 0; }
      else { await sleep(5000); continue; }
    }
    try {
      const r = await api('getUpdates', { offset: offset + 1, timeout: 25 }, token);
      if (r && r.ok) {
        if (r.result.length) console.log('Got', r.result.length, 'updates');
        for (const u of r.result) {
          offset = Math.max(offset, u.update_id);
          await handleUpdate(u);
        }
      } else { await sleep(3000); }
    } catch (e) { await sleep(3000); }
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function notifyDeposit(dep) {
  const db = getDb(); const { telegramBotToken: t, telegramChatId: c } = db.config;
  if (!t || !c) return;
  await send(c, '🔔 <b>Deposit အသစ်</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 <b>' + dep.amount.toLocaleString() + ' Ks</b>\n📱 ' + dep.method, depKb(dep.id, dep.status));
}
async function notifyOrder(o) {
  const db = getDb(); const { telegramBotToken: t, telegramChatId: c } = db.config;
  if (!t || !c) return;
  const sid = o.serverId ? ' • S:' + o.serverId : '';
  await send(c, '🔔 <b>Order အသစ်</b>\n━━━━━━━━━━━━━\n👤 ' + o.username + '\n🎮 ' + o.game + '\n📦 ' + o.product + '\n💵 ' + o.price.toLocaleString() + ' Ks\n🆔 ' + o.playerId + sid, ordKb(o.id, o.status));
}
async function notifyChat(u, text) {
  const db = getDb(); const { telegramBotToken: t, telegramChatId: c } = db.config;
  if (!t || !c) return;
  await send(c, '💬 <b>Message</b>\n━━━━━━━━━━━━━\n👤 ' + u.username + '\n\n<i>' + String(text).substring(0, 200) + '</i>');
}
async function notifyUser(u, text) {
  if (!u.telegramId) return;
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  await send(u.telegramId, '💬 <b>Admin Reply</b>\n━━━━━━━━━━━━━\n<i>' + text + '</i>', MENU.user);
}

module.exports = function initBot(opts) {
  getDb = opts.getDb;
  saveDb = opts.saveDb;
  poll();
  console.log('Bot v6 loaded:', BOT_VER);
  return { notifyDeposit, notifyOrder, notifyChat, notifyUser };
};
