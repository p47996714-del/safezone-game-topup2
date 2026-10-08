const BOT_VER = 'v4-FIX-' + Date.now();
let offset = 0, running = false, getDb, saveDb;
const states = {};

function api(m, b, t) {
  if (!t) return Promise.resolve(null);
  return fetch('https://api.telegram.org/bot' + t + '/' + m, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b)
  }).then(r => r.json()).catch((e) => { console.log('api err:', m, e.message); return null; });
}

function ans(id, t) {
  const db = getDb();
  return api('answerCallbackQuery', { callback_query_id: id, text: t || '' }, db.config.telegramBotToken);
}

async function send(cid, text, kb) {
  const db = getDb();
  if (!db.config.telegramBotToken) return null;
  return api('sendMessage', {
    chat_id: cid, text, parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: kb ? { inline_keyboard: kb } : undefined
  }, db.config.telegramBotToken);
}

async function edit(cid, mid, text, kb) {
  const db = getDb();
  if (!db.config.telegramBotToken) return null;
  const r = await api('editMessageText', {
    chat_id: cid, message_id: mid, text, parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: kb ? { inline_keyboard: kb } : undefined
  }, db.config.telegramBotToken);
  // If edit fails, send new message as fallback
  if (!r || !r.ok) {
    console.log('edit failed, sending new. reason:', r && r.description);
    return send(cid, text, kb);
  }
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
    [{ text: '👤 Profile', callback_data: 'U_profile' }, { text: '🚪 Unlink', callback_data: 'U_unlink' }]
  ],
  guest: [
    [{ text: '🔗 Account ချိတ်', callback_data: 'G_link' }],
    [{ text: '❓ FAQ', callback_data: 'G_faq' }]
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

async function handleCallback(cq) {
  const db = getDb();
  const cid = String(cq.message.chat.id);
  const mid = cq.message.message_id;
  const d = cq.data || '';
  const adminId = String(db.config.telegramChatId || '');
  const isAdmin = (cid === adminId && adminId);

  console.log('CB:', d, 'from', cid, 'admin?', isAdmin);

  // Fire and forget - don't await
  ans(cq.id).catch(() => {});

  try {
    // ===== ADMIN =====
    if (isAdmin && d.startsWith('A_')) {
      if (d === 'A_home') return showAdmin(cid, mid);
      if (d === 'A_faq') return edit(cid, mid, FAQ, MENU.back_a);

      if (d === 'A_stats') {
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        const ts = t0.getTime();
        const total = db.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.price, 0);
        const today = db.orders.filter(o => o.status === 'completed' && o.createdAt >= ts).reduce((s, o) => s + o.price, 0);
        const t = '<b>📈 Statistics</b>\n━━━━━━━━━━━━━\n\n' +
          '👥 Users: <b>' + db.users.length + '</b>\n' +
          '📦 Orders: <b>' + db.orders.length + '</b>\n' +
          '💰 Total: <b>' + total.toLocaleString() + ' Ks</b>\n' +
          '📅 Today: <b>' + today.toLocaleString() + ' Ks</b>\n\n' +
          '⏳ Pending Deps: <b>' + db.deposits.filter(x => x.status === 'pending').length + '</b>\n' +
          '⏳ Pending Ords: <b>' + db.orders.filter(x => x.status === 'pending').length + '</b>';
        return edit(cid, mid, t, MENU.back_a);
      }

      if (d === 'A_users') {
        const us = [...db.users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
        let t = '<b>👥 Recent Users</b>\n━━━━━━━━━━━━━\n\n';
        if (!us.length) t += 'User မရှိပါ';
        us.forEach((u, i) => {
          t += (i + 1) + '. <b>' + u.username + '</b>' + (u.telegramId ? ' 🔗' : '') + '\n💰 ' + (u.balance || 0).toLocaleString() + ' Ks\n\n';
        });
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
        list.forEach(c => {
          t += '<b>' + c.u + '</b>' + (c.n ? ' 🔴 ' + c.n : '') + '\n<i>' + String(c.last.text || '[Media]').substring(0, 40) + '</i>\n\n';
        });
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
        if (!dep || dep.status !== 'pending') return ans(cq.id, '❌');
        const u = db.users.find(x => x.id === dep.userId);
        if (!u) return ans(cq.id, '❌ No user');
        u.balance += dep.amount; dep.status = 'approved'; dep.approvedAt = Date.now();
        saveDb();
        if (u.telegramId) send(u.telegramId, '✅ <b>Deposit Approved</b>\n\n💵 +' + dep.amount.toLocaleString() + ' Ks\n💰 New: ' + u.balance.toLocaleString() + ' Ks', MENU.user);
        return edit(cid, mid, '✅ <b>APPROVED</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 +' + dep.amount.toLocaleString() + ' Ks\n💰 New: ' + u.balance.toLocaleString() + ' Ks', MENU.back_a);
      }

      if (d.startsWith('A_DR_')) {
        const dep = db.deposits.find(x => x.id === d.substring(5));
        if (!dep || dep.status !== 'pending') return ans(cq.id, '❌');
        dep.status = 'rejected'; saveDb();
        const u = db.users.find(x => x.id === dep.userId);
        if (u && u.telegramId) send(u.telegramId, '❌ <b>Deposit Rejected</b>\n\n💵 ' + dep.amount.toLocaleString() + ' Ks', MENU.user);
        return edit(cid, mid, '❌ <b>REJECTED</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 ' + dep.amount.toLocaleString() + ' Ks', MENU.back_a);
      }

      if (d.startsWith('A_OP_') || d.startsWith('A_OC_') || d.startsWith('A_OR_')) {
        const act = d.includes('_OP_') ? 'processing' : d.includes('_OC_') ? 'completed' : 'rejected';
        const id = d.substring(5);
        const o = db.orders.find(x => x.id === id);
        if (!o) return ans(cq.id, '❌');
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

    // ===== USER / GUEST =====
    const user = db.users.find(x => x.telegramId === cid);

    if (d === 'G_home') {
      if (user) return showUser(cid, user, mid);
      return showGuest(cid, mid);
    }
    if (d === 'G_link') {
      states[cid] = { step: 'username' };
      return edit(cid, mid, '<b>🔗 Account ချိတ်</b>\n━━━━━━━━━━━━━\n\n<b>Step 1/2</b> — Website <b>Username</b> ရိုက်ပါ', MENU.back_g);
    }
    if (d === 'G_faq') return edit(cid, mid, FAQ, MENU.back_g);
    if (d === 'U_link') {
      states[cid] = { step: 'username' };
      return edit(cid, mid, '<b>🔗 Link</b>\n\nUsername ရိုက်ပါ', MENU.back_u);
    }
    if (!user) return ans(cq.id, '❌ Account မချိတ်ရသေး');

    if (d === 'U_home') return showUser(cid, user, mid);
    if (d === 'U_balance') {
      return edit(cid, mid, '<b>💰 Balance</b>\n━━━━━━━━━━━━━\n\n👤 ' + user.username + '\n💵 <b>' + (user.balance || 0).toLocaleString() + ' Ks</b>\n⭐ ' + (user.points || 0) + ' Points\n🎁 <code>' + (user.referralCode || '') + '</code>', MENU.back_u);
    }
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
    if (d === 'U_how') {
      const t = '<b>💳 Deposit နည်း</b>\n━━━━━━━━━━━━━\n\n1. KBZ/Wave/UAB/AYA ဖွင့်\n2. ငွေလွှဲ:\n   📱 <code>' + db.config.payNumber + '</code>\n   👤 ' + db.config.payName + '\n3. Ref copy\n4. Website → Wallet → Deposit\n\n⏱ 5-15 မိနစ်';
      return edit(cid, mid, t, MENU.back_u);
    }
    if (d === 'U_chat') {
      return edit(cid, mid, '<b>💬 Chat Admin</b>\n━━━━━━━━━━━━━\n\nWebsite → Chat tab\nဒါမှမဟုတ် ဒီ bot မှာ စာရေး\n\n👉 စာရေးလိုက်ပါ', MENU.back_u);
    }
    if (d === 'U_buy') {
      return edit(cid, mid, '<b>🛒 Buy</b>\n━━━━━━━━━━━━━\n\nWebsite ကနေ ဝယ်ပါ 👇\n\nWebsite → ဂိမ်းရွေး → Order', MENU.back_u);
    }
    if (d === 'U_faq') return edit(cid, mid, FAQ, MENU.back_u);
    if (d === 'U_profile') {
      const t = '<b>👤 Profile</b>\n━━━━━━━━━━━━━\n\n👤 ' + user.username + '\n📱 ' + (user.phone || '-') + '\n💰 ' + (user.balance || 0).toLocaleString() + ' Ks\n⭐ ' + (user.points || 0) + ' Points\n💎 ' + (user.vip || 'Bronze') + ' VIP';
      return edit(cid, mid, t, MENU.back_u);
    }
    if (d === 'U_unlink') {
      user.telegramId = null; saveDb();
      return showGuest(cid, mid);
    }
  } catch (e) {
    console.log('CB error:', e.message, e.stack);
  }
}

async function handleMessage(msg) {
  const db = getDb();
  const cid = String(msg.chat.id);
  const adminId = String(db.config.telegramChatId || '');
  const isAdmin = (cid === adminId && adminId);

  console.log('MSG:', (msg.text || '[photo]').substring(0, 30), 'from', cid, 'admin?', isAdmin);

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
      return showAdmin(cid);
    }

    const user = db.users.find(x => x.telegramId === cid);
    const st = states[cid] || {};

    if (!user) {
      if (st.step === 'username') {
        const chk = db.users.find(u => u.username === text);
        if (!chk) { delete states[cid]; return send(cid, '❌ Username မတွေ့', MENU.guest); }
        states[cid] = { step: 'password', username: text };
        return send(cid, '<b>🔐 Password</b>\n━━━━━━━━━━━━━\n\n<b>Step 2/2</b> — Password ရိုက်ပါ', MENU.back_g);
      }
      if (st.step === 'password') {
        const f = db.users.find(u => u.username === st.username && u.password === text);
        delete states[cid];
        if (!f) return send(cid, '❌ Password မှား', MENU.guest);
        f.telegramId = cid; saveDb();
        return showUser(cid, f);
      }
      if (cmd === '/version') return send(cid, '🤖 Version: <code>' + BOT_VER + '</code>', MENU.guest);
      if (cmd === '/start') return showGuest(cid);
      if (cmd === '/link') { states[cid] = { step: 'username' }; return send(cid, '<b>🔗 Link</b>\n\nUsername ရိုက်ပါ', MENU.back_g); }
      if (cmd === '/faq') return send(cid, FAQ, MENU.back_g);
      return showGuest(cid);
    }

    if (cmd === '/version') return send(cid, '🤖 Version: <code>' + BOT_VER + '</code>', MENU.user);
    if (cmd === '/start' || cmd === '/menu') return showUser(cid, user);
    if (cmd === '/balance') return send(cid, '💰 <b>' + user.balance.toLocaleString() + ' Ks</b>', MENU.user);
    if (cmd === '/faq') return send(cid, FAQ, MENU.back_u);
    if (cmd === '/unlink') { user.telegramId = null; saveDb(); return showGuest(cid); }

    db.chats.push({
      id: 'C' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId: user.id, username: user.username, from: 'user', text: text,
      createdAt: Date.now(), read: false
    });
    saveDb();
    if (adminId) {
      await send(adminId, '💬 <b>Message</b>\n━━━━━━━━━━━━━\n👤 ' + user.username + '\n\n<i>' + text.substring(0, 200) + '</i>');
    }
    return send(cid, '✅ စာ ပို့ပြီးပါပြီ\n\nAdmin ပြန်ဖြေတာ ဒီ bot မှာ ရမယ်', MENU.user);
  } catch (e) {
    console.log('MSG error:', e.message);
  }
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
  if (!token) { console.log('No token - skip setup'); return false; }
  try {
    // Delete webhook (ensures polling works)
    const r1 = await api('deleteWebhook', { drop_pending_updates: true }, token);
    console.log('deleteWebhook:', r1 && r1.ok ? 'OK' : 'FAIL', r1 && r1.description);
    // Get bot info
    const r2 = await api('getMe', {}, token);
    if (r2 && r2.ok) {
      console.log('Bot ready:', r2.result.username);
      return true;
    }
    console.log('getMe failed:', r2 && r2.description);
    return false;
  } catch (e) {
    console.log('setupBot err:', e.message);
    return false;
  }
}

async function poll() {
  if (running) return;
  running = true;
  console.log('Bot loop starting:', BOT_VER);
  let lastSetup = 0;
  while (true) {
    const db = getDb();
    const token = db.config.telegramBotToken;
    if (!token) { await sleep(5000); continue; }
    // Setup once per token change
    if (token !== lastSetup) {
      const ok = await setupBot();
      if (ok) lastSetup = token;
      else { await sleep(5000); continue; }
      offset = 0;
    }
    try {
      const r = await api('getUpdates', { offset: offset + 1, timeout: 25 }, token);
      if (r && r.ok) {
        if (r.result.length) console.log('Got', r.result.length, 'updates');
        for (const u of r.result) {
          offset = Math.max(offset, u.update_id);
          await handleUpdate(u);
        }
      } else {
        if (r && r.error_code === 401) { console.log('Token invalid'); lastSetup = 0; }
        await sleep(3000);
      }
    } catch (e) { console.log('poll err:', e.message); await sleep(3000); }
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function notifyDeposit(dep) {
  const db = getDb();
  const { telegramBotToken: t, telegramChatId: c } = db.config;
  if (!t || !c) return;
  await send(c, '🔔 <b>Deposit အသစ်</b>\n━━━━━━━━━━━━━\n👤 ' + dep.username + '\n💵 <b>' + dep.amount.toLocaleString() + ' Ks</b>\n📱 ' + dep.method, depKb(dep.id, dep.status));
}
async function notifyOrder(o) {
  const db = getDb();
  const { telegramBotToken: t, telegramChatId: c } = db.config;
  if (!t || !c) return;
  const sid = o.serverId ? ' • S:' + o.serverId : '';
  await send(c, '🔔 <b>Order အသစ်</b>\n━━━━━━━━━━━━━\n👤 ' + o.username + '\n🎮 ' + o.game + '\n📦 ' + o.product + '\n💵 ' + o.price.toLocaleString() + ' Ks\n🆔 ' + o.playerId + sid, ordKb(o.id, o.status));
}
async function notifyChat(u, text) {
  const db = getDb();
  const { telegramBotToken: t, telegramChatId: c } = db.config;
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
  console.log('Bot v4 loaded:', BOT_VER);
  return { notifyDeposit, notifyOrder, notifyChat, notifyUser };
};
