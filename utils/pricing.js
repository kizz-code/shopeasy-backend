// Order pricing rules. Kept in one place so the cart, the checkout page and the
// order that finally gets saved all agree on the numbers.

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_CHARGE = 49;
const TAX_RATE = 0.18; // GST

function calculatePricing(itemsTotal) {
  const shippingCharge = itemsTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const taxAmount = Math.round(itemsTotal * TAX_RATE);

  return {
    itemsTotal,
    shippingCharge,
    taxAmount,
    discount: 0,
    grandTotal: itemsTotal + shippingCharge + taxAmount,
  };
}

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_CHARGE,
  TAX_RATE,
  calculatePricing,
};
