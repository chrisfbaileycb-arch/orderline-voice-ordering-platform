// Sample test orders to demonstrate the bridge in action
export const TEST_ORDERS = [
  {
    orderId: `ORD-DEMO-${Date.now()}`,
    customer: "Chris",
    type: "pickup" as const,
    pickupTime: "6:15 PM",
    phone: "555-0192",
    items: [
      { name: "14\" Pepperoni", quantity: 1, modifiers: ["Extra Cheese", "Thin Crust", "Sauce on Side"] },
      { name: "12pc Wings", quantity: 1, modifiers: ["Buffalo", "Ranch"] },
      { name: "French Fries", quantity: 2, modifiers: [] },
      { name: "Soda", quantity: 2, modifiers: ["Coke", "Large"] },
    ],
  },
  {
    orderId: `ORD-DEMO-${Date.now() + 1}`,
    customer: "Maria",
    type: "delivery" as const,
    phone: "555-0847",
    items: [
      { name: "Capicola Sub", quantity: 1, modifiers: ["Provolone", "Banana Peppers", "12 inch"] },
      { name: "Meatball Sub", quantity: 1, modifiers: ["Extra Sauce", "Mozzarella"] },
      { name: "Mozzarella Sticks", quantity: 1, modifiers: [] },
    ],
  },
  {
    orderId: `ORD-DEMO-${Date.now() + 2}`,
    customer: "Dave",
    type: "pickup" as const,
    pickupTime: "7:30 PM",
    phone: "555-2341",
    items: [
      { name: "16\" Cheese Pizza", quantity: 1, modifiers: ["Pepperoni", "Sausage", "Extra Cheese", "Stuffed Crust"] },
      { name: "6pc Wings", quantity: 1, modifiers: ["BBQ", "Blue Cheese"] },
    ],
  },
];
