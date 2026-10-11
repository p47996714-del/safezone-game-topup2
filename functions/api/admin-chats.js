import { json, getDB, saveDB, getAdmin, genId } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    const grouped = {};
    (db.chats || []).forEach(m => {
      if (!grouped[m.userId]) grouped[m.userId] = { userId: m.userId, username: m.username, last: m, unread: 0 };
      grouped[m.userId].last = m;
      if (m.from === 'user' && !m.read) grouped[m.userId].unread++;
    });
    return json(Object.values(grouped));
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const { userId, text } = await request.json() || {};
    if (!userId || !text) return json({ success: false, error: 'ဖြည့်ပါ' });
    const db = await getDB(env);
    if (!db.chats) db.chats = [];
    db.chats.push({
      id: genId('A'),
      userId, from: 'admin', text,
      createdAt: new Date().toISOString(), read: false
    });
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
