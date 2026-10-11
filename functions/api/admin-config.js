import { json, getDB, saveDB, getAdmin } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.config || {});
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const body = await request.json() || {};
    const db = await getDB(env);
    if (body.section && body.value !== undefined) {
      db.config[body.section] = body.value;
    } else {
      Object.assign(db.config, body);
    }
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
