import { createClient } from './supabase/server';
import type { Reward, Shop } from './types';
export async function getPublicData() {
  const db = await createClient();
  const [shop, reward] = await Promise.all([db.from('shop_settings').select('*').eq('id',1).single(), db.from('rewards').select('*').eq('id',1).single()]);
  return { shop: (shop.data || { id: 1, name: 'Kora', tagline: 'Good food. Great company. A little something back.', website_url: null }) as Shop,
    reward: (reward.data || { id: 1, name: 'A dish on the house', description: 'Six visits, one delicious thank you.', image_url: null, updated_at: '' }) as Reward };
}
