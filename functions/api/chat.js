import { json, getDB, saveDB, getUser, genId } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    const msgs = (db.chats || []).filter(c => c.userId === user.id);
    msgs.forEach(m => { if (m.from === 'admin') m.read = true; });
    await saveDB(env, db);
    return json(msgs);
  } catch(e) { return json({ error: e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);
    const { text, image, audio } = await request.json() || {};
    if (!text && !image && !audio) return json({ success: false, error: 'ဖြည့်ပါ' });
    
    const db = await getDB(env);
    if (!db.chats) db.chats = [];
    const msg = {
      id: genId('C'),
      userId: user.id,
      username: user.username,
      from: 'user',
      text: text || '',
      image: image || null,
      audio: audio || null,
      createdAt: new Date().toISOString(),
      read: false
    };
    db.chats.push(msg);
    await saveDB(env, db);
    return json({ success: true, message: msg });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
