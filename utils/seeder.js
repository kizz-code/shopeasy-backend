require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB for seeding");
};

const categories = [
  { name: "Electronics", slug: "electronics", description: "Gadgets, devices, and tech accessories", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400" },
  { name: "Fashion", slug: "fashion", description: "Clothing, footwear, and accessories", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400" },
  { name: "Home & Living", slug: "home-and-living", description: "Furniture, decor, and home essentials", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400" },
  { name: "Books", slug: "books", description: "Fiction, non-fiction, and educational books", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400" },
  { name: "Sports", slug: "sports", description: "Sports equipment and fitness gear", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400" },
];

const seedProducts = [
  {
    name: "Apple iPhone 15 Pro",
    slug: "apple-iphone-15-pro",
    description: "Latest iPhone with A17 Pro chip, titanium design, and advanced camera system.",
    price: 134900,
    originalPrice: 139900,
    category: "Electronics",
    brand: "Apple",
    stock: 50,
    images: [{ url: "https://via.placeholder.com/400x400?text=iPhone+15+Pro", alt: "iPhone 15 Pro" }],
    ratings: { average: 4.8, count: 245 },
    features: ["A17 Pro Chip", "Titanium Design", "48MP Camera", "USB-C"],
    isFeatured: true
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    slug: "samsung-galaxy-s24-ultra",
    description: "Samsung's flagship with S Pen, 200MP camera, and AI features.",
    price: 124999,
    originalPrice: 134999,
    category: "Electronics",
    brand: "Samsung",
    stock: 35,
    images: [{ url: "https://via.placeholder.com/400x400?text=Galaxy+S24+Ultra", alt: "Galaxy S24 Ultra" }],
    ratings: { average: 4.7, count: 189 },
    features: ["S Pen Included", "200MP Camera", "AI Features", "5000mAh Battery"],
    isFeatured: true
  },
  {
    name: "Sony WH-1000XM5 Headphones",
    slug: "sony-wh-1000xm5-headphones",
    description: "Industry-leading noise cancelling wireless headphones.",
    price: 29990,
    originalPrice: 34990,
    category: "Electronics",
    brand: "Sony",
    stock: 80,
    images: [{ url: "https://via.placeholder.com/400x400?text=Sony+WH1000XM5", alt: "Sony WH-1000XM5" }],
    ratings: { average: 4.9, count: 432 },
    features: ["30hr Battery", "ANC", "Multipoint Connect", "Foldable"],
    isFeatured: false
  },
  {
    name: "Nike Air Max 270",
    slug: "nike-air-max-270",
    description: "Lifestyle shoe with the tallest Air unit yet for all-day comfort.",
    price: 11995,
    originalPrice: 14995,
    category: "Fashion",
    brand: "Nike",
    stock: 120,
    images: [{ url: "https://via.placeholder.com/400x400?text=Nike+Air+Max+270", alt: "Nike Air Max 270" }],
    ratings: { average: 4.5, count: 310 },
    features: ["Max Air Unit", "Mesh Upper", "Foam Midsole", "Rubber Outsole"],
    isFeatured: true
  },
  {
    name: "Levi's 501 Original Jeans",
    slug: "levis-501-original-jeans",
    description: "The original straight fit jean, a timeless classic since 1873.",
    price: 3999,
    originalPrice: 5999,
    category: "Fashion",
    brand: "Levi's",
    stock: 200,
    images: [{ url: "https://via.placeholder.com/400x400?text=Levis+501", alt: "Levi's 501" }],
    ratings: { average: 4.6, count: 875 },
    features: ["Straight Fit", "Button Fly", "100% Cotton", "Original Fit"],
    isFeatured: false
  },
  {
    name: "MacBook Air M2",
    slug: "macbook-air-m2",
    description: "Supercharged by M2 chip, with a fanless design and all-day battery.",
    price: 114900,
    originalPrice: 119900,
    category: "Electronics",
    brand: "Apple",
    stock: 25,
    images: [{ url: "https://via.placeholder.com/400x400?text=MacBook+Air+M2", alt: "MacBook Air M2" }],
    ratings: { average: 4.9, count: 156 },
    features: ["M2 Chip", "18hr Battery", "Fanless Design", "Liquid Retina Display"],
    isFeatured: true
  },
  {
    name: "Instant Pot Duo 7-in-1",
    slug: "instant-pot-duo-7-in-1",
    description: "Electric pressure cooker that replaces 7 kitchen appliances.",
    price: 8499,
    originalPrice: 10999,
    category: "Home & Living",
    brand: "Instant Pot",
    stock: 60,
    images: [{ url: "https://via.placeholder.com/400x400?text=Instant+Pot+Duo", alt: "Instant Pot Duo" }],
    ratings: { average: 4.7, count: 2341 },
    features: ["7-in-1 Functions", "6Qt Capacity", "Safety Features", "Easy Clean"],
    isFeatured: false
  },
  {
    name: "Yoga Mat Premium",
    slug: "yoga-mat-premium",
    description: "Eco-friendly non-slip yoga mat with alignment lines.",
    price: 1999,
    originalPrice: 2999,
    category: "Sports",
    brand: "HealthFit",
    stock: 150,
    images: [{ url: "https://via.placeholder.com/400x400?text=Yoga+Mat", alt: "Yoga Mat Premium" }],
    ratings: { average: 4.4, count: 567 },
    features: ["Non-Slip", "Eco-Friendly", "6mm Thick", "Alignment Lines"],
    isFeatured: false
  }
];
const seed = async () => {
  try {
    await connectDB();
    await Promise.all([User.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}), Cart.deleteMany({})]);
    console.log("🗑️  Cleared existing data");

    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Seeded ${createdCategories.length} categories`);

    const categoryIds = createdCategories.map((c) => c._id);
const categoryMap = {};
createdCategories.forEach(c => { categoryMap[c.name] = c._id; });

const productsWithCategoryIds = seedProducts.map(p => ({
  ...p,
  category: categoryMap[p.category]
}));

const createdProducts = await Product.insertMany(productsWithCategoryIds);    console.log(`✅ Seeded ${createdProducts.length} products`);

    const admin = await User.create({ name: "Admin User", email: process.env.ADMIN_EMAIL || "admin@shopeasy.com", password: process.env.ADMIN_PASSWORD || "Admin@123", role: "admin" });
    await Cart.create({ user: admin._id, items: [] });
    console.log(`✅ Admin created: ${admin.email}`);

    const customer = await User.create({ name: "John Doe", email: "john@example.com", password: "Password@123", role: "customer", phone: "9876543210" });
    await Cart.create({ user: customer._id, items: [] });
    console.log(`✅ Sample customer created: ${customer.email}`);

    console.log("\n🎉 Database seeded successfully!");
    console.log("Admin: admin@shopeasy.com / Admin@123");
    console.log("Customer: john@example.com / Password@123");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seed();