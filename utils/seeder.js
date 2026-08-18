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
    description: "A17 Pro chip, titanium body and a 48MP main camera. The Action button replaces the mute switch, and USB-C finally arrives.",
    shortDescription: "Titanium flagship with the A17 Pro chip",
    price: 139900, discountedPrice: 134900,
    category: "Electronics", brand: "Apple", stock: 40,
    tags: ["smartphone", "ios", "5g"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1695048133142-1a20484d2569", "iPhone 15 Pro"),
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    description: "Built-in S Pen, a 200MP main sensor and a 5000mAh battery in a titanium frame with a flat 6.8-inch display.",
    shortDescription: "200MP camera and a built-in S Pen",
    price: 134999, discountedPrice: 124999,
    category: "Electronics", brand: "Samsung", stock: 35,
    tags: ["smartphone", "android", "5g"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1610945415295-d9bbf067e59c", "Galaxy S24 Ultra"),
  },
  {
    name: "boAt Rockerz 550 Wireless Headphones",
    description: "Over-ear headphones with 50mm drivers and up to 20 hours of playback. Padded earcups that survive a daily commute.",
    shortDescription: "Over-ear wireless, 20-hour battery",
    price: 4490, discountedPrice: 1799,
    category: "Electronics", brand: "boAt", stock: 120,
    tags: ["headphones", "audio", "wireless"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1505740420928-5e560c06d30e", "boAt Rockerz headphones"),
  },
  {
    name: "ASUS Vivobook 15",
    description: "A 15.6-inch full-HD laptop with a 13th-gen Core i5, 16GB RAM and a 512GB SSD. Backlit keyboard and a fingerprint reader.",
    shortDescription: "15.6-inch i5 laptop, 16GB / 512GB",
    price: 64990, discountedPrice: 54990,
    category: "Electronics", brand: "ASUS", stock: 22,
    tags: ["laptop", "windows"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1593642632823-8f785ba67e45", "ASUS Vivobook laptop"),
  },
  {
    name: "Apple MacBook Air M2",
    description: "Fanless, silent and thin, with the M2 chip and a battery that genuinely lasts a working day. A 13.6-inch Liquid Retina display.",
    shortDescription: "Silent, fanless laptop with all-day battery",
    price: 114900, discountedPrice: 0,
    category: "Electronics", brand: "Apple", stock: 18,
    tags: ["laptop", "macos"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1517336714731-489689fd1ca8", "MacBook Air M2"),
  },
  {
    name: "Apple AirPods Pro (2nd gen)",
    description: "Active noise cancellation with adaptive transparency, and a case that survives being thrown into a bag every day.",
    shortDescription: "ANC earbuds with adaptive transparency",
    price: 26900, discountedPrice: 21990,
    category: "Electronics", brand: "Apple", stock: 60,
    tags: ["earbuds", "audio", "wireless"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1600294037681-c80b4cb5b434", "AirPods Pro"),
  },
  {
    name: "Mi Power Bank 3i 20000mAh",
    description: "Charges a phone about four times over, with two USB-A outputs and USB-C input. Eighteen-watt fast charging both ways.",
    shortDescription: "20000mAh, charges a phone four times",
    price: 2499, discountedPrice: 1799,
    category: "Electronics", brand: "Xiaomi", stock: 150,
    tags: ["charger", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1736516434209-51ece1006788", "Mi power bank"),
  },
  {
    name: "Noise ColorFit Pro 5 Smartwatch",
    description: "A 1.85-inch AMOLED display with Bluetooth calling, SpO2 and heart-rate tracking, and about a week of battery.",
    shortDescription: "AMOLED smartwatch with Bluetooth calling",
    price: 4999, discountedPrice: 1999,
    category: "Electronics", brand: "Noise", stock: 95,
    tags: ["smartwatch", "wearable"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1660844817855-3ecc7ef21f12", "Noise smartwatch"),
  },
  {
    name: "Kindle Paperwhite (11th Gen)",
    description: "A 6.8-inch glare-free display with an adjustable warm light, and weeks of battery on a single charge.",
    shortDescription: "Glare-free e-reader, weeks of battery",
    price: 13999, discountedPrice: 11999,
    category: "Electronics", brand: "Amazon", stock: 45,
    tags: ["ereader", "books"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1594498257673-9f36b767286c", "Kindle Paperwhite"),
  },
  {
    name: "Logitech M235 Wireless Mouse",
    description: "A compact wireless mouse with a nano receiver and a claimed twelve-month battery life on a single AA cell.",
    shortDescription: "Compact wireless mouse, year-long battery",
    price: 1195, discountedPrice: 745,
    category: "Electronics", brand: "Logitech", stock: 200,
    tags: ["mouse", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7", "Logitech wireless mouse"),
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
    name: "Bata Comfit Formal Derby Shoes",
    description: "Softly lined leather derbys with a cushioned footbed, made for a full day at a desk rather than a single evening.",
    shortDescription: "Cushioned leather derbys for daily wear",
    price: 2799, discountedPrice: 1899,
    category: "Fashion", brand: "Bata", stock: 110,
    tags: ["shoes", "formal", "mens"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1614252235316-8c857d38b5f4", "Bata formal derby shoes"),
  },
  {
    name: "Asian Wonder-13 Running Shoes",
    description: "A light mesh upper over an EVA sole. The everyday running and gym shoe that costs less than a tank of petrol.",
    shortDescription: "Light mesh running and gym shoe",
    price: 1499, discountedPrice: 799,
    category: "Fashion", brand: "Asian", stock: 240,
    tags: ["sneakers", "running", "shoes"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1562183241-b937e95585b6", "Asian running shoes"),
  },
  {
    name: "Levi's 511 Slim Fit Jeans",
    description: "The everyday slim fit in stretch denim. Sits below the waist with a narrow leg that stops short of skinny.",
    shortDescription: "Everyday slim-fit stretch denim",
    price: 3999, discountedPrice: 2499,
    category: "Fashion", brand: "Levi's", stock: 120,
    tags: ["jeans", "denim", "mens"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1541099649105-f69ad21f3246", "Levi's 511 jeans"),
  },
  {
    name: "Peter England Slim Fit Formal Shirt",
    description: "Wrinkle-resistant cotton blend in a slim cut, sized for office wear and washing twice a week.",
    shortDescription: "Wrinkle-resistant cotton office shirt",
    price: 1699, discountedPrice: 1019,
    category: "Fashion", brand: "Peter England", stock: 180,
    tags: ["shirt", "formal", "mens"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf", "Peter England formal shirt"),
  },
  {
    name: "Manyavar Cotton Kurta",
    description: "A straight-cut cotton kurta with a mandarin collar, light enough for a summer function and plain enough for everyday.",
    shortDescription: "Straight-cut cotton kurta",
    price: 2299, discountedPrice: 1499,
    category: "Fashion", brand: "Manyavar", stock: 90,
    tags: ["kurta", "ethnic", "mens"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1770359993283-a2c2f386584e", "Cotton kurta"),
  },
  {
    name: "Titan Neo Analog Watch",
    description: "A 40mm brushed case on a leather strap, with a face that shows the time and nothing else.",
    shortDescription: "40mm leather-strap analogue",
    price: 4995, discountedPrice: 3746,
    category: "Fashion", brand: "Titan", stock: 55,
    tags: ["watch", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1524592094714-0f0654e20314", "Titan analog watch"),
  },
  {
    name: "Ray-Ban Wayfarer Classic",
    description: "The 1952 frame, still the same shape. Polarised G-15 lenses set in acetate.",
    shortDescription: "The original acetate frame",
    price: 9990, discountedPrice: 0,
    category: "Fashion", brand: "Ray-Ban", stock: 30,
    tags: ["sunglasses", "accessories"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1572635196237-14b3f281503f", "Ray-Ban Wayfarer sunglasses"),
  },
  {
    name: "American Tourister Duffle Bag 55L",
    description: "A 55-litre cabin-friendly duffle with a wet-pocket and reinforced base, sized for a long weekend.",
    shortDescription: "55L cabin-friendly weekend duffle",
    price: 4200, discountedPrice: 2499,
    category: "Fashion", brand: "American Tourister", stock: 40,
    tags: ["bag", "travel"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1525103504173-8dc1582c7430", "Duffle travel bag"),
  },
  {
    name: "Allen Solly Merino Wool Sweater",
    description: "Fine merino that is thin enough to layer under a jacket without bulk, and machine washable on a wool cycle.",
    shortDescription: "Fine merino layering knit",
    price: 2999, discountedPrice: 1799,
    category: "Fashion", brand: "Allen Solly", stock: 75,
    tags: ["sweater", "knitwear"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1631541909061-71e349d1f203", "Merino wool sweater"),
  },
  {
    name: "Prestige Deluxe Alpha Pressure Cooker 5L",
    description: "Stainless steel with a induction-friendly base and a controlled-release weight. The pot most Indian kitchens actually own.",
    shortDescription: "5L stainless steel, induction friendly",
    price: 3495, discountedPrice: 2599,
    category: "Home & Living", brand: "Prestige", stock: 85,
    tags: ["kitchen", "cooking"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1693038603562-bb6191269ecc", "Prestige pressure cooker"),
  },
  {
    name: "Hawkins Cast Iron Tawa 25cm",
    description: "Pre-seasoned cast iron that goes from gas to oven and improves with every use. Heavy enough to hold heat for a full batch.",
    shortDescription: "Pre-seasoned 25cm cast iron tawa",
    price: 1499, discountedPrice: 1099,
    category: "Home & Living", brand: "Hawkins", stock: 70,
    tags: ["kitchen", "cookware"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1579805625996-db7b60587362", "Cast iron tawa"),
  },
  {
    name: "Milton Thermosteel Flask 1L",
    description: "Double-walled vacuum steel that keeps tea hot for around twelve hours and does not sweat on the outside.",
    shortDescription: "1L vacuum steel, hot for 12 hours",
    price: 1550, discountedPrice: 1099,
    category: "Home & Living", brand: "Milton", stock: 160,
    tags: ["flask", "kitchen"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1602143407151-7111542de6e8", "Milton steel flask"),
  },
  {
    name: "Wipro Garnet 9W Smart LED Bulb",
    description: "Sixteen million colours and tunable white, controlled from the phone or by voice. No hub needed.",
    shortDescription: "9W colour-changing smart bulb",
    price: 999, discountedPrice: 649,
    category: "Home & Living", brand: "Wipro", stock: 130,
    tags: ["lighting", "smart-home"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1730967844913-29eb5cae5f34", "Smart LED bulbs"),
  },
  {
    name: "Eureka Forbes Quick Clean Vacuum",
    description: "A 1000-watt vacuum with a washable dust bag and enough cord to reach across a two-bedroom flat.",
    shortDescription: "1000W vacuum with washable bag",
    price: 9999, discountedPrice: 7499,
    category: "Home & Living", brand: "Eureka Forbes", stock: 28,
    tags: ["vacuum", "cleaning"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1765970101654-337b573142fb", "Vacuum cleaner"),
  },
  {
    name: "Bombay Dyeing Cotton Bedsheet Set",
    description: "A double bedsheet in 100% cotton with two pillow covers. Soft from the first wash rather than the tenth.",
    shortDescription: "Double cotton bedsheet with 2 covers",
    price: 2199, discountedPrice: 1299,
    category: "Home & Living", brand: "Bombay Dyeing", stock: 95,
    tags: ["bedding", "cotton"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af", "Cotton bedsheet set"),
  },
  {
    name: "Prestige Drip Coffee Maker",
    description: "A 600ml drip machine with a reusable filter and a warming plate, for people who make coffee by the pot.",
    shortDescription: "600ml drip machine with warming plate",
    price: 2795, discountedPrice: 1999,
    category: "Home & Living", brand: "Prestige", stock: 50,
    tags: ["coffee", "kitchen"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1608354580875-30bd4168b351", "Drip coffee maker"),
  },
  {
    name: "Wings of Fire - A.P.J. Abdul Kalam",
    description: "Kalam's own account of going from selling newspapers in Rameswaram to leading India's missile programme.",
    shortDescription: "Kalam's autobiography",
    price: 399, discountedPrice: 275,
    category: "Books", brand: "Universities Press", stock: 220,
    tags: ["biography", "bestseller"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1621944193575-816edc981878", "Wings of Fire book"),
  },
  {
    name: "Ikigai - Hector Garcia",
    description: "What the residents of Okinawa do differently, and what the Japanese idea of a reason to get up in the morning looks like in practice.",
    shortDescription: "The Japanese secret to a long life",
    price: 599, discountedPrice: 399,
    category: "Books", brand: "Penguin", stock: 190,
    tags: ["self-help", "bestseller"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1553060146-71667aa3f223", "Ikigai book"),
  },
  {
    name: "Atomic Habits - James Clear",
    description: "A practical guide to building good habits and breaking bad ones, built around small changes that compound over time.",
    shortDescription: "Small habits, compounded",
    price: 799, discountedPrice: 499,
    category: "Books", brand: "Penguin", stock: 200,
    tags: ["self-help", "bestseller"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1497633762265-9d179a990aa6", "Atomic Habits book"),
  },
  {
    name: "Rich Dad Poor Dad - Robert Kiyosaki",
    description: "Two fathers, two attitudes to money, and the argument that what you are taught about earning is not what you are taught about keeping.",
    shortDescription: "The personal finance classic",
    price: 499, discountedPrice: 329,
    category: "Books", brand: "Manjul", stock: 175,
    tags: ["finance", "bestseller"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1532012197267-da84d127e765", "Rich Dad Poor Dad book"),
  },
  {
    name: "The Immortals of Meluha - Amish Tripathi",
    description: "The first Shiva Trilogy book, retelling the myth as the story of a Tibetan tribal leader who becomes a god.",
    shortDescription: "Book one of the Shiva Trilogy",
    price: 350, discountedPrice: 240,
    category: "Books", brand: "Westland", stock: 145,
    tags: ["fiction", "mythology"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c", "The Immortals of Meluha book"),
  },
  {
    name: "SG Kashmir Willow Cricket Bat",
    description: "A full-size Kashmir willow bat with a cane handle, knocked in and ready for season-long tennis-ball and leather use.",
    shortDescription: "Full-size Kashmir willow bat",
    price: 2499, discountedPrice: 1799,
    category: "Sports", brand: "SG", stock: 60,
    tags: ["cricket", "bat"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1643294358128-0d2da3b4ea7a", "SG cricket bat"),
  },
  {
    name: "Yonex GR 303 Badminton Racket",
    description: "A steel-shaft aluminium racket, strung and ready. Forgiving enough for beginners and light enough for long rallies.",
    shortDescription: "Strung aluminium beginner racket",
    price: 1290, discountedPrice: 899,
    category: "Sports", brand: "Yonex", stock: 140,
    tags: ["badminton", "racket"], isFeatured: true,
    images: img("https://images.unsplash.com/photo-1586768402600-714186e09479", "Yonex badminton racket"),
  },
  {
    name: "Nivia Storm Football Size 5",
    description: "A 32-panel hand-stitched rubber football built for concrete and turf rather than a manicured pitch.",
    shortDescription: "32-panel size 5 rubber football",
    price: 899, discountedPrice: 649,
    category: "Sports", brand: "Nivia", stock: 110,
    tags: ["football", "team-sports"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1660926655800-3d11219f390d", "Nivia football"),
  },
  {
    name: "Cosco Basketball Size 7",
    description: "A size 7 rubber basketball with a butyl bladder, made to hold pressure on outdoor courts.",
    shortDescription: "Size 7 outdoor rubber basketball",
    price: 1299, discountedPrice: 949,
    category: "Sports", brand: "Cosco", stock: 85,
    tags: ["basketball", "team-sports"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1595795279832-13f0df36fbb9", "Cosco basketball"),
  },
  {
    name: "Yoga Mat Premium 6mm",
    description: "Non-slip TPE mat with alignment lines to help square up your posture. Six millimetres of cushioning for the knees.",
    shortDescription: "Non-slip mat with alignment lines",
    price: 2999, discountedPrice: 1999,
    category: "Sports", brand: "HealthFit", stock: 150,
    tags: ["yoga", "fitness"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1593164842264-854604db2260", "Yoga mat"),
  },
  {
    name: "Adjustable Dumbbell Set 20kg",
    description: "A pair of dumbbells adjusting from 2.5kg to 20kg each, so a whole rack's worth of weight fits under the bed.",
    shortDescription: "One pair, 2.5kg to 20kg each",
    price: 12999, discountedPrice: 9999,
    category: "Sports", brand: "IronCore", stock: 25,
    tags: ["gym", "strength"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1638536532686-d610adfc8e5c", "Adjustable dumbbells"),
  },
  {
    name: "Resistance Bands Set",
    description: "Five bands from light to heavy with a door anchor and handles. The whole set fits in a jacket pocket.",
    shortDescription: "Five bands, packs into a pocket",
    price: 1999, discountedPrice: 1299,
    category: "Sports", brand: "HealthFit", stock: 130,
    tags: ["fitness", "home-gym"], isFeatured: false,
    images: img("https://images.unsplash.com/photo-1584827386916-b5351d3ba34b", "Resistance bands"),
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
