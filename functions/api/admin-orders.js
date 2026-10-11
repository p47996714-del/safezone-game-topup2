import { json, getDB, saveDB, getAdmin } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.orders || []);
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const { orderId, status } = await request.json() || {};
    const db = await getDB(env);
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return json({ success: false, error: 'Order မတွေ့' });
    if (status === 'rejected' && order.status !== 'rejected') {
      const user = db.users.find(u => u.username === order.username);
      if (user) user.balance = (user.balance || 0) + Number(order.price);
    }
    order.status = status;
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
