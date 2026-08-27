INSERT INTO menu_items (name, description, price, category, emoji, available)
SELECT seed.name, seed.description, seed.price, seed.category, seed.emoji, true
FROM (VALUES
 ('Garlic Bread','Toasted sourdough with roasted garlic butter and herbs',699,'Starters','🥖'),
 ('Bruschetta','Grilled bread topped with fresh tomato, basil & olive oil',849,'Starters','🍅'),
 ('Soup of the Day','Ask your server for today''s homemade soup',799,'Starters','🍲'),
 ('Margherita Pizza','San Marzano tomato, fresh mozzarella, basil',1599,'Mains','🍕'),
 ('Pepperoni Pizza','Pepperoni, mozzarella, tomato sauce',1799,'Mains','🍕'),
 ('Spaghetti Bolognese','Slow-cooked beef ragù, parmesan, fresh pasta',1699,'Mains','🍝'),
 ('Grilled Salmon','Atlantic salmon, lemon butter, seasonal veg',2199,'Mains','🐟'),
 ('Chicken Parmigiana','Breaded chicken, napoli sauce, melted mozzarella',1999,'Mains','🍗'),
 ('Caesar Salad','Romaine, parmesan, croutons, house caesar dressing',1099,'Sides','🥗'),
 ('Truffle Fries','Crispy fries tossed in truffle oil and parmesan',899,'Sides','🍟'),
 ('Side Salad','Mixed greens, cherry tomatoes, balsamic vinaigrette',699,'Sides','🥬'),
 ('Sparkling Water','Chilled San Pellegrino 500ml',399,'Drinks','💧'),
 ('House Red Wine','Glass of our house Chianti',999,'Drinks','🍷'),
 ('House White Wine','Glass of our house Pinot Grigio',999,'Drinks','🥂'),
 ('Soft Drink','Coke, Diet Coke, Lemonade, or Orange Juice',349,'Drinks','🥤'),
 ('Tiramisu','Classic Italian dessert with espresso-soaked ladyfingers',899,'Desserts','🍰'),
 ('Panna Cotta','Vanilla cream with berry coulis',849,'Desserts','🍮'),
 ('Gelato (2 scoops)','Chocolate, vanilla, or strawberry',699,'Desserts','🍨')
) AS seed(name, description, price, category, emoji)
WHERE NOT EXISTS (SELECT 1 FROM menu_items);