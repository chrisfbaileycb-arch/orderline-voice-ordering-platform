/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFunctionName } from "convex/server";

// Sample initial data restored from backups/convex/2026-08-27
const INITIAL_MENU_ITEMS = [
  { _id: "j9703bbhx6nrbt4p3knt84h2s58bjhvm", _creationTime: 1785533397108, available: true, category: "Drinks", description: "Coke, Diet Coke, Lemonade, or Orange Juice", emoji: "🥤", name: "Soft Drink", price: 349 },
  { _id: "j970m8892406wz6m01j0rdw1m98bkdnw", _creationTime: 1785533397108, available: true, category: "Starters", description: "Ask your server for today's homemade soup", emoji: "🍲", name: "Soup of the Day", price: 799 },
  { _id: "j975bmghnctbgh4rege60y2vd98bkg84", _creationTime: 1785533397108, available: true, category: "Mains", description: "Slow-cooked beef ragù, parmesan, fresh pasta", emoji: "🍝", name: "Spaghetti Bolognese", price: 1699 },
  { _id: "j975y787pnagxgjs92zykwt61d8bkmsk", _creationTime: 1785533397108, available: true, category: "Starters", description: "Toasted sourdough with roasted garlic butter and herbs", emoji: "🥖", name: "Garlic Bread", price: 699 },
  { _id: "j976w72qrc820v7w3hse8a3y518bjsdt", _creationTime: 1785533397108, available: true, category: "Desserts", description: "Vanilla cream with berry coulis", emoji: "🍮", name: "Panna Cotta", price: 849 },
  { _id: "j977acenmzmhbm08z913h2ehbs8bj3af", _creationTime: 1785533397108, available: true, category: "Sides", description: "Crispy fries tossed in truffle oil and parmesan", emoji: "🍟", name: "Truffle Fries", price: 899 },
  { _id: "j977cf9jebp3x3jqcq9sramae58bjj3v", _creationTime: 1785533397108, available: true, category: "Sides", description: "Mixed greens, cherry tomatoes, balsamic vinaigrette", emoji: "🥬", name: "Side Salad", price: 699 },
  { _id: "j977dh4cqct121k8h8c4djwef98bkp0p", _creationTime: 1785533397108, available: true, category: "Mains", description: "Breaded chicken, napoli sauce, melted mozzarella", emoji: "🍗", name: "Chicken Parmigiana", price: 1999 },
  { _id: "j977tv2fq65n23cx4qz3vxc8xx8bjb7a", _creationTime: 1785533397108, available: true, category: "Desserts", description: "Chocolate, vanilla, or strawberry", emoji: "🍨", name: "Gelato (2 scoops)", price: 699 },
  { _id: "j978ngfg5gqv8k224jtky7kegd8bkt5m", _creationTime: 1785533397108, available: true, category: "Mains", description: "Atlantic salmon, lemon butter, seasonal veg", emoji: "🐟", name: "Grilled Salmon", price: 2199 },
  { _id: "j97awnsb76k5fy1rdyzq2nz4198bjrz8", _creationTime: 1785533397108, available: true, category: "Mains", description: "Pepperoni, mozzarella, tomato sauce", emoji: "🍕", name: "Pepperoni Pizza", price: 1799 },
  { _id: "j97bctrf4xjpywcaxjqvre3zp18bkkdq", _creationTime: 1785533397108, available: true, category: "Drinks", description: "Chilled San Pellegrino 500ml", emoji: "💧", name: "Sparkling Water", price: 399 },
  { _id: "j97c9v366kgbtcse5a9c25yqt58bjvb8", _creationTime: 1785533397108, available: true, category: "Mains", description: "San Marzano tomato, fresh mozzarella, basil", emoji: "🍕", name: "Margherita Pizza", price: 1599 },
  { _id: "j97cq1d9qv6xxcna2jesqktd958bjp75", _creationTime: 1785533397108, available: true, category: "Starters", description: "Grilled bread topped with fresh tomato, basil & olive oil", emoji: "🍅", name: "Bruschetta", price: 849 },
  { _id: "j97dk6mefhw6c85f58ashf01vs8bk1cq", _creationTime: 1785533397108, available: true, category: "Desserts", description: "Classic Italian dessert with espresso-soaked ladyfingers", emoji: "🍰", name: "Tiramisu", price: 899 },
  { _id: "j97e9s2ax3enqxa91zpbxtgx0x8bj80y", _creationTime: 1785533397108, available: true, category: "Drinks", description: "Glass of our house Pinot Grigio", emoji: "🥂", name: "House White Wine", price: 999 },
  { _id: "j97emj5c82h5st9da94q7q16458bjk0e", _creationTime: 1785533397108, available: true, category: "Sides", description: "Romaine, parmesan, croutons, house caesar dressing", emoji: "🥗", name: "Caesar Salad", price: 1099 },
  { _id: "j97fpmsarxrhgtggshwekha7ms8bj2pc", _creationTime: 1785533397108, available: true, category: "Drinks", description: "Glass of our house Chianti", emoji: "🍷", name: "House Red Wine", price: 999 },
];

const INITIAL_LOCATION = {
  _creationTime: 1785536357825,
  _id: "jx7djkawc1d309n521rpwvd2qh8bkqxs",
  customPrompts: [
    "We are open Monday through Sunday from 11am to 10pm.",
    "We offer free parking in the lot behind the building."
  ],
  deliveryType: "thirdparty",
  locationId: "charlies-demo",
  name: "Charlie's Restaurant",
  phone: "+15550001234",
  pinCode: "1234",
  specials: "Today's special is our famous half-rack ribs for just $18.99, and our soup of the day is roasted tomato bisque.",
  thirdPartyLinks: {
    doordash: "https://doordash.com/store/charlies",
    grubhub: "https://grubhub.com/charlies",
    ubereats: "https://ubereats.com/charlies"
  }
};

const INITIAL_BRIDGE_ORDERS = [
  {
    _creationTime: 1786158494754,
    _id: "jh737q1mmmvem1w96dq7rfvm718c34s6",
    orderId: "TEST-1786158494321-otd8",
    customer: "Phone Order",
    type: "pickup",
    phone: "+13125550101",
    status: "processing",
    items: [
      { name: "Margherita Pizza", quantity: 1, modifiers: ["Extra Cheese"] },
      { name: "Diet Coke", quantity: 2, modifiers: [] }
    ],
    agentLog: [
      { message: "🚀 Agent Bridge initialized for order TEST-1786158494321-otd8", ts: 1786158709452, type: "info" },
      { message: "👤 Customer: Phone Order | Type: pickup", ts: 1786158709507, type: "info" }
    ]
  }
];

const INITIAL_ORDERS = [
  {
    _id: "ord-init-1",
    _creationTime: Date.now() - 1200000,
    sessionId: "table-4-demo",
    customerName: "Alex Rivera",
    tableNumber: "4",
    status: "preparing",
    items: [
      { menuItemId: "j97c9v366kgbtcse5a9c25yqt58bjvb8", name: "Margherita Pizza", price: 1599, quantity: 1 },
      { menuItemId: "j977acenmzmhbm08z913h2ehbs8bj3af", name: "Truffle Fries", price: 899, quantity: 1 },
      { menuItemId: "j9703bbhx6nrbt4p3knt84h2s58bjhvm", name: "Soft Drink", price: 349, quantity: 2 }
    ],
    totalCents: 3196,
    notes: "Extra napkins please"
  },
  {
    _id: "ord-init-2",
    _creationTime: Date.now() - 3600000,
    sessionId: "table-12-demo",
    customerName: "Elena Rostova",
    tableNumber: "12",
    status: "ready",
    items: [
      { menuItemId: "j978ngfg5gqv8k224jtky7kegd8bkt5m", name: "Grilled Salmon", price: 2199, quantity: 2 },
      { menuItemId: "j97e9s2ax3enqxa91zpbxtgx0x8bj80y", name: "House White Wine", price: 999, quantity: 2 }
    ],
    totalCents: 6396,
    notes: "Celebrating anniversary"
  }
];

const INITIAL_CALL_SESSIONS = [
  {
    _id: "call-1",
    _creationTime: Date.now() - 60000,
    locationId: "charlies-demo",
    callSid: "CA-mock-active-1",
    callerNumber: "+13125550188",
    callerName: "David Miller",
    flowStep: "ai_ordering",
    flowPath: ["greeting", "pickup_or_delivery", "pickup", "automated", "ai_ordering"],
    orderType: "pickup",
    status: "ai_ordering",
    notificationCount: 0,
    startedAt: Date.now() - 60000
  },
  {
    _id: "call-2",
    _creationTime: Date.now() - 180000,
    locationId: "charlies-demo",
    callSid: "CA-mock-completed-2",
    callerNumber: "+13125550101",
    callerName: "Sarah Jenkins",
    flowStep: "completed",
    flowPath: ["greeting", "pickup_or_delivery", "pickup", "automated", "ai_ordering", "completed"],
    orderType: "pickup",
    status: "completed",
    notificationCount: 0,
    startedAt: Date.now() - 180000,
    endedAt: Date.now() - 30000
  }
];

const INITIAL_CUSTOMERS = [
  {
    _id: "cust-1",
    _creationTime: Date.now() - 86400000 * 5,
    locationId: "charlies-demo",
    phone: "+13125550101",
    name: "Sarah Jenkins",
    callCount: 6,
    ordersCount: 4,
    lastCallAt: Date.now() - 180000,
    notes: "Prefers table near window. Regular takeout on Fridays.",
    tags: ["Regular", "VIP"]
  },
  {
    _id: "cust-2",
    _creationTime: Date.now() - 86400000 * 12,
    locationId: "charlies-demo",
    phone: "+13125550188",
    name: "David Miller",
    callCount: 2,
    ordersCount: 1,
    lastCallAt: Date.now() - 60000,
    notes: "Allergic to shellfish.",
    tags: ["Takeout"]
  }
];

const INITIAL_SIGNUPS = [
  {
    _id: "signup-1",
    _creationTime: Date.now() - 86400000 * 2,
    restaurantName: "Luigi's Pizzeria",
    contactName: "Luigi Rossi",
    email: "luigi@luigispizza.com",
    phone: "+13125550999",
    locationsCount: 2,
    stage: "demo_completed",
    checklist: { demoCompleted: true, menuUploaded: true, twilioConfigured: false }
  },
  {
    _id: "signup-2",
    _creationTime: Date.now() - 86400000 * 1,
    restaurantName: "Bella Tavola Trattoria",
    contactName: "Marco Conti",
    email: "marco@bellatavola.com",
    phone: "+13125550777",
    locationsCount: 1,
    stage: "lead",
    checklist: { demoCompleted: false, menuUploaded: false, twilioConfigured: false }
  }
];

// Helper to persist/load from localStorage for session persistence across reloads
function loadStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`orderline_mock_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.debug("[MockConvexClient] LocalStorage read failed:", e);
  }
  return defaultValue;
}

function saveStored(key: string, value: any) {
  try {
    localStorage.setItem(`orderline_mock_${key}`, JSON.stringify(value));
  } catch (e) {
    console.debug("[MockConvexClient] LocalStorage write failed:", e);
  }
}

export class MockConvexClient {
  private listeners: Set<() => void> = new Set();

  private menuItems: any[] = loadStored("menuItems", INITIAL_MENU_ITEMS);
  private locations: any[] = loadStored("locations", [INITIAL_LOCATION]);
  private configs: any[] = loadStored("restaurantConfigs", [INITIAL_LOCATION]);
  private orders: any[] = loadStored("orders", INITIAL_ORDERS);
  private bridgeOrders: any[] = loadStored("bridgeOrders", INITIAL_BRIDGE_ORDERS);
  private callSessions: any[] = loadStored("callSessions", INITIAL_CALL_SESSIONS);
  private customers: any[] = loadStored("customers", INITIAL_CUSTOMERS);
  private signups: any[] = loadStored("signups", INITIAL_SIGNUPS);

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn("[MockConvexClient] Listener error:", err);
      }
    });
  }

  private resolveFunctionName(fn: any): string {
    if (typeof fn === "string") return fn;
    try {
      return getFunctionName(fn);
    } catch {
      return String(fn);
    }
  }

  // Reactive queries
  watchQuery(query: any, args: any = {}) {
    const fnName = this.resolveFunctionName(query);

    return {
      onUpdate: (cb: () => void) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
      },
      localQueryResult: () => this.executeQuerySync(fnName, args),
      localQueryLogs: () => [],
      journal: null,
    };
  }

  // Async query execution
  async query(query: any, args: any = {}): Promise<any> {
    const fnName = this.resolveFunctionName(query);
    return this.executeQuerySync(fnName, args);
  }

  private executeQuerySync(fnName: string, args: any = {}): any {
    switch (fnName) {
      case "menu:list": {
        return this.menuItems.filter((m: any) => m.available !== false);
      }

      case "locations:get": {
        const locId = args?.locationId ?? "charlies-demo";
        return this.locations.find((l: any) => l.locationId === locId) ?? this.locations[0];
      }

      case "locations:listAll": {
        return this.locations;
      }

      case "restaurantConfigs:get": {
        const locId = args?.locationId ?? "charlies-demo";
        return this.configs.find((c: any) => c.locationId === locId) ?? this.configs[0];
      }

      case "restaurantConfigs:listAll": {
        return this.configs;
      }

      case "orders:getBySession": {
        if (!args?.sessionId) return null;
        return this.orders.find((o: any) => o.sessionId === args.sessionId) ?? null;
      }

      case "orders:listAll": {
        return [...this.orders].sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0));
      }

      case "bridge:getLatest": {
        return this.bridgeOrders[0] ?? null;
      }

      case "bridge:getByOrderId": {
        return this.bridgeOrders.find((b: any) => b.orderId === args?.orderId) ?? null;
      }

      case "bridge:listRecent": {
        return [...this.bridgeOrders].sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0));
      }

      case "callSessions:listActive": {
        const locId = args?.locationId ?? "charlies-demo";
        return this.callSessions.filter(
          (s: any) => s.locationId === locId && ["active", "holding", "ai_ordering", "forwarding"].includes(s.status)
        );
      }

      case "callSessions:listRecent": {
        const locId = args?.locationId ?? "charlies-demo";
        return this.callSessions
          .filter((s: any) => s.locationId === locId)
          .sort((a: any, b: any) => (b.startedAt || 0) - (a.startedAt || 0))
          .slice(0, 20);
      }

      case "callSessions:get": {
        return this.callSessions.find((s: any) => s.callSid === args?.callSid) ?? null;
      }

      case "customers:list":
      case "customers:listAll": {
        return [...this.customers].sort((a: any, b: any) => (b.lastCallAt || 0) - (a.lastCallAt || 0));
      }

      case "customers:get": {
        return this.customers.find((c: any) => c.phone === args?.phone || c._id === args?.id) ?? null;
      }

      case "customers:getCallHistory": {
        return this.callSessions.filter((s: any) => s.callerNumber === args?.phone);
      }

      case "signups:list":
      case "signups:listAll": {
        return [...this.signups].sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0));
      }

      case "analytics:getSummaryStats": {
        const totalCalls = this.callSessions.length + 120;
        const totalOrders = this.orders.length + 38;
        const totalRevenueCents = this.orders.reduce((sum: number, o: any) => sum + (o.totalCents || 0), 0) + 105000;
        return {
          totalCalls,
          aiAnswered: Math.round(totalCalls * 0.92),
          holdingCalls: Math.round(totalCalls * 0.08),
          aiResolvedRate: 91.5,
          totalOrders,
          totalRevenueCents,
          avgCallDurationSec: 82,
        };
      }

      case "analytics:getHourlyVolume": {
        return [
          { hour: "11 AM", calls: 14, orders: 5 },
          { hour: "12 PM", calls: 32, orders: 12 },
          { hour: "1 PM", calls: 28, orders: 10 },
          { hour: "2 PM", calls: 11, orders: 3 },
          { hour: "5 PM", calls: 22, orders: 8 },
          { hour: "6 PM", calls: 39, orders: 15 },
          { hour: "7 PM", calls: 31, orders: 12 },
          { hour: "8 PM", calls: 16, orders: 6 },
        ];
      }

      case "analytics:listCallLogs": {
        return this.callSessions.map((s: any) => ({
          _id: s._id,
          callSid: s.callSid,
          callerNumber: s.callerNumber,
          callerName: s.callerName || "Customer",
          durationSec: 85,
          status: s.status,
          orderCaptured: s.orderType ? `${s.orderType} order` : "Inquiry",
          startedAt: s.startedAt,
        }));
      }

      case "users:viewer": {
        return {
          _id: "mock-user-1",
          name: "Store Manager",
          email: "manager@orderline.local",
          role: "admin",
        };
      }

      default: {
        return [];
      }
    }
  }

  // Mutations
  async mutation(mutation: any, args: any = {}): Promise<any> {
    const fnName = this.resolveFunctionName(mutation);

    switch (fnName) {
      case "menu:seed": {
        if (this.menuItems.length === 0) {
          this.menuItems = [...INITIAL_MENU_ITEMS];
          saveStored("menuItems", this.menuItems);
          this.notify();
        }
        return true;
      }

      case "orders:place": {
        const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const totalCents = (args.items || []).reduce(
          (sum: number, it: any) => sum + (it.price || 0) * (it.quantity || 1),
          0
        );
        const newOrder = {
          _id: orderId,
          _creationTime: Date.now(),
          sessionId: args.sessionId,
          customerName: args.customerName,
          tableNumber: args.tableNumber,
          items: args.items || [],
          status: "new",
          notes: args.notes,
          totalCents,
        };
        this.orders = [newOrder, ...this.orders];
        saveStored("orders", this.orders);
        this.notify();
        return orderId;
      }

      case "orders:updateStatus": {
        const target = this.orders.find((o: any) => o._id === args.orderId || o.orderId === args.orderId);
        if (target) {
          target.status = args.status;
          saveStored("orders", this.orders);
          this.notify();
        }
        return null;
      }

      case "orders:sendStaffMessage": {
        const target = this.orders.find((o: any) => o._id === args.orderId || o.orderId === args.orderId);
        if (target) {
          target.staffMessage = args.message;
          saveStored("orders", this.orders);
          this.notify();
        }
        return null;
      }

      case "bridge:pushOrder": {
        const existingIdx = this.bridgeOrders.findIndex((b: any) => b.orderId === args.orderId);
        const bridgeId = existingIdx >= 0 ? this.bridgeOrders[existingIdx]._id : `bridge-${Date.now()}`;
        const newRecord = {
          _id: bridgeId,
          _creationTime: Date.now(),
          ...args,
          status: "pending",
          agentLog: [
            {
              message: `Order ${args.orderId} received for ${args.customer}`,
              ts: Date.now(),
              type: "info",
            },
          ],
        };
        if (existingIdx >= 0) {
          this.bridgeOrders[existingIdx] = newRecord;
        } else {
          this.bridgeOrders = [newRecord, ...this.bridgeOrders];
        }
        saveStored("bridgeOrders", this.bridgeOrders);
        this.notify();
        return bridgeId;
      }

      case "bridge:appendLog": {
        const order = this.bridgeOrders.find((b: any) => b._id === args.bridgeOrderId || b.orderId === args.bridgeOrderId);
        if (order) {
          order.agentLog = [...(order.agentLog || []), args.entry];
          saveStored("bridgeOrders", this.bridgeOrders);
          this.notify();
        }
        return null;
      }

      case "bridge:updateStatus": {
        const order = this.bridgeOrders.find((b: any) => b._id === args.bridgeOrderId || b.orderId === args.bridgeOrderId);
        if (order) {
          order.status = args.status;
          saveStored("bridgeOrders", this.bridgeOrders);
          this.notify();
        }
        return null;
      }

      case "callSessions:create": {
        const sid = args.callSid || `CALL-${Date.now()}`;
        const session = {
          _id: `cs-${Date.now()}`,
          _creationTime: Date.now(),
          locationId: args.locationId || "charlies-demo",
          callSid: sid,
          callerNumber: args.callerNumber,
          callerName: args.callerName,
          flowStep: "greeting",
          flowPath: ["greeting"],
          status: "active",
          notificationCount: 0,
          startedAt: Date.now(),
        };
        this.callSessions = [session, ...this.callSessions];
        saveStored("callSessions", this.callSessions);
        this.notify();
        return session._id;
      }

      case "callSessions:advance": {
        const session = this.callSessions.find((s: any) => s.callSid === args.callSid);
        if (session) {
          session.flowStep = args.flowStep;
          session.flowPath = [...(session.flowPath || []), args.flowStep];
          if (args.status) session.status = args.status;
          if (args.orderType) session.orderType = args.orderType;
          if (args.smsSent) session.smsSent = args.smsSent;
          if (args.orderCaptured) session.orderCaptured = args.orderCaptured;
          saveStored("callSessions", this.callSessions);
          this.notify();
        }
        return session?._id ?? null;
      }

      case "callSessions:acknowledge": {
        const session = this.callSessions.find((s: any) => s.callSid === args.callSid);
        if (session) {
          session.acknowledgedAt = Date.now();
          session.status = "forwarding";
          session.flowStep = "forwarding_to_staff";
          session.flowPath = [...(session.flowPath || []), "forwarding_to_staff"];
          saveStored("callSessions", this.callSessions);
          this.notify();
        }
        return null;
      }

      case "callSessions:complete": {
        const session = this.callSessions.find((s: any) => s.callSid === args.callSid);
        if (session) {
          session.status = "completed";
          session.endedAt = Date.now();
          saveStored("callSessions", this.callSessions);
          this.notify();
        }
        return null;
      }

      case "callSessions:simulateCall": {
        const callSid = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const delivery = args.scenario === "delivery_sms";
        const hold = args.scenario === "hold_queue";
        const session = {
          _id: `cs-${Date.now()}`,
          _creationTime: Date.now(),
          locationId: args.locationId || "charlies-demo",
          callSid,
          callerNumber: args.callerNumber || "+13125550144",
          callerName: args.callerName || "Simulated Caller",
          flowStep: hold ? "holding" : delivery ? "delivery_sms_sent" : "ai_ordering",
          status: hold ? "holding" : delivery ? "completed" : "ai_ordering",
          flowPath: hold
            ? ["greeting", "pickup_or_delivery", "pickup", "automated_or_hold", "holding"]
            : delivery
            ? ["greeting", "pickup_or_delivery", "delivery", "sms_offer", "delivery_sms_sent"]
            : ["greeting", "pickup_or_delivery", "pickup", "automated", "ai_ordering"],
          orderType: delivery ? "delivery" : hold ? "hold" : "pickup",
          notificationCount: hold ? 1 : 0,
          startedAt: Date.now(),
        };
        this.callSessions = [session, ...this.callSessions];
        saveStored("callSessions", this.callSessions);
        this.notify();
        return session._id;
      }

      case "restaurantConfigs:saveConfig":
      case "restaurantConfigs:updateDetails": {
        const idx = this.configs.findIndex((c: any) => c.locationId === args.locationId);
        if (idx >= 0) {
          this.configs[idx] = { ...this.configs[idx], ...args };
        } else {
          this.configs.push({ _id: `cfg-${Date.now()}`, ...args });
        }
        saveStored("restaurantConfigs", this.configs);
        this.notify();
        return true;
      }

      case "customers:upsert": {
        const idx = this.customers.findIndex((c: any) => c.phone === args.phone);
        if (idx >= 0) {
          this.customers[idx] = { ...this.customers[idx], ...args };
        } else {
          this.customers.push({ _id: `cust-${Date.now()}`, _creationTime: Date.now(), ...args });
        }
        saveStored("customers", this.customers);
        this.notify();
        return true;
      }

      case "signups:create": {
        const id = `signup-${Date.now()}`;
        const newSignup = {
          _id: id,
          _creationTime: Date.now(),
          ...args,
          stage: "lead",
          checklist: { demoCompleted: false, menuUploaded: false, twilioConfigured: false },
        };
        this.signups = [newSignup, ...this.signups];
        saveStored("signups", this.signups);
        this.notify();
        return id;
      }

      case "signups:updateStage": {
        const signup = this.signups.find((s: any) => s._id === args.signupId);
        if (signup) {
          signup.stage = args.stage;
          saveStored("signups", this.signups);
          this.notify();
        }
        return null;
      }

      case "signups:markChecklistStep": {
        const signup = this.signups.find((s: any) => s._id === args.signupId);
        if (signup) {
          signup.checklist = { ...(signup.checklist || {}), [args.step]: args.completed };
          saveStored("signups", this.signups);
          this.notify();
        }
        return null;
      }

      default: {
        return null;
      }
    }
  }

  // Actions
  async action(action: any, args: any = {}): Promise<any> {
    const fnName = this.resolveFunctionName(action);
    if (fnName.includes("ai:parseOrder") || fnName.includes("parse")) {
      // Mock order parsing for voice simulator
      return {
        items: [
          { name: "Margherita Pizza", quantity: 1, modifiers: ["Extra Basil"] },
          { name: "Soft Drink", quantity: 2, modifiers: [] },
        ],
        notes: "Parsed from simulated voice utterance",
        orderType: args?.type || "pickup",
      };
    }
    return {};
  }

  connectionState() {
    return {
      hasInflightRequests: false,
      isWebSocketConnected: true,
      timeOfOldestInflightRequest: null,
    };
  }

  subscribeToConnectionState(cb: (state: any) => void) {
    cb(this.connectionState());
    return () => {};
  }

  setAuth() {}
  clearAuth() {}
  setAdminAuth() {}
  close() {}
}

export const mockConvexClient = new MockConvexClient();
