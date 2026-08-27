import { db, events } from "hatchable";

export const access = "public";
export const methods = ["GET", "POST", "PATCH"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const q = await db.query("SELECT * FROM bridge_orders ORDER BY created_at DESC LIMIT $1", [limit]);
    return res.json(q.rows);
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (!b.orderId || !b.customer || !b.type || !Array.isArray(b.items)) {
      return res.status(400).json({ error: "orderId, customer, type, and items are required" });
    }
    const q = await db.query("INSERT INTO bridge_orders (order_id,customer,order_type,pickup_time,phone,items) VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (order_id) DO UPDATE SET customer=EXCLUDED.customer,order_type=EXCLUDED.order_type,pickup_time=EXCLUDED.pickup_time,phone=EXCLUDED.phone,items=EXCLUDED.items,status='pending',agent_log='[]'::jsonb,updated_at=now() RETURNING *", [b.orderId,b.customer,b.type,b.pickupTime||null,b.phone||null,JSON.stringify(b.items)]);
    await events.publish("orderline", "bridge.changed", { id: String(q.rows[0].id), orderId: b.orderId });
    return res.status(201).json(q.rows[0]);
  }

  const b = req.body || {};
  if (!b.id || !b.status) return res.status(400).json({ error: "id and status are required" });
  const q = await db.query("UPDATE bridge_orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING *", [b.status,Number(b.id)]);
  if (!q.rows[0]) return res.status(404).json({ error: "Bridge order not found" });
  await events.publish("orderline", "bridge.changed", { id: String(b.id), status: b.status });
  res.json(q.rows[0]);
}