/* ============================================
   /api/like — Vercel Serverless Function
   GET  : 全エントリのいいね数を返却 { counts: { id: count } }
   POST : { id } を受け取り該当エントリのカウントを+1し { count } を返却
   ストレージ: Vercel KV (Upstash Redis)
   ============================================ */

import { kv } from '@vercel/kv';

const KEY_PREFIX = 'shiroi:like:';
const ALL_IDS_KEY = 'shiroi:like:ids'; // SET型: 既知のIDを記録

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const ids = (await kv.smembers(ALL_IDS_KEY)) || [];
      if (!ids.length) {
        return res.status(200).json({ counts: {} });
      }
      const keys = ids.map((id) => KEY_PREFIX + id);
      const values = await kv.mget(...keys);
      const counts = {};
      ids.forEach((id, i) => {
        counts[id] = Number(values[i]) || 0;
      });
      return res.status(200).json({ counts });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const id = (body.id || '').toString().trim();

      if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        return res.status(400).json({ error: 'invalid id' });
      }

      const newCount = await kv.incr(KEY_PREFIX + id);
      await kv.sadd(ALL_IDS_KEY, id);

      return res.status(200).json({ id, count: newCount });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('like api error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
