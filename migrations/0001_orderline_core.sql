CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_available_category ON menu_items(available, category);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  table_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','preparing','ready','done')),
  notes TEXT,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  staff_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_session_created ON orders(session_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

CREATE TABLE bridge_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('pickup','delivery','dine-in')),
  pickup_time TEXT,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','entered','error')),
  agent_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bridge_orders_created ON bridge_orders(created_at DESC);
CREATE INDEX idx_bridge_orders_status ON bridge_orders(status, created_at DESC);

CREATE TABLE call_sessions (
  id BIGSERIAL PRIMARY KEY,
  location_id TEXT NOT NULL,
  call_sid TEXT NOT NULL UNIQUE,
  caller_number TEXT NOT NULL,
  caller_name TEXT,
  flow_step TEXT NOT NULL DEFAULT 'greeting',
  flow_path JSONB NOT NULL DEFAULT '["greeting"]'::jsonb,
  order_type TEXT CHECK (order_type IN ('pickup','delivery','hold')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','holding','ai_ordering','forwarding','completed','dropped')),
  sms_sent TEXT,
  order_captured TEXT,
  acknowledged_at BIGINT,
  notification_count INTEGER NOT NULL DEFAULT 0,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_sessions_location_status ON call_sessions(location_id, status, started_at DESC);
CREATE INDEX idx_call_sessions_started ON call_sessions(started_at DESC);