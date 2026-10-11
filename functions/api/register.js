import { json, getDB, saveDB, genId } from '../_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const { username, password, phone } = await request.json() || {};
    if (!username || !password || !phone) return json({ success: false, error: 'ဖြည့်ပါ' });
    if (username.length < 3) return json({ success: false, error: 'Username အနည်းဆုံး ၃ လုံး' });
    if (password.length < 6) return json({ success: false, error: 'Password အနည်းဆုံး ၆ လုံး' });
    const db = await getDB(env);
    if (db.users.find(u => u.username === username)) return json({ success: false, error: 'Username ရှိပြီးသား' });
    const user = {
      id: genId('U'), username, password, phone,
      balance: 0, points: 0, totalSpent: 0, vip: 'Bronze', banned: false,
      referralCode: 'REF' + username.substring(0, 4).toUpperCase(),
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    await saveDB(env, db);
    return json({ success: true, userId: user.id });
  } catch(e) { return json({ success: false, error: e.message }, 500); }
}
