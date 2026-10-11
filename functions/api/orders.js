import { json, getDB, saveDB, getUser, genId } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.orders.filter(o => o.username === user.username));
  } catch(e) { return json({ error: e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);
    if (user.banned) return json({ success: false, error: 'Account ပိတ်ထားသည်' }, 403);
    
    const body = await request.json();
    const { productId, playerId, serverId } = body || {};
    if (!playerId) return json({ success: false, error: 'Player ID ဖြည့်ပါ' });
    
    const db = await getDB(env);
    const product = db.products.find(p => p.id === productId);
    if (!product) return json({ success: false, error: 'Product မတွေ့' });
    if ((user.balance || 0) < product.price) return json({ success: false, error: 'Balance မလုံလောက်ပါ' });
    
    user.balance -= product.price;
    user.totalSpent = (user.totalSpent || 0) + product.price;
    
    const order = {
      id: genId('ORD'),
      username: user.username,
      userId: user.id,
      game: product.game,
      product: product.name,
      price: product.price,
      playerId,
      serverId: serverId || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.orders.push(order);
    await saveDB(env, db);
    return json({ success: true, orderId: order.id, balance: user.balance });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
