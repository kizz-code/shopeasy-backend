const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { successResponse, paginatedResponse } = require("../utils/apiResponse");
const { createError } = require("../utils/apiError");

/**
 * GET /api/admin/dashboard
 * Every figure on the dashboard comes from an aggregation run in MongoDB rather
 * than by pulling orders into Node and looping over them. They run in parallel,
 * so the whole dashboard is one round of queries.
 */
const getDashboard = async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalProducts,
    salesAnalytics,
    recentOrders,
    topProducts,
    revenueTrend,
    ordersByStatus,
  ] = await Promise.all([

    // Simple counts
    User.countDocuments({ role: "customer" }),
    Product.countDocuments({ isActive: true }),

    Order.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$pricing.grandTotal" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$pricing.grandTotal" },
              },
            },
          ],
          last30Days: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$pricing.grandTotal" },
                orders: { $sum: 1 },
              },
            },
          ],
          last7Days: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$pricing.grandTotal" },
                orders: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),

    // Recent orders
    Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Best sellers: unwind each order into its items, then total by product.
    Order.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),

    // Revenue per day, for the bar chart.
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $nin: ["cancelled"] } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const analytics = salesAnalytics[0];

  return successResponse(res, "Dashboard data retrieved", {
    overview: {
      totalUsers,
      totalProducts,
      totalRevenue: analytics.overall[0]?.totalRevenue || 0,
      totalOrders: analytics.overall[0]?.totalOrders || 0,
      avgOrderValue: Math.round(analytics.overall[0]?.avgOrderValue || 0),
      last30Days: analytics.last30Days[0] || { revenue: 0, orders: 0 },
      last7Days: analytics.last7Days[0] || { revenue: 0, orders: 0 },
    },
    recentOrders,
    topProducts,
    revenueTrend,
    ordersByStatus,
  });
};

/**
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const query = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  if (role) query.role = role;

  const [users, totalItems] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  return paginatedResponse(res, "Users retrieved", users, {
    page: pageNum,
    totalPages: Math.ceil(totalItems / limitNum),
    totalItems,
    limit: limitNum,
  });
};

/**
 * PUT /api/admin/users/:id/toggle-status
 * Deactivating takes effect immediately: protect() re-reads isActive on every
 * request, so the user's existing token stops working straight away.
 */
const toggleUserStatus = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(createError("User not found.", 404));

  if (user.role === "admin") {
    return next(createError("Cannot deactivate admin accounts.", 400));
  }

  user.isActive = !user.isActive;
  await user.save();

  return successResponse(res, `User ${user.isActive ? "activated" : "deactivated"} successfully`, {
    isActive: user.isActive,
  });
};

module.exports = { getDashboard, getAllUsers, toggleUserStatus };
