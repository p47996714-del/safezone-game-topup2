import { json, getDB } from '../_utils.js';
export async function onRequestGet({ env }) {
  try {
    const db = await getDB(env);
    const cb = (db.config && db.config.chatBot) || { enabled: true, rules: [] };
    return json({ enabled: cb.enabled !== false, rules: cb.rules || [] });
  } catch(e) { return json({ enabled: false, rules: [] }); }
}
