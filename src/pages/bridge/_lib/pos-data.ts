// POS Demo Menu Data — mirrors what would be on a real POS terminal screen
// All items matched by text label, just like a real web POS

export type POSCategory = {
  id: string;
  label: string;
  items: POSItem[];
};

export type POSItem = {
  id: string;
  label: string;
  price: number;
  modifiers?: POSModifierGroup[];
};

export type POSModifierGroup = {
  group: string;
  options: string[];
};

export const POS_MENU: POSCategory[] = [
  {
    id: "pizza",
    label: "🍕 Pizza",
    items: [
      {
        id: "p1",
        label: "12\" Cheese Pizza",
        price: 1299,
        modifiers: [
          { group: "Toppings", options: ["Extra Cheese", "Pepperoni", "Sausage", "Mushrooms", "Peppers", "Onions", "Olives", "Anchovies"] },
          { group: "Sauce", options: ["Extra Sauce", "Light Sauce", "Sauce on Side", "No Sauce"] },
          { group: "Crust", options: ["Thin Crust", "Thick Crust", "Stuffed Crust", "Gluten Free"] },
        ],
      },
      { id: "p2", label: "14\" Cheese Pizza", price: 1599, modifiers: [
        { group: "Toppings", options: ["Extra Cheese", "Pepperoni", "Sausage", "Mushrooms", "Peppers", "Onions", "Olives", "Anchovies"] },
        { group: "Sauce", options: ["Extra Sauce", "Light Sauce", "Sauce on Side", "No Sauce"] },
        { group: "Crust", options: ["Thin Crust", "Thick Crust", "Stuffed Crust", "Gluten Free"] },
      ]},
      { id: "p3", label: "16\" Cheese Pizza", price: 1999, modifiers: [
        { group: "Toppings", options: ["Extra Cheese", "Pepperoni", "Sausage", "Mushrooms", "Peppers", "Onions", "Olives", "Anchovies"] },
        { group: "Sauce", options: ["Extra Sauce", "Light Sauce", "Sauce on Side", "No Sauce"] },
        { group: "Crust", options: ["Thin Crust", "Thick Crust", "Stuffed Crust", "Gluten Free"] },
      ]},
      { id: "p4", label: "14\" Pepperoni", price: 1799, modifiers: [
        { group: "Toppings", options: ["Extra Cheese", "Extra Pepperoni", "Mushrooms", "Peppers", "Onions"] },
        { group: "Sauce", options: ["Extra Sauce", "Light Sauce", "Sauce on Side", "No Sauce"] },
        { group: "Crust", options: ["Thin Crust", "Thick Crust", "Stuffed Crust", "Gluten Free"] },
      ]},
      { id: "p5", label: "16\" Pepperoni", price: 2299, modifiers: [
        { group: "Toppings", options: ["Extra Cheese", "Extra Pepperoni", "Mushrooms", "Peppers", "Onions"] },
        { group: "Sauce", options: ["Extra Sauce", "Light Sauce", "Sauce on Side", "No Sauce"] },
        { group: "Crust", options: ["Thin Crust", "Thick Crust", "Stuffed Crust", "Gluten Free"] },
      ]},
    ],
  },
  {
    id: "subs",
    label: "🥖 Subs",
    items: [
      { id: "s1", label: "Italian Sub", price: 1099, modifiers: [
        { group: "Cheese", options: ["American", "Provolone", "Swiss", "No Cheese"] },
        { group: "Extras", options: ["Banana Peppers", "Hot Peppers", "Extra Meat", "Oil & Vinegar"] },
        { group: "Size", options: ["6 inch", "12 inch"] },
      ]},
      { id: "s2", label: "Capicola Sub", price: 1099, modifiers: [
        { group: "Cheese", options: ["American", "Provolone", "Swiss", "No Cheese"] },
        { group: "Extras", options: ["Banana Peppers", "Hot Peppers", "Extra Meat", "Oil & Vinegar"] },
        { group: "Size", options: ["6 inch", "12 inch"] },
      ]},
      { id: "s3", label: "Turkey Sub", price: 999, modifiers: [
        { group: "Cheese", options: ["American", "Provolone", "Swiss", "No Cheese"] },
        { group: "Extras", options: ["Banana Peppers", "Hot Peppers", "Avocado", "Extra Meat"] },
        { group: "Size", options: ["6 inch", "12 inch"] },
      ]},
      { id: "s4", label: "Meatball Sub", price: 1149, modifiers: [
        { group: "Cheese", options: ["Mozzarella", "Parmesan", "No Cheese"] },
        { group: "Extras", options: ["Extra Sauce", "Peppers", "Onions"] },
        { group: "Size", options: ["6 inch", "12 inch"] },
      ]},
    ],
  },
  {
    id: "wings",
    label: "🍗 Wings",
    items: [
      { id: "w1", label: "6pc Wings", price: 899, modifiers: [
        { group: "Sauce", options: ["Buffalo", "BBQ", "Garlic Parmesan", "Honey Mustard", "Plain"] },
        { group: "Style", options: ["Traditional", "Boneless"] },
        { group: "Side", options: ["Ranch", "Blue Cheese", "Extra Sauce"] },
      ]},
      { id: "w2", label: "12pc Wings", price: 1599, modifiers: [
        { group: "Sauce", options: ["Buffalo", "BBQ", "Garlic Parmesan", "Honey Mustard", "Plain"] },
        { group: "Style", options: ["Traditional", "Boneless"] },
        { group: "Side", options: ["Ranch", "Blue Cheese", "Extra Sauce"] },
      ]},
    ],
  },
  {
    id: "sides",
    label: "🍟 Sides",
    items: [
      { id: "sd1", label: "French Fries", price: 399 },
      { id: "sd2", label: "Mozzarella Sticks", price: 749 },
      { id: "sd3", label: "Garlic Bread", price: 349 },
      { id: "sd4", label: "Side Salad", price: 549 },
    ],
  },
  {
    id: "drinks",
    label: "🥤 Drinks",
    items: [
      { id: "d1", label: "Soda", price: 249, modifiers: [
        { group: "Type", options: ["Coke", "Diet Coke", "Sprite", "Root Beer", "Lemonade"] },
        { group: "Size", options: ["Small", "Medium", "Large", "2 Liter"] },
      ]},
      { id: "d2", label: "Water", price: 149 },
      { id: "d3", label: "Juice", price: 299 },
    ],
  },
];

// Text normalization — mirrors the browser agent normalizeText()
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b14\s*["-]?\s*inch\b|\b14"\b/g, '14"')
    .replace(/\b16\s*["-]?\s*inch\b|\b16"\b/g, '16"')
    .replace(/\b12\s*["-]?\s*inch\b|\b12"\b/g, '12"')
    .replace(/\bextra\b/g, "extra")
    .replace(/[^a-z0-9"'. ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Find the best matching POS item from a voice agent item name
export function findMatchingItem(name: string): { item: POSItem; category: POSCategory } | null {
  const normalized = normalizeText(name);
  for (const cat of POS_MENU) {
    for (const item of cat.items) {
      const itemNorm = normalizeText(item.label);
      if (itemNorm === normalized || itemNorm.includes(normalized) || normalized.includes(itemNorm)) {
        return { item, category: cat };
      }
    }
  }
  return null;
}

// Find a modifier option across groups
export function findMatchingModifier(modName: string, item: POSItem): string | null {
  if (!item.modifiers) return null;
  const normalized = normalizeText(modName);
  for (const group of item.modifiers) {
    for (const opt of group.options) {
      const optNorm = normalizeText(opt);
      if (optNorm === normalized || optNorm.includes(normalized) || normalized.includes(optNorm)) {
        return opt;
      }
    }
  }
  return null;
}
