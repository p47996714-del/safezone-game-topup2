import { json, getDB } from '../_utils.js';
export async function onRequestGet({ env }) {
  try {
    const db = await getDB(env);
    return json(db.products || []);
  } catch(e) { return json({ error: e.message }, 500); }
}
