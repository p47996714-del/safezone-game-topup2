import { json, getDB, saveDB, getUser, genId } from './_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const user = await getUser(env, request);
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);
    const { text } = await request.json() || {};
    if (!text) return json({ success: false, error: 'Empty' });
    const db = await getDB(env);
    if (!db.chats) db.chats = [];
    db.chats.push({
      id: genId('B'), userId: user.id, username: user.username,
      from: 'admin', text, bot: true, read: false,
      createdAt: new Date().toISOString()
    });
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
