import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_available", (q) => q.eq("available", true))
      .collect();
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("menuItems").first();
    if (existing) return; // already seeded

    const items = [
      // Starters
      { name: "Garlic Bread", description: "Toasted sourdough with roasted garlic butter and herbs", price: 699, category: "Starters", emoji: "🥖", available: true },
      { name: "Bruschetta", description: "Grilled bread topped with fresh tomato, basil & olive oil", price: 849, category: "Starters", emoji: "🍅", available: true },
      { name: "Soup of the Day", description: "Ask your server for today's homemade soup", price: 799, category: "Starters", emoji: "🍲", available: true },
      // Mains
      { name: "Margherita Pizza", description: "San Marzano tomato, fresh mozzarella, basil", price: 1599, category: "Mains", emoji: "🍕", available: true },
      { name: "Pepperoni Pizza", description: "Pepperoni, mozzarella, tomato sauce", price: 1799, category: "Mains", emoji: "🍕", available: true },
      { name: "Spaghetti Bolognese", description: "Slow-cooked beef ragù, parmesan, fresh pasta", price: 1699, category: "Mains", emoji: "🍝", available: true },
      { name: "Grilled Salmon", description: "Atlantic salmon, lemon butter, seasonal veg", price: 2199, category: "Mains", emoji: "🐟", available: true },
      { name: "Chicken Parmigiana", description: "Breaded chicken, napoli sauce, melted mozzarella", price: 1999, category: "Mains", emoji: "🍗", available: true },
      // Sides
      { name: "Caesar Salad", description: "Romaine, parmesan, croutons, house caesar dressing", price: 1099, category: "Sides", emoji: "🥗", available: true },
      { name: "Truffle Fries", description: "Crispy fries tossed in truffle oil and parmesan", price: 899, category: "Sides", emoji: "🍟", available: true },
      { name: "Side Salad", description: "Mixed greens, cherry tomatoes, balsamic vinaigrette", price: 699, category: "Sides", emoji: "🥬", available: true },
      // Drinks
      { name: "Sparkling Water", description: "Chilled San Pellegrino 500ml", price: 399, category: "Drinks", emoji: "💧", available: true },
      { name: "House Red Wine", description: "Glass of our house Chianti", price: 999, category: "Drinks", emoji: "🍷", available: true },
      { name: "House White Wine", description: "Glass of our house Pinot Grigio", price: 999, category: "Drinks", emoji: "🥂", available: true },
      { name: "Soft Drink", description: "Coke, Diet Coke, Lemonade, or Orange Juice", price: 349, category: "Drinks", emoji: "🥤", available: true },
      // Desserts
      { name: "Tiramisu", description: "Classic Italian dessert with espresso-soaked ladyfingers", price: 899, category: "Desserts", emoji: "🍰", available: true },
      { name: "Panna Cotta", description: "Vanilla cream with berry coulis", price: 849, category: "Desserts", emoji: "🍮", available: true },
      { name: "Gelato (2 scoops)", description: "Chocolate, vanilla, or strawberry", price: 699, category: "Desserts", emoji: "🍨", available: true },
    ];

    for (const item of items) {
      await ctx.db.insert("menuItems", item);
    }
  },
});
