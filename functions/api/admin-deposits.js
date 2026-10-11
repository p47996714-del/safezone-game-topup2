import { json, getDB, saveDB, getAdmin } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.deposits || []);
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const { depositId, action } = await request.json() || {};
    const db = await getDB(env);
    const dep = db.deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'pending') return json({ success: false, error: 'Deposit မတွေ့' });
    if (action === 'approve') {
      dep.status = 'approved';
      const user = db.users.find(u => u.username === dep.username);
      if (user) user.balance = (user.balance || 0) + Number(dep.amount);
    } else if (action === 'reject') {
      dep.status = 'rejected';
    } else {
      return json({ success: false, error: 'Invalid action' });
    }
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
