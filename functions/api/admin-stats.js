import { json, getDB, getAdmin } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    const today = new Date().toISOString().slice(0, 10);
    let totalRevenue = 0, todayRevenue = 0, todayOrders = 0, unread = 0;
    db.orders.forEach(o => {
      if (o.status === 'completed') totalRevenue += o.price || 0;
      if ((o.createdAt || '').startsWith(today)) {
        todayOrders++;
        if (o.status === 'completed') todayRevenue += o.price || 0;
      }
    });
    (db.chats || []).forEach(m => { if (m.from === 'user' && !m.read) unread++; });
    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chart.push({
        label: key.slice(5),
        value: db.orders.filter(o => o.status === 'completed' && (o.createdAt || '').startsWith(key))
                        .reduce((s, o) => s + (o.price || 0), 0)
      });
    }
    return json({
      totalUsers: db.users.length,
      totalOrders: db.orders.length,
      totalRevenue, todayRevenue,
      pendingDeps: db.deposits.filter(d => d.status === 'pending').length,
      pendingOrders: db.orders.filter(o => o.status === 'pending').length,
      unreadChats: unread, todayOrders, chart
    });
  } catch(e) { return json({ error: e.message }, 500); }
}
