import { json, getDB, saveDB } from '../_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json() || {};
    if (!username || !password) return json({ success: false, error: 'ဖြည့်ပါ' });
    const db = await getDB(env);
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return json({ success: false, error: 'Username သို့ Password မှား' });
    if (user.banned) return json({ success: false, error: 'Account ပိတ်ထားသည်' });
    const token = 'tok_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    if (!db.sessions) db.sessions = {};
    db.sessions[token] = { userId: user.id, username: user.username, createdAt: Date.now() };
    await saveDB(env, db);
    return json({ success: true, token, username: user.username });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
