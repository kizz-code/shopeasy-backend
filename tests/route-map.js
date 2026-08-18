/**
 * Checks that every API call the frontend makes actually exists on the backend.
 *
 * A mismatch here is invisible until a page is opened at runtime, which is exactly
 * how a whole admin section can end up calling endpoints that were never built.
 */

const fs = require('fs'), path = require('path');

const backend = path.join(__dirname, '..');
const repoRoot = path.join(backend, '..');
const mounts = {
  '/api/auth': 'authRoutes', '/api/products': 'productRoutes',
  '/api/categories': 'categoryRoutes', '/api/cart': 'cartRoutes',
  '/api/orders': 'orderRoutes', '/api/payment': 'paymentRoutes',
  '/api/admin': 'adminRoutes',
};
const real = [];
for (const [base, file] of Object.entries(mounts)) {
  const router = require(path.join(backend, 'routes', file));
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const m of Object.keys(layer.route.methods)) {
      real.push(m.toUpperCase() + ' ' + (base + layer.route.path).replace(/\/$/, '') || base);
    }
  }
}

// 2. Collect every call the frontend service layer makes.
const svcDir = path.join(repoRoot, 'frontend', 'src', 'services');
const calls = [];
for (const f of fs.readdirSync(svcDir)) {
  const src = fs.readFileSync(path.join(svcDir, f), 'utf8');
  const re = /api\.(get|post|put|delete|patch)\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(src))) calls.push({ method: m[1].toUpperCase(), url: m[2], file: f });
}

// 3. Compare, treating ${...} and :params as wildcards.
const toRegex = (p) => new RegExp('^' + p.replace(/:[^/]+/g, '[^/]+') + '$');
const realRes = real.map((r) => {
  const [m, p] = r.split(' ');
  return { method: m, re: toRegex(p), raw: r };
});

let bad = 0;
console.log('Frontend service call'.padEnd(46) + 'Backend route');
console.log('-'.repeat(90));
for (const c of calls) {
  const url = '/api' + c.url.replace(/\$\{[^}]+\}/g, 'X').split('?')[0].replace(/\/$/, '');
  const hit = realRes.find((r) => r.method === c.method && r.re.test(url));
  const label = (c.method + ' ' + c.url).padEnd(46);
  if (hit) console.log(label + 'OK  ' + hit.raw);
  else { console.log(label + '*** NO SUCH ROUTE ***  (' + c.file + ')'); bad++; }
}
console.log('-'.repeat(90));
console.log(bad === 0 ? `All ${calls.length} frontend calls map to a real route.` : `${bad} of ${calls.length} calls have NO backend route.`);
process.exit(bad === 0 ? 0 : 1);
