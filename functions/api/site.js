import { json, getDB } from '../_utils.js';
export async function onRequestGet({ env }) {
  try {
    const db = await getDB(env);
    const c = db.config || {};
    return json({
      siteName: c.siteName, logoUrl: c.logoUrl, hero: c.hero,
      theme: c.theme, labels: c.labels, social: c.social,
      payments: c.payments, trustBadges: c.trustBadges, faq: c.faq,
      terms: c.terms, privacy: c.privacy,
      banners: db.banners || [], gameImages: db.gameImages || {},
      payNumber: c.payNumber, payName: c.payName,
      musicUrl: c.musicUrl, musicList: c.musicList || [],
      maintenance: c.maintenance,
      pointsMultiplier: c.pointsMultiplier || 1,
      pointsRedeemRate: c.pointsRedeemRate || 10
    });
  } catch(e) { return json({ error: e.message }, 500); }
}
