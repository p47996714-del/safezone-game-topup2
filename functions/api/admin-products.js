import { json, getDB, saveDB, getAdmin, genId } from './_utils.js';
export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ error: 'Unauthorized' }, 401);
    const db = await getDB(env);
    return json(db.products || []);
  } catch(e) { return json({ error: e.message }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const { game, name, price, image, category, subCategory } = await request.json() || {};
    if (!game || !name || !price) return json({ success: false, error: 'ဖြည့်ပါ' });
    const db = await getDB(env);
    const id = Date.now();
    db.products.push({ id, game, name, price: Number(price), image: image || '🎮', category: category || 'Other', subCategory: subCategory || null, imgUrl: '' });
    await saveDB(env, db);
    return json({ success: true, id });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
export async function onRequestDelete({ request, env }) {
  try {
    const admin = await getAdmin(env, request);
    if (!admin) return json({ success: false, error: 'Unauthorized' }, 401);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const db = await getDB(env);
    db.products = db.products.filter(p => String(p.id) !== String(id));
    await saveDB(env, db);
    return json({ success: true });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
