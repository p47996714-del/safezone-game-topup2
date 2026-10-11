import { json, getDB, saveDB, getAdmin } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.users || []);
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const { username, action, value } = await request.json() || {};
    const db = await getDB(env);
    const user = db.users.find(u => u.username === username);
    if (!user) return json({ success: false, error: 'User မတွေ့' });
    if (action === 'ban') user.banned = value !== false;
    else if (action === 'unban') user.banned = false;
    else if (action === 'balance') user.balance = Number(value) || 0;
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
