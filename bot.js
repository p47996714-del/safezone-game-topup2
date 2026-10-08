let botOffset = 0;
let running = false;
let getDb, saveDb;
const userStates = {};

function tgApi(method, body, token) {
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(() => null);
}

async function send(chatId, text, keyboard) {
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  return tgApi('sendMessage', {
    chat_id: chatId, text, parse_mode:'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard ? {inline_keyboard: keyboard} : undefined
  }, db.config.telegramBotToken);
}

async function edit(chatId, msgId, text, keyboard) {
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  return tgApi('editMessageText', {
    chat_id: chatId, message_id: msgId, text, parse_mode:'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard ? {inline_keyboard: keyboard} : undefined
  }, db.config.telegramBotToken);
}

async function answer(cbId, text) {
  const db = getDb();
  return tgApi('answerCallbackQuery',
    { callback_query_id: cbId, text: text || '' },
    db.config.telegramBotToken);
}

// ===== MAIN MENU =====
function adminMenu() {
  return [
    [{text:'📊 Pending', callback_data:'menu_pending'}, {text:'📈 Stats', callback_data:'menu_stats'}],
    [{text:'👥 Users', callback_data:'menu_users'}, {text:'💬 Chats', callback_data:'menu_chats'}],
    [{text:'❓ FAQ', callback_data:'menu_faq'}, {text:'🏠 Home', callback_data:'menu_home'}]
  ];
}

function userMenu() {
  return [
    [{text:'💰 Balance', callback_data:'u_balance'}, {text:'📦 Orders', callback_data:'u_orders'}],
    [{text:'💳 Deposit', callback_data:'u_deposit'}, {text:'💬 Chat Admin', callback_data:'u_chat'}],
    [{text:'❓ FAQ', callback_data:'u_faq'}, {text:'👤 Profile', callback_data:'u_profile'}]
  ];
}

function userNotLinked() {
  return [
    [{text:'🔗 Account ချိတ်ဆက်', callback_data:'u_link'}],
    [{text:'❓ FAQ', callback_data:'u_faq'}]
  ];
}

function depButtons(id, status) {
  if (status !== 'pending') return [];
  return [[
    {text:'✅ Approve', callback_data:'dep_approve_' + id},
    {text:'❌ Reject', callback_data:'dep_reject_' + id}
  ]];
}

function ordButtons(id, status) {
  if (status === 'completed' || status === 'rejected') return [];
  if (status === 'pending') return [
    [{text:'⚙️ Processing', callback_data:'ord_processing_' + id}, {text:'✅ Complete', callback_data:'ord_completed_' + id}],
    [{text:'❌ Reject', callback_data:'ord_rejected_' + id}]
  ];
  if (status === 'processing') return [[
    {text:'✅ Complete', callback_data:'ord_completed_' + id},
    {text:'❌ Reject', callback_data:'ord_rejected_' + id}
  ]];
  return [];
}

// ===== CARDS =====
function depCard(d) {
  const e = d.status === 'pending' ? '⏳' : d.status === 'approved' ? '✅' : '❌';
  return `${e} <b>Deposit ${d.status.toUpperCase()}</b>

👤  ${d.username}
💵  <b>${d.amount.toLocaleString()} Ks</b>
💳  ${d.method}
🆔  <code>${d.id}</code>
🕐  ${new Date(d.createdAt).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`;
}

function ordCard(o) {
  const e = {pending:'⏳',processing:'⚙️',completed:'✅',rejected:'❌'}[o.status] || 'ℹ️';
  const sid = o.serverId ? ` (S: ${o.serverId})` : '';
  return `${e} <b>Order ${o.status.toUpperCase()}</b>

👤  ${o.username}
🎮  ${o.game}
📦  ${o.product}
💵  <b>${o.price.toLocaleString()} Ks</b>
🆔  <code>${o.playerId}${sid}</code>
🔖  <code>${o.id}</code>`;
}

const FAQ = `❓ <b>FAQ</b>

<b>1.</b> Deposit ဘယ်လောက်ကြာလဲ?
   → ၅-၁၅ မိနစ်

<b>2.</b> Order Reject ဖြစ်ရင်?
   → ငွေ ၁၀၀% ပြန်အမ်း

<b>3.</b> Player ID မှားထည့်မိရင်?
   → Chat မှာ ချက်ချင်းပြော

<b>4.</b> Server ID ဆိုတာ?
   → MLBB/Magic Chess အတွက် လိုတယ်

<b>5.</b> Order ဘယ်လောက်ကြာလဲ?
   → ၁၀-၃၀ မိနစ်

<b>6.</b> ငွေလွှဲနည်း?
   → KBZ / Wave / UAB / AYA
   → 09763442881
   → Mg Pyae Phyo Kyaw`;

// ===== ADMIN HANDLER =====
async function handleAdmin(chatId, cq, db) {
  const data = cq.data || '';
  const msgId = cq.message.message_id;

  // Menu
  if (data === 'menu_home') {
    await edit(chatId, msgId, `🎮 <b>Safe Zone Admin</b>\n\nအောက်က ခလုတ်တွေ နှိပ်ပါ`, adminMenu());
    return answer(cq.id, '🏠');
  }
  if (data === 'menu_pending') {
    await answer(cq.id, '📊 Loading...');
    return showPending(chatId);
  }
  if (data === 'menu_stats') {
    await answer(cq.id, '📈 Loading...');
    return showStats(chatId);
  }
  if (data === 'menu_users') {
    await answer(cq.id, '👥 Loading...');
    return showUsers(chatId);
  }
  if (data === 'menu_chats') {
    await answer(cq.id, '💬 Loading...');
    return showChats(chatId);
  }
  if (data === 'menu_faq') {
    await edit(chatId, msgId, FAQ, [[{text:'🏠 Home', callback_data:'menu_home'}]]);
    return answer(cq.id, '❓');
  }

  // Deposit
  if (data.startsWith('dep_')) {
    const parts = data.split('_');
    const action = parts[1];
    const id = parts.slice(2).join('_');
    const dep = db.deposits.find(d => d.id === id);
    if (!dep) return answer(cq.id, '❌ မတွေ့');
    if (dep.status !== 'pending') return answer(cq.id, '⚠️ ပြီးသား');

    if (action === 'approve') {
      const user = db.users.find(u => u.id === dep.userId);
      if (!user) return answer(cq.id, '❌ User မတွေ့');
      user.balance = (user.balance || 0) + dep.amount;
      dep.status = 'approved';
      dep.approvedAt = Date.now();
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id:'N'+Date.now(), userId: user.id,
        message: '✅ ငွေ ' + dep.amount.toLocaleString() + ' Ks ဖြည့်မှု အတည်ပြုပြီးပါပြီ',
        read: false, createdAt: Date.now()
      });
      saveDb();
      await edit(chatId, msgId,
        `✅ <b>Approved</b>\n\n👤 ${dep.username}\n💵 +${dep.amount.toLocaleString()} Ks\n💰 New: ${user.balance.toLocaleString()} Ks`,
        [[{text:'📊 Pending', callback_data:'menu_pending'}], [{text:'🏠 Home', callback_data:'menu_home'}]]
      );
      return answer(cq.id, '✅ Approved');
    }

    if (action === 'reject') {
      dep.status = 'rejected';
      dep.rejectedAt = Date.now();
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id:'N'+Date.now(), userId: dep.userId,
        message: '❌ ငွေ ' + dep.amount.toLocaleString() + ' Ks ဖြည့်မှု ပယ်ဖျက်ခဲ့ပါတယ်',
        read: false, createdAt: Date.now()
      });
      saveDb();
      await edit(chatId, msgId,
        `❌ <b>Rejected</b>\n\n👤 ${dep.username}\n💵 ${dep.amount.toLocaleString()} Ks`,
        [[{text:'📊 Pending', callback_data:'menu_pending'}], [{text:'🏠 Home', callback_data:'menu_home'}]]
      );
      return answer(cq.id, '❌ Rejected');
    }
  }

  // Order
  if (data.startsWith('ord_')) {
    const parts = data.split('_');
    const action = parts[1];
    const id = parts.slice(2).join('_');
    const o = db.orders.find(x => x.id === id);
    if (!o) return answer(cq.id, '❌ မတွေ့');
    if (o.status === action) return answer(cq.id, '⚠️ ပြီးသား');

    if (action === 'rejected' && o.status !== 'rejected') {
      const u = db.users.find(x => x.id === o.userId);
      if (u) u.balance = (u.balance || 0) + o.price;
    }
    o.status = action;
    o.updatedAt = Date.now();

    const msgs = {
      processing: '⚙️ Order ' + o.id + ' ပြင်ဆင်နေပါပြီ',
      completed: '✅ Order ' + o.id + ' ပြီးစီးပါပြီ!',
      rejected: '❌ Order ' + o.id + ' ပယ်ဖျက်ခဲ့ပါတယ်'
    };
    if (msgs[action]) {
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id:'N'+Date.now(), userId: o.userId,
        message: msgs[action], read: false, createdAt: Date.now()
      });
    }
    saveDb();

    const e = {processing:'⚙️', completed:'✅', rejected:'❌'}[action] || 'ℹ️';
    await edit(chatId, msgId, ordCard(o),
      ordButtons(o.id, o.status).concat([[{text:'📊 Pending', callback_data:'menu_pending'}], [{text:'🏠 Home', callback_data:'menu_home'}]])
    );
    return answer(cq.id, e + ' ' + action);
  }

  return answer(cq.id, '❓');
}

// ===== USER HANDLER =====
async function handleUser(chatId, cq, db) {
  const user = db.users.find(x => x.telegramId === String(chatId));
  const data = cq.data || '';
  const msgId = cq.message.message_id;

  // Not linked
  if (!user) {
    if (data === 'u_link') {
      userStates[chatId] = { step: 'username' };
      await answer(cq.id, '🔗');
      return edit(chatId, msgId, '🔗 <b>Account ချိတ်ဆက်</b>\n\n<b>Step 1/2</b>\n\n📝 Website <b>Username</b> ရိုက်ပါ');
    }
    if (data === 'u_faq') {
      await answer(cq.id, '❓');
      return edit(chatId, msgId, FAQ, [[{text:'🔗 ချိတ်ဆက်', callback_data:'u_link'}]]);
    }
    return answer(cq.id, '');
  }

  // Linked user
  if (data === 'u_balance') {
    await answer(cq.id, '💰');
    return edit(chatId, msgId,
      `💰 <b>Balance</b>\n\n👤 ${user.username}\n💵 <b>${user.balance.toLocaleString()} Ks</b>\n⭐ ${user.points || 0} Points\n🎁 ${user.referralCode}`,
      [[{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_orders') {
    await answer(cq.id, '📦');
    const orders = db.orders.filter(o => o.userId === user.id).reverse().slice(0, 5);
    if (!orders.length) {
      return edit(chatId, msgId, '📦 <b>Orders</b>\n\nOrder မရှိသေးပါ',
        [[{text:'🏠 Home', callback_data:'u_home'}]]);
    }
    const txt = '📦 <b>Orders</b>\n\n' + orders.map(o => {
      const e = {pending:'⏳',processing:'⚙️',completed:'✅',rejected:'❌'}[o.status];
      const sid = o.serverId ? ' (S:' + o.serverId + ')' : '';
      return `${e} <b>${o.game}</b> - ${o.product}\n     ${o.price.toLocaleString()} Ks · ${o.playerId}${sid}`;
    }).join('\n\n');
    return edit(chatId, msgId, txt, [[{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_deposit') {
    await answer(cq.id, '💳');
    return edit(chatId, msgId,
      `💳 <b>Deposit နည်း</b>\n\n<b>1.</b> KBZ / Wave / UAB / AYA ဖွင့်\n<b>2.</b> ငွေလွှဲ:\n   📱 <code>09763442881</code>\n   👤 Mg Pyae Phyo Kyaw\n<b>3.</b> Website မှာ Deposit တင်\n\n⏱ ၅-၁၅ မိနစ်`,
      [[{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_chat') {
    await answer(cq.id, '💬');
    return edit(chatId, msgId,
      `💬 <b>Chat Admin</b>\n\nဒီနေရာမှာ စာရေးလိုက်ရင် Admin ဆီ ရောက်မယ်`,
      [[{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_faq') {
    await answer(cq.id, '❓');
    return edit(chatId, msgId, FAQ, [[{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_profile') {
    await answer(cq.id, '👤');
    return edit(chatId, msgId,
      `👤 <b>Profile</b>\n\n👤 ${user.username}\n📱 ${user.phone || '-'}\n💰 ${user.balance.toLocaleString()} Ks\n⭐ ${user.points || 0} Points`,
      [[{text:'🚪 Unlink', callback_data:'u_unlink'}], [{text:'🏠 Home', callback_data:'u_home'}]]);
  }
  if (data === 'u_unlink') {
    await answer(cq.id, '🚪');
    user.telegramId = null;
    saveDb();
    return edit(chatId, msgId,
      `👋 Bot မှ ကြိုဆိုပါတယ်\n\nAccount ချိတ်ဆက်ရန် အောက်က ခလုတ် နှိပ်ပါ`,
      userNotLinked());
  }
  if (data === 'u_home') {
    await answer(cq.id, '🏠');
    return edit(chatId, msgId,
      `🎮 <b>Safe Zone</b>\n\n👤 ${user.username}\n💰 <b>${user.balance.toLocaleString()} Ks</b>`,
      userMenu());
  }
  return answer(cq.id, '');
}

// ===== SHOW FUNCTIONS =====
async function showPending(chatId) {
  const db = getDb();
  const deps = db.deposits.filter(d => d.status === 'pending');
  const ords = db.orders.filter(o => o.status === 'pending' || o.status === 'processing');

  if (!deps.length && !ords.length) {
    return send(chatId, '🎉 <b>Pending မရှိပါ</b>', [[{text:'🏠 Home', callback_data:'menu_home'}]]);
  }

  await send(chatId, `📊 <b>Pending</b>\n\n💰 Deposits: <b>${deps.length}</b>\n📦 Orders: <b>${ords.length}</b>`);

  for (const d of deps.slice(0, 10)) {
    await send(chatId, depCard(d), depButtons(d.id, d.status));
  }
  for (const o of ords.slice(0, 10)) {
    await send(chatId, ordCard(o), ordButtons(o.id, o.status));
  }
  await send(chatId, '👆 ခလုတ်နှိပ်ပါ', [[{text:'🏠 Home', callback_data:'menu_home'}]]);
}

async function showStats(chatId) {
  const db = getDb();
  const today = new Date(); today.setHours(0,0,0,0);
  const ts = today.getTime();
  const totalRev = db.orders.filter(o => o.status === 'completed').reduce((s,o) => s + o.price, 0);
  const todayRev = db.orders.filter(o => o.status === 'completed' && o.createdAt >= ts).reduce((s,o) => s + o.price, 0);
  const pendD = db.deposits.filter(d => d.status === 'pending').length;
  const pendO = db.orders.filter(o => o.status === 'pending').length;

  const text = `📈 <b>Statistics</b>

👥 <b>Users</b>
   Total: ${db.users.length}
   Today: +${db.users.filter(u => u.createdAt >= ts).length}

📦 <b>Orders</b>
   Total: ${db.orders.length}
   Today: ${db.orders.filter(o => o.createdAt >= ts).length}
   Pending: ${pendO}

💰 <b>Revenue</b>
   Total: ${totalRev.toLocaleString()} Ks
   Today: ${todayRev.toLocaleString()} Ks

⏳ <b>Waiting</b>
   Deposits: ${pendD}
   Chats: ${db.chats.filter(c => c.from === 'user' && !c.read).length}`;

  return send(chatId, text, [[{text:'🏠 Home', callback_data:'menu_home'}]]);
}

async function showUsers(chatId) {
  const db = getDb();
  const users = [...db.users].sort((a,b) => b.createdAt - a.createdAt).slice(0, 10);
  if (!users.length) return send(chatId, '👥 User မရှိပါ', [[{text:'🏠 Home', callback_data:'menu_home'}]]);

  const lines = users.map((u, i) => {
    const m = ['🥇','🥈','🥉'][i] || (i+1) + '.';
    const link = u.telegramId ? ' 🔗' : '';
    return `${m} <b>${u.username}</b>${link}\n     💰 ${u.balance.toLocaleString()} Ks`;
  }).join('\n\n');

  return send(chatId, `👥 <b>Recent Users</b>\n\n${lines}`, [[{text:'🏠 Home', callback_data:'menu_home'}]]);
}

async function showChats(chatId) {
  const db = getDb();
  const map = {};
  db.chats.forEach(c => {
    if (!map[c.userId]) map[c.userId] = { username: c.username, last: c, unread: 0 };
    if (c.createdAt > map[c.userId].last.createdAt) map[c.userId].last = c;
    if (c.from === 'user' && !c.read) map[c.userId].unread++;
  });
  const list = Object.values(map).sort((a,b) => b.last.createdAt - a.last.createdAt).slice(0, 10);
  if (!list.length) return send(chatId, '💬 Chat မရှိပါ', [[{text:'🏠 Home', callback_data:'menu_home'}]]);

  const lines = list.map(c => {
    const badge = c.unread > 0 ? ` 🔴 ${c.unread}` : '';
    const preview = String(c.last.text || '[Media]').slice(0, 40);
    return `<b>${c.username}</b>${badge}\n<i>${preview}</i>`;
  }).join('\n\n');

  return send(chatId, `💬 <b>Chats</b>\n\n${lines}\n\n<i>Website Admin မှာ reply ပါ</i>`, [[{text:'🏠 Home', callback_data:'menu_home'}]]);
}

// ===== MAIN UPDATE =====
async function handleUpdate(u) {
  const db = getDb();
  const adminId = String(db.config.telegramChatId || '');
  let chatId = null;

  if (u.callback_query) chatId = String(u.callback_query.message.chat.id);
  else if (u.message) chatId = String(u.message.chat.id);
  if (!chatId) return;

  // Callback (button click)
  if (u.callback_query) {
    const cq = u.callback_query;
    try {
      if (chatId === adminId && adminId) {
        return handleAdmin(chatId, cq, db);
      } else {
        return handleUser(chatId, cq, db);
      }
    } catch(e) {
      console.log('cb err:', e.message);
      return answer(cq.id, '❌ Error');
    }
  }

  // Text message
  const msg = u.message;
  if (!msg || !msg.text) return;
  const txt = msg.text.trim();

  // Admin text
  if (chatId === adminId && adminId) {
    if (txt === '/start' || txt === '/menu') {
      return send(chatId, `🎮 <b>Safe Zone Admin</b>\n\nအောက်က ခလုတ်တွေ နှိပ်ပါ`, adminMenu());
    }
    if (txt === '/pending') return showPending(chatId);
    if (txt === '/stats') return showStats(chatId);
    if (txt === '/users') return showUsers(chatId);
    if (txt === '/chats') return showChats(chatId);
    if (txt === '/faq') return send(chatId, FAQ, [[{text:'🏠 Home', callback_data:'menu_home'}]]);
    return;
  }

  // User text
  const user = db.users.find(x => x.telegramId === String(chatId));
  const state = userStates[chatId] || {};

  if (!user) {
    if (txt === '/start') {
      return send(chatId, `👋 <b>Safe Zone မှ ကြိုဆိုပါတယ်</b>\n\nAccount ချိတ်ဆက်ရန် အောက်က ခလုတ် နှိပ်ပါ`, userNotLinked());
    }
    if (state.step === 'username') {
      const check = db.users.find(u2 => u2.username === txt);
      if (!check) {
        delete userStates[chatId];
        return send(chatId, '❌ Username မတွေ့ပါ\n\n/link ပြန်စမ်းပါ', [[{text:'🔗 ပြန်စမ်း', callback_data:'u_link'}]]);
      }
      userStates[chatId] = { step: 'password', username: txt };
      return send(chatId, '🔐 <b>Step 2/2</b>\n\nPassword ရိုက်ပါ');
    }
    if (state.step === 'password') {
      const u2 = db.users.find(x => x.username === state.username && x.password === txt);
      delete userStates[chatId];
      if (!u2) {
        return send(chatId, '❌ Password မှား\n\n/link ပြန်စမ်းပါ', [[{text:'🔗 ပြန်စမ်း', callback_data:'u_link'}]]);
      }
      u2.telegramId = String(chatId);
      saveDb();
      return send(chatId,
        `✅ <b>ချိတ်ဆက်ပြီးပါပြီ</b>\n\n👤 ${u2.username}\n💰 ${u2.balance.toLocaleString()} Ks`,
        userMenu());
    }
    return;
  }

  if (txt === '/start' || txt === '/menu') {
    return send(chatId, `🎮 <b>Safe Zone</b>\n\n👤 ${user.username}\n💰 <b>${user.balance.toLocaleString()} Ks</b>`, userMenu());
  }
  if (txt === '/balance') {
    return send(chatId, `💰 <b>${user.balance.toLocaleString()} Ks</b>`, userMenu());
  }
  if (txt === '/faq') return send(chatId, FAQ, userMenu());

  // Chat to admin
  if (!db.chats) db.chats = [];
  db.chats.push({
    id:'C'+Date.now()+Math.random().toString(36).slice(2,5),
    userId: user.id, username: user.username,
    from: 'user', text: txt, createdAt: Date.now(), read: false
  });
  saveDb();

  if (adminId) {
    await send(adminId, `💬 <b>Message from ${user.username}</b>\n\n<i>"${txt.slice(0, 200)}"</i>`);
  }
  return send(chatId, `✅ စာပို့ပြီးပါပြီ`, userMenu());
}

// ===== NOTIFY =====
async function notifyDeposit(dep) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', {
    chat_id: telegramChatId,
    text: `🔔 <b>Deposit အသစ်</b>\n\n` + depCard(dep),
    parse_mode:'HTML',
    reply_markup: {inline_keyboard: depButtons(dep.id, dep.status)}
  }, telegramBotToken);
}

async function notifyOrder(order) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', {
    chat_id: telegramChatId,
    text: `🔔 <b>Order အသစ်</b>\n\n` + ordCard(order),
    parse_mode:'HTML',
    reply_markup: {inline_keyboard: ordButtons(order.id, order.status)}
  }, telegramBotToken);
}

async function notifyChat(user, text) {
  const db = getDb();
  const { telegramBotToken, telegramChatId } = db.config;
  if (!telegramBotToken || !telegramChatId) return;
  await tgApi('sendMessage', {
    chat_id: telegramChatId,
    text: `💬 <b>${user.username}</b>\n\n<i>"${String(text).slice(0, 200)}"</i>`,
    parse_mode:'HTML'
  }, telegramBotToken);
}

async function notifyUser(user, text) {
  if (!user.telegramId) return;
  const db = getDb();
  if (!db.config.telegramBotToken) return;
  await send(user.telegramId, `💬 <b>Admin Reply</b>\n\n<i>${text}</i>`, userMenu());
}

// ===== POLLING =====
async function pollLoop() {
  if (running) return;
  running = true;
  while (true) {
    const db = getDb();
    const token = db.config.telegramBotToken;
    if (!token) { await sleep(5000); continue; }
    try {
      const r = await tgApi('getUpdates', { offset: botOffset + 1, timeout: 25 }, token);
      if (r && r.ok) {
        for (const u of r.result) {
          botOffset = Math.max(botOffset, u.update_id);
          try { await handleUpdate(u); } catch(e) { console.log('upd err:', e.message); }
        }
      } else {
        await sleep(3000);
      }
    } catch(e) { await sleep(3000); }
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = function initBot(opts) {
  getDb = opts.getDb;
  saveDb = opts.saveDb;
  pollLoop();
  return { notifyDeposit, notifyOrder, notifyChat, notifyUser };
};
