import { json, getDB, getUser } from '../_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.banned) return json({ error: 'Account ပိတ်ထားသည်' }, 403);
    const db = await getDB(env);
    const userOrders = db.orders.filter(o => o.username === user.username);
    return json({
      id: user.id, username: user.username, phone: user.phone,
      balance: user.balance || 0, points: user.points || 0,
      totalSpent: user.totalSpent || 0, vip: user.vip || 'Bronze',
      referralCode: user.referralCode, twoFA: user.twoFA || false,
      unread: 0, orders: userOrders
    });
  } catch(e) { return json({ error: e.message }, 500); }
}
