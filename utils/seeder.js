/**
 * Fills an empty database with categories, products and two demo accounts.
 * Run with:  npm run seed
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");
const Order = require("../models/Order");

const categories = [
  { name: "Electronics", description: "Gadgets, devices and tech accessories", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600" },
  { name: "Fashion", description: "Clothing, footwear and accessories", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600" },
  { name: "Home & Living", description: "Furniture, decor and home essentials", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600" },
  { name: "Books", description: "Fiction, non-fiction and educational books", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600" },
  { name: "Sports", description: "Sports equipment and fitness gear", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600" },
];

const img = (url, alt) => [{ url: `${url}?w=600`, alt, isPrimary: true }];

const products = [
  {
    name: "Apple iPhone 15 Pro",
    description: "A17 Pro chip, titanium body and a 48MP main camera. The Action button replaces the mute switch and USB-C finally arrives.",
    shortDescription: "Titanium flagship with the A17 Pro chip",
    price: 139900, discountedPrice: 134900,
    category: "Electronics", brand: "Apple", stock: 50,
    tags: ["smartphone", "ios", "5g"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1695048133142-1a20484d2569", "iPhone 15 Pro"),
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    description: "Built-in S Pen, a 200MP main sensor and a 5000mAh battery, wrapped in a titanium frame with a flat 6.8-inch display.",
    shortDescription: "200MP camera and a built-in S Pen",
    price: 134999, discountedPrice: 124999,
    category: "Electronics", brand: "Samsung", stock: 35,
    tags: ["smartphone", "android", "5g"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1610945415295-d9bbf067e59c", "Galaxy S24 Ultra"),
  },
  {
    name: "Sony WH-1000XM5 Headphones",
    description: "Eight microphones drive the noise cancelling, and 30 hours of battery means a week of commutes between charges.",
    shortDescription: "Class-leading noise cancelling over-ears",
    price: 34990, discountedPrice: 29990,
    category: "Electronics", brand: "Sony", stock: 80,
    tags: ["headphones", "audio", "wireless"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1505740420928-5e560c06d30e", "Sony WH-1000XM5"),
  },
  {
    name: "MacBook Air M2",
    description: "Fanless, silent and thin, with the M2 chip and a battery that genuinely lasts a working day. A 13.6-inch Liquid Retina display.",
    shortDescription: "Silent, fanless laptop with all-day battery",
    price: 114900, discountedPrice: 0,
    category: "Electronics", brand: "Apple", stock: 25,
    tags: ["laptop", "macos"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1517336714731-489689fd1ca8", "MacBook Air M2"),
  },
  {
    name: "Levi's 511 Slim Fit Jeans",
    description: "The everyday slim fit in stretch denim. Sits below the waist with a narrow leg that stops short of skinny.",
    shortDescription: "Everyday slim-fit stretch denim",
    price: 3999, discountedPrice: 2499,
    category: "Fashion", brand: "Levi's", stock: 120,
    tags: ["jeans", "denim", "mens"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1541099649105-f69ad21f3246", "Levi's 511 Jeans"),
  },
  {
    name: "Nike Air Force 1 '07",
    description: "The 1982 basketball shoe that never left. Full-grain leather upper, Air cushioning and a rubber cupsole.",
    shortDescription: "The original leather Air sneaker",
    price: 8695, discountedPrice: 7295,
    category: "Fashion", brand: "Nike", stock: 65,
    tags: ["sneakers", "shoes"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a", "Nike Air Force 1"),
  },
  {
    name: "Instant Pot Duo 7-in-1",
    description: "Pressure cooker, slow cooker, rice cooker, steamer, saute pan, yoghurt maker and warmer in a single 6-quart pot.",
    shortDescription: "Seven kitchen appliances in one pot",
    price: 9995, discountedPrice: 7495,
    category: "Home & Living", brand: "Instant Pot", stock: 60,
    tags: ["kitchen", "cooking"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1693038603562-bb6191269ecc", "Stainless steel pressure cooker"),
  },
  {
    name: "Philips Hue Starter Kit",
    description: "Three colour-changing bulbs and a bridge. Set scenes from your phone or put the lights on a schedule.",
    shortDescription: "Smart colour bulbs with bridge",
    price: 14999, discountedPrice: 11999,
    category: "Home & Living", brand: "Philips", stock: 40,
    tags: ["lighting", "smart-home"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1730967844913-29eb5cae5f34", "Smart bulbs and bridge"),
  },
  {
    name: "Atomic Habits - James Clear",
    description: "A practical guide to building good habits and breaking bad ones, built around small changes that compound over time.",
    shortDescription: "Small habits, compounded",
    price: 799, discountedPrice: 499,
    category: "Books", brand: "Penguin", stock: 200,
    tags: ["self-help", "bestseller"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1497633762265-9d179a990aa6", "Stack of books"),
  },
  {
    name: "Sapiens - Yuval Noah Harari",
    description: "A sweep through the history of our species, from foraging bands to the present, and what each revolution cost us.",
    shortDescription: "A brief history of humankind",
    price: 899, discountedPrice: 0,
    category: "Books", brand: "Vintage", stock: 150,
    tags: ["history", "non-fiction"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1553060146-71667aa3f223", "Open book"),
  },
  {
    name: "Yoga Mat Premium 6mm",
    description: "Non-slip TPE mat with alignment lines to help you square up your posture. Six millimetres of cushioning for the knees.",
    shortDescription: "Non-slip mat with alignment lines",
    price: 2999, discountedPrice: 1999,
    category: "Sports", brand: "HealthFit", stock: 150,
    tags: ["yoga", "fitness"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1593164842264-854604db2260", "Yoga mat in use"),
  },
  {
    name: "Apple AirPods Pro (2nd gen)",
    description: "Active noise cancellation with adaptive transparency, and a case that survives being thrown in a bag every day.",
    shortDescription: "ANC earbuds with adaptive transparency",
    price: 26900, discountedPrice: 21990,
    category: "Electronics", brand: "Apple", stock: 90,
    tags: ["earbuds", "audio", "wireless"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1600294037681-c80b4cb5b434", "AirPods Pro"),
  },
  {
    name: "Dell XPS 13 Plus",
    description: "A 13-inch ultrabook with a 12th-gen i7, an edge-to-edge keyboard and an invisible trackpad.",
    shortDescription: "13-inch Windows ultrabook",
    price: 164990, discountedPrice: 149990,
    category: "Electronics", brand: "Dell", stock: 12,
    tags: ["laptop", "windows"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1593642632823-8f785ba67e45", "Dell XPS 13"),
  },
  {
    name: "Kindle Paperwhite 11th Gen",
    description: "A 6.8-inch glare-free display with an adjustable warm light, and weeks of battery on a single charge.",
    shortDescription: "Glare-free e-reader, weeks of battery",
    price: 13999, discountedPrice: 11999,
    category: "Electronics", brand: "Amazon", stock: 45,
    tags: ["ereader", "books"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1594498257673-9f36b767286c", "E-reader held in hand"),
  },
  {
    name: "Logitech MX Master 3S",
    description: "A quiet, high-precision mouse with a magnetic scroll wheel that switches between ratcheted and free-spinning.",
    shortDescription: "Precision mouse with magnetic scroll",
    price: 10495, discountedPrice: 8495,
    category: "Electronics", brand: "Logitech", stock: 70,
    tags: ["mouse", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7", "Wireless mouse"),
  },
  {
    name: "Anker 737 Power Bank",
    description: "24,000mAh with 140W output, enough to charge a laptop, and a small display that tells you what it is actually doing.",
    shortDescription: "24,000mAh, charges a laptop",
    price: 12999, discountedPrice: 9999,
    category: "Electronics", brand: "Anker", stock: 55,
    tags: ["charger", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1736516434209-51ece1006788", "Power bank charging a phone"),
  },
  {
    name: "Uniqlo Merino Crew Neck",
    description: "Extra fine merino that is thin enough to layer under a jacket without bulk. Machine washable.",
    shortDescription: "Fine merino layering knit",
    price: 2990, discountedPrice: 1990,
    category: "Fashion", brand: "Uniqlo", stock: 200,
    tags: ["sweater", "knitwear"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1631541909061-71e349d1f203", "Knitted crew neck sweater"),
  },
  {
    name: "Ray-Ban Wayfarer Classic",
    description: "The 1952 frame, still the same shape. Polarised G-15 lenses in acetate.",
    shortDescription: "The original acetate frame",
    price: 9990, discountedPrice: 0,
    category: "Fashion", brand: "Ray-Ban", stock: 40,
    tags: ["sunglasses", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1572635196237-14b3f281503f", "Wayfarer sunglasses"),
  },
  {
    name: "Adidas Ultraboost Light",
    description: "The lightest Ultraboost midsole yet, with a knit upper that holds the foot without pressure points.",
    shortDescription: "Lightweight cushioned running shoe",
    price: 16999, discountedPrice: 12999,
    category: "Fashion", brand: "Adidas", stock: 55,
    tags: ["sneakers", "running"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1562183241-b937e95585b6", "Knit-upper running shoe"),
  },
  {
    name: "Fossil Minimalist Watch",
    description: "A 44mm brushed case on a leather strap, with a face that shows the time and nothing else.",
    shortDescription: "44mm leather-strap analogue",
    price: 12995, discountedPrice: 7995,
    category: "Fashion", brand: "Fossil", stock: 30,
    tags: ["watch", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1524592094714-0f0654e20314", "Fossil watch"),
  },
  {
    name: "Leather Weekender Bag",
    description: "Full-grain leather with a canvas lining, sized to fit two days of clothes and still go in an overhead locker.",
    shortDescription: "Full-grain two-day travel bag",
    price: 8999, discountedPrice: 6499,
    category: "Fashion", brand: "Nomad", stock: 25,
    tags: ["bag", "travel"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1525103504173-8dc1582c7430", "Leather duffel bag"),
  },
  {
    name: "Dyson V12 Detect Slim",
    description: "A laser in the head lights up dust you cannot otherwise see, and the display counts what it picked up.",
    shortDescription: "Cordless vacuum with dust-detecting laser",
    price: 47900, discountedPrice: 42900,
    category: "Home & Living", brand: "Dyson", stock: 18,
    tags: ["vacuum", "cleaning"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1765970101654-337b573142fb", "Cordless stick vacuum"),
  },
  {
    name: "Nespresso Vertuo Next",
    description: "Reads a barcode on each capsule and adjusts the brew, from espresso to a full mug.",
    shortDescription: "Capsule machine, espresso to mug",
    price: 16999, discountedPrice: 12999,
    category: "Home & Living", brand: "Nespresso", stock: 35,
    tags: ["coffee", "kitchen"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1608354580875-30bd4168b351", "Countertop coffee machine"),
  },
  {
    name: "Linen Bedding Set (Queen)",
    description: "Stonewashed French linen that starts soft instead of needing a year of washes to get there.",
    shortDescription: "Stonewashed French linen, queen",
    price: 12999, discountedPrice: 8999,
    category: "Home & Living", brand: "Flax", stock: 42,
    tags: ["bedding", "linen"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af", "Linen bedding"),
  },
  {
    name: "Cast Iron Skillet 12-inch",
    description: "Pre-seasoned and effectively unbreakable. Goes from the hob to the oven and improves with use.",
    shortDescription: "Pre-seasoned 12-inch skillet",
    price: 3499, discountedPrice: 2499,
    category: "Home & Living", brand: "Lodge", stock: 85,
    tags: ["cookware", "kitchen"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1579805625996-db7b60587362", "Cast iron skillet"),
  },
  {
    name: "The Pragmatic Programmer",
    description: "Hunt and Thomas on the habits that separate people who ship from people who rewrite. Twentieth anniversary edition.",
    shortDescription: "The classic on software craft",
    price: 1499, discountedPrice: 1099,
    category: "Books", brand: "Addison-Wesley", stock: 90,
    tags: ["programming", "technical"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1532012197267-da84d127e765", "The Pragmatic Programmer"),
  },
  {
    name: "Designing Data-Intensive Applications",
    description: "Kleppmann on what actually happens inside databases, queues and distributed systems, and where each one breaks.",
    shortDescription: "How data systems really work",
    price: 1899, discountedPrice: 1449,
    category: "Books", brand: "OReilly", stock: 60,
    tags: ["programming", "technical"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1621944193575-816edc981878", "Book on a table"),
  },
  {
    name: "Thinking, Fast and Slow",
    description: "Kahneman on the two systems behind every judgement you make, and why the fast one is so confident when it is wrong.",
    shortDescription: "The two systems behind judgement",
    price: 899, discountedPrice: 599,
    category: "Books", brand: "Penguin", stock: 110,
    tags: ["psychology", "non-fiction"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c", "Thinking Fast and Slow"),
  },
  {
    name: "Resistance Bands Set",
    description: "Five bands from light to heavy, with door anchor and handles. The whole set fits in a jacket pocket.",
    shortDescription: "Five bands, packs into a pocket",
    price: 1999, discountedPrice: 1299,
    category: "Sports", brand: "HealthFit", stock: 120,
    tags: ["fitness", "home-gym"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1584827386916-b5351d3ba34b", "Set of resistance bands"),
  },
  {
    name: "Wilson Evolution Basketball",
    description: "The indoor composite ball most high schools actually play with. Tacky cover, consistent bounce.",
    shortDescription: "Indoor composite game ball",
    price: 5499, discountedPrice: 4299,
    category: "Sports", brand: "Wilson", stock: 48,
    tags: ["basketball", "team-sports"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1640576905072-8181534f83ae", "Wilson basketball"),
  },
  {
    name: "Insulated Steel Water Bottle 1L",
    description: "Double-walled vacuum steel that keeps cold drinks cold for a full day and does not sweat.",
    shortDescription: "1L vacuum steel, cold all day",
    price: 2499, discountedPrice: 1799,
    category: "Sports", brand: "Hydro", stock: 0,
    tags: ["hydration", "outdoor"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1602143407151-7111542de6e8", "Water bottle"),
  },
  {
    name: "Adjustable Dumbbell Set 20kg",
    description: "A pair of dumbbells that adjust from 2.5kg to 20kg each, so a whole rack's worth of weight fits under the bed.",
    shortDescription: "One pair, 2.5kg to 20kg each",
    price: 12999, discountedPrice: 9999,
    category: "Sports", brand: "IronCore", stock: 3,
    tags: ["gym", "strength"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1638536532686-d610adfc8e5c", "Adjustable dumbbells"),
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Orders are cleared too. Leaving them behind would orphan them: they would
    // point at user and product ids that no longer exist, and the admin dashboard
    // would show "Deleted user" rows and duplicated best sellers.
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // insertMany would skip the pre-save hook that builds the slug, so categories
    // and products are created one by one instead.
    const createdCategories = await Category.create(categories);
    const categoryIdByName = Object.fromEntries(
      createdCategories.map((c) => [c.name, c._id])
    );
    console.log(`Seeded ${createdCategories.length} categories`);

    const created = await Product.create(
      products.map((p) => ({ ...p, category: categoryIdByName[p.category] }))
    );
    console.log(`Seeded ${created.length} products`);

    const admin = await User.create({
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@shopeasy.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      role: "admin",
    });

    const customer = await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: "Password@123",
      role: "customer",
      phone: "9876543210",
      addresses: [{
        label: "Home", street: "12 MG Road", city: "Pune",
        state: "Maharashtra", pincode: "411001", country: "India", isDefault: true,
      }],
    });

    await Cart.create([{ user: admin._id, items: [] }, { user: customer._id, items: [] }]);

    console.log("\nDatabase seeded.");
    console.log(`  Admin:    ${admin.email} / ${process.env.ADMIN_PASSWORD || "Admin@123"}`);
    console.log("  Customer: john@example.com / Password@123");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seed();
