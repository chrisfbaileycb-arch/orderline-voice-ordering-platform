import { db, events } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const row = (r) => r && ({
  ...r,
  _id: String(r.id),
  sessionId: r.session_id,
  customerName: r.customer_name,
  tableNumber: r.table_number,
  totalCents: r.total_cents,
  staffMessage: r.staff_message,
  orderId: r.order_id,
  type: r.order_type,
  pickupTime: r.pickup_time,
  agentLog: r.agent_log,
  locationId: r.location_id,
  callSid: r.call_sid,
  callerNumber: r.caller_number,
  callerName: r.caller_name,
  flowStep: r.flow_step,
  flowPath: r.flow_path,
  orderType: r.order_type,
  smsSent: r.sms_sent,
  orderCaptured: r.order_captured,
  acknowledgedAt: r.acknowledged_at == null ? undefined : Number(r.acknowledged_at),
  notificationCount: r.notification_count,
  startedAt: r.started_at == null ? undefined : Number(r.started_at),
  endedAt: r.ended_at == null ? undefined : Number(r.ended_at),
});

async function publish(event, payload = {}) {
  await events.publish("orderline", event, payload);
}

export default async function handler(req, res) {
  const { operation, args = {} } = req.body || {};
  let result;

  switch (operation) {
    case "menu.list": {
      const q = await db.query("SELECT * FROM menu_items WHERE available = true ORDER BY category, id", []);
      result = q.rows.map(row);
      break;
    }
    case "menu.seed":
      result = true;
      break;
    case "orders.place": {
      const total = (args.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
      const q = await db.query(
        "INSERT INTO orders (session_id, customer_name, table_number, items, notes, total_cents) VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING *",
        [args.sessionId, args.customerName, args.tableNumber, JSON.stringify(args.items || []), args.notes || null, total]
      );
      result = String(q.rows[0].id);
      await publish("orders.changed", { id: result });
      break;
    }
    case "orders.getBySession": {
      const q = await db.query("SELECT * FROM orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1", [args.sessionId]);
      result = row(q.rows[0]) || null;
      break;
    }
    case "orders.listAll": {
      const q = await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100", []);
      result = q.rows.map(row);
      break;
    }
    case "orders.updateStatus": {
      await db.query("UPDATE orders SET status=$1, updated_at=now() WHERE id=$2", [args.status, Number(args.orderId)]);
      result = null;
      await publish("orders.changed", { id: String(args.orderId), status: args.status });
      break;
    }
    case "orders.sendStaffMessage": {
      await db.query("UPDATE orders SET staff_message=$1, updated_at=now() WHERE id=$2", [args.message, Number(args.orderId)]);
      result = null;
      await publish("orders.changed", { id: String(args.orderId) });
      break;
    }
    case "bridge.getLatest": {
      const q = await db.query("SELECT * FROM bridge_orders ORDER BY created_at DESC LIMIT 1", []);
      result = row(q.rows[0]) || null;
      break;
    }
    case "bridge.listRecent": {
      const q = await db.query("SELECT * FROM bridge_orders ORDER BY created_at DESC LIMIT 20", []);
      result = q.rows.map(row);
      break;
    }
    case "bridge.pushOrder": {
      const q = await db.query(
        "INSERT INTO bridge_orders (order_id,customer,order_type,pickup_time,phone,items) VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (order_id) DO UPDATE SET customer=EXCLUDED.customer,order_type=EXCLUDED.order_type,pickup_time=EXCLUDED.pickup_time,phone=EXCLUDED.phone,items=EXCLUDED.items,status='pending',agent_log='[]'::jsonb,updated_at=now() RETURNING *",
        [args.orderId, args.customer, args.type, args.pickupTime || null, args.phone || null, JSON.stringify(args.items || [])]
      );
      result = String(q.rows[0].id);
      await publish("bridge.changed", { id: result, orderId: args.orderId });
      break;
    }
    case "bridge.appendLog": {
      await db.query("UPDATE bridge_orders SET agent_log=agent_log || $1::jsonb, updated_at=now() WHERE id=$2", [JSON.stringify([args.entry]), Number(args.bridgeOrderId)]);
      result = null;
      await publish("bridge.changed", { id: String(args.bridgeOrderId) });
      break;
    }
    case "bridge.updateStatus": {
      await db.query("UPDATE bridge_orders SET status=$1, updated_at=now() WHERE id=$2", [args.status, Number(args.bridgeOrderId)]);
      result = null;
      await publish("bridge.changed", { id: String(args.bridgeOrderId), status: args.status });
      break;
    }
    case "callSessions.listActive": {
      const q = await db.query("SELECT * FROM call_sessions WHERE location_id=$1 AND status IN ('active','holding','ai_ordering','forwarding') ORDER BY started_at", [args.locationId]);
      result = q.rows.map(row);
      break;
    }
    case "callSessions.listRecent": {
      const q = await db.query("SELECT * FROM call_sessions WHERE location_id=$1 AND status='completed' AND started_at >= $2 ORDER BY started_at DESC LIMIT 20", [args.locationId, Date.now() - 7200000]);
      result = q.rows.map(row);
      break;
    }
    case "callSessions.simulateCall": {
      const callSid = `SIM-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      const delivery = args.scenario === "delivery_sms";
      const hold = args.scenario === "hold_queue";
      const flowStep = hold ? "holding" : delivery ? "delivery_sms_sent" : "ai_ordering";
      const status = hold ? "holding" : delivery ? "completed" : "ai_ordering";
      const flowPath = hold ? ["greeting","pickup_or_delivery","pickup","automated_or_hold","holding"] : delivery ? ["greeting","pickup_or_delivery","delivery","sms_offer","delivery_sms_sent"] : ["greeting","pickup_or_delivery","pickup","automated","ai_ordering"];
      const q = await db.query("INSERT INTO call_sessions (location_id,call_sid,caller_number,caller_name,flow_step,flow_path,order_type,status,notification_count,started_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10) RETURNING *", [args.locationId,callSid,args.callerNumber,args.callerName||null,flowStep,JSON.stringify(flowPath),delivery?'delivery':hold?'hold':'pickup',status,hold?1:0,Date.now()]);
      result = String(q.rows[0].id);
      await publish("calls.changed", { callSid });
      break;
    }
    case "callSessions.acknowledge": {
      await db.query("UPDATE call_sessions SET acknowledged_at=$1,status='forwarding',flow_step='forwarding_to_staff',flow_path=flow_path || $2::jsonb,updated_at=now() WHERE call_sid=$3", [Date.now(), JSON.stringify(["forwarding_to_staff"]), args.callSid]);
      result = null;
      await publish("calls.changed", { callSid: args.callSid });
      break;
    }
    case "callSessions.complete": {
      await db.query("UPDATE call_sessions SET status='completed',ended_at=$1,updated_at=now() WHERE call_sid=$2", [Date.now(), args.callSid]);
      result = null;
      await publish("calls.changed", { callSid: args.callSid });
      break;
    }
    default:
      return res.status(400).json({ error: `Unsupported Hatchable operation: ${operation}` });
  }

  res.json({ result });
}