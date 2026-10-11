import { json, getDB, saveDB, getUser, genId } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.deposits.filter(d => d.username === user.username));
  } catch(e) { return json({ error: e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);
    const body = await request.json();
    const { amount, method, receipt } = body || {};
    if (!amount || amount < 1000) return json({ success: false, error: 'အနည်းဆုံး 1000 Ks' });
    if (!receipt) return json({ success: false, error: 'Receipt ပုံ ထည့်ပါ' });
    
    const db = await getDB(env);
    const dep = {
      id: genId('DEP'),
      username: user.username,
      userId: user.id,
      amount: Number(amount),
      method: method || 'KBZ Pay',
      receipt,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.deposits.push(dep);
    await saveDB(env, db);
    return json({ success: true, message: 'Deposit တင်ပြီ — Admin စစ်ဆေးမယ်' });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
