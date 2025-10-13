import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 80;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// server-side Printify test to avoid CORS and hide API key
app.post('/api/printify/test', async (req, res) => {
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  console.log('/api/printify/test called - hasApiKey?', !!apiKey);
  if (!apiKey) return res.status(400).json({ ok: false, message: 'No API key provided' });

  try {
    const r = await fetch('https://api.printify.com/v1/shops.json', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    const bodyText = await r.text();
    let parsed;
    try { parsed = JSON.parse(bodyText); } catch (e) { parsed = { raw: bodyText }; }
    if (!r.ok) return res.status(r.status).json({ ok: false, status: r.status, body: parsed });
    return res.json({ ok: true, status: r.status, body: parsed });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Fetch Printify products (from shops)
app.post('/api/printify/products', async (req, res) => {
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  console.log('/api/printify/products called - hasApiKey?', !!apiKey);
  if (!apiKey) return res.status(400).json({ ok: false, message: 'No API key provided' });
  try {
    // Get shops
    const shopsR = await fetch('https://api.printify.com/v1/shops.json', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!shopsR.ok) {
      const text = await shopsR.text();
      console.log('/api/printify/products - shops fetch failed', { status: shopsR.status, body: text });
      return res.status(shopsR.status).json({ ok: false, status: shopsR.status, body: text });
    }
    const shops = await shopsR.json();
    console.log(`/api/printify/products - found ${Array.isArray(shops) ? shops.length : 0} shop(s)`);
    // Fetch products for each shop and collect provider/pricing info
    const allProducts = [];
    const perShop = [];
    for (const shop of shops) {
      const shopId = shop.id;
      try {
        const productsR = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, { headers: { Authorization: `Bearer ${apiKey}` } });
        const rawText = await productsR.text();
        let products = null;
        try { products = JSON.parse(rawText); } catch (e) { /* keep rawText */ }
        if (!productsR.ok) {
          console.log(`/api/printify/products: shop ${shopId} returned status ${productsR.status}`);
          perShop.push({ shopId, shopTitle: shop.title || shop.id, status: productsR.status, count: 0, rawSample: rawText?.substring(0, 100) });
          continue;
        }
        // Some responses wrap items under { data: [...] }
        const items = Array.isArray(products) ? products : (Array.isArray(products?.data) ? products.data : []);
        const count = items.length;
        perShop.push({ shopId, shopTitle: shop.title || shop.id, status: productsR.status, count, sampleProductId: items[0]?.id || items[0]?.product_id || null });
        if (count > 0) {
          for (const p of items) {
            allProducts.push({ shopId, shopName: shop.title || shop.id, product: p });
          }
        }
      } catch (e) {
        console.log(`/api/printify/products: error fetching shop ${shop.id}`, e?.message || String(e));
        perShop.push({ shopId: shop.id, shopTitle: shop.title || shop.id, status: 'error', count: 0, error: e?.message || String(e) });
        continue;
      }
    }

    const debug = { shopCount: shops.length, perShop, totalProducts: allProducts.length };
    console.log('/api/printify/products debug:', JSON.stringify(debug));

    return res.json({ ok: true, status: 200, body: allProducts, debug });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Aggregate categories for Product Selection
app.post('/api/printify/categories', async (req, res) => {
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  console.log('/api/printify/categories called - hasApiKey?', !!apiKey);
  if (!apiKey) return res.status(400).json({ ok: false, message: 'No API key provided' });
  try {
    const shopsR = await fetch('https://api.printify.com/v1/shops.json', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!shopsR.ok) {
      const text = await shopsR.text();
      return res.status(shopsR.status).json({ ok: false, status: shopsR.status, body: text });
    }
    const shops = await shopsR.json();
    const categoriesSet = new Set();

    const inferType = (p) => {
      const text = `${p.title || p.name || ''} ${p.description || ''}`.toLowerCase();
      if (text.includes('mug')) return 'Mugs';
      if (text.includes('hoodie') || text.includes('sweatshirt')) return 'Hoodies';
      if (text.includes('blanket')) return 'Blankets';
      if (text.includes('rug')) return 'Rugs';
      if (text.includes('flag')) return 'Flags';
      if (text.includes('case') || text.includes('phone')) return 'Phone Cases';
      if (text.includes('t-shirt') || text.includes('t shirt') || text.includes('tee')) return 'T-Shirts';
      return 'Accessories';
    };

    for (const shop of shops) {
      const shopId = shop.id;
      try {
        const productsR = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?page=1&limit=200`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!productsR.ok) continue;
        const text = await productsR.text();
        let products;
        try { products = JSON.parse(text); } catch (e) { products = null; }
        const items = Array.isArray(products) ? products : (Array.isArray(products?.data) ? products.data : []);
        for (const p of items) {
          const cat = inferType(p);
          categoriesSet.add(cat);
        }
      } catch (e) {
        continue;
      }
    }

    const categories = Array.from(categoriesSet);
    return res.json({ ok: true, categories, count: categories.length });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Fetch detailed product info (including available print providers, variants, and shipping estimates)
app.post('/api/printify/product-details', async (req, res) => {
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  const shopId = req.body?.shopId;
  const productId = req.body?.productId;
  console.log('/api/printify/product-details called', { shopId, productId, hasApiKey: !!apiKey });
  if (!apiKey) return res.status(400).json({ ok: false, message: 'No API key provided' });
  if (!shopId || !productId) return res.status(400).json({ ok: false, message: 'Missing shopId or productId' });
  try {
    const r = await fetch(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const bodyText = await r.text();
    let parsed;
    try { parsed = JSON.parse(bodyText); } catch (e) { parsed = { raw: bodyText }; }
    if (!r.ok) return res.status(r.status).json({ ok: false, status: r.status, body: parsed });

    // Normalize provider/variant info into a stable shape for the front-end.
    // Desired provider shape: { id, name, price, shipping, variants: [{ id, name, price, options? }] }
    const providers = [];

    const addProvider = (raw) => {
      try {
        const id = raw.id ?? raw.provider_id ?? raw.shop_id ?? null;
        const name = raw.title || raw.name || raw.shop_name || raw.store?.title || (`provider-${id}`);
        const shipping = raw.shipping || raw.shipping_info || raw.shipping_rates || null;

        const variants = [];
        if (Array.isArray(raw.variants)) {
          raw.variants.forEach((v) => {
            variants.push({ id: v.id ?? v.variant_id ?? v.sku ?? null, name: v.title || v.name || v.sku || String(v.id || ''), price: v.price != null ? Number(v.price) : (v.price_in_cents ? Number(v.price_in_cents) / 100 : null), options: v.options || v.option_values || null });
          });
        }

        // Some Printify responses attach variant pricing under a `prices` or nested structure; attempt to pull a top-level price
        const price = raw.price != null ? Number(raw.price) : (raw.base_price != null ? Number(raw.base_price) : null);

        providers.push({ id, name, price, shipping, variants });
      } catch (err) {
        // ignore parse errors for a provider
      }
    };

    // Common places where provider info lives
    if (Array.isArray(parsed.print_providers)) {
      parsed.print_providers.forEach(addProvider);
    }
    // Older/alternate field
    if (Array.isArray(parsed.providers)) {
      parsed.providers.forEach(addProvider);
    }

    // Some payloads include `print_providers_info` or nested `print_providers_info` object
    if (parsed.print_providers_info && Array.isArray(parsed.print_providers_info)) {
      parsed.print_providers_info.forEach(addProvider);
    }

    // If we still have no providers, attempt to build providers from top-level shops/products variants
    if (providers.length === 0) {
      // Use top-level variants (product variants) to create a single provider-like entry
      if (Array.isArray(parsed.variants)) {
        const variants = parsed.variants.map(v => ({ id: v.id ?? null, name: v.title || v.name || String(v.id || ''), price: v.price != null ? Number(v.price) : null, options: v.options || null }));
        providers.push({ id: `product-${parsed.id || parsed.handle || 'unknown'}`, name: parsed.title || parsed.name || 'Default Provider', price: null, shipping: null, variants });
      }
    }

    return res.json({ ok: true, status: r.status, body: { product: parsed, providers } });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Fetch Printify catalog blueprints (blank product models) and available print providers
app.post('/api/printify/catalog-models', async (req, res) => {
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  console.log('/api/printify/catalog-models called - hasApiKey?', !!apiKey);
  if (!apiKey) return res.status(400).json({ ok: false, message: 'No API key provided' });

  try {
    // Fetch catalog blueprints (models)
    const bpR = await fetch('https://api.printify.com/v1/catalog/blueprints.json?page=1&limit=200', { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
    const bpText = await bpR.text();
    let bpParsed;
    try { bpParsed = JSON.parse(bpText); } catch (e) { bpParsed = { raw: bpText }; }
    if (!bpR.ok) return res.status(bpR.status).json({ ok: false, status: bpR.status, body: bpParsed });

    const items = Array.isArray(bpParsed) ? bpParsed : (Array.isArray(bpParsed?.data) ? bpParsed.data : []);

    const models = [];

    for (const bp of items) {
      try {
        // Attempt to fetch print providers for this blueprint (provider availability and variant pricing)
        const provR = await fetch(`https://api.printify.com/v1/catalog/blueprints/${bp.id}/print_providers.json`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
        let provParsed = null;
        if (provR.ok) {
          const provText = await provR.text();
          try { provParsed = JSON.parse(provText); } catch (e) { provParsed = { raw: provText }; }
        }

        const providersRaw = Array.isArray(provParsed) ? provParsed : (Array.isArray(provParsed?.data) ? provParsed.data : (Array.isArray(provParsed?.print_providers) ? provParsed.print_providers : []));

        const providers = [];
        if (Array.isArray(providersRaw)) {
          for (const pr of providersRaw) {
            try {
              const id = pr.id ?? pr.provider_id ?? pr.print_provider_id ?? null;
              const name = pr.title || pr.name || pr.shop_name || (`provider-${id}`);
              const variants = Array.isArray(pr.variants) ? pr.variants.map(v => ({ id: v.id ?? v.variant_id ?? null, title: v.title || v.name || v.sku || String(v.id || ''), price: v.price != null ? Number(v.price) : (v.cost != null ? Number(v.cost) : null), options: v.options || v.option_values || null })) : [];
              const shipping = pr.shipping || pr.shipping_info || pr.shipping_rates || null;
              providers.push({ id, name, shipping, variants });
            } catch (e) {
              // ignore provider parse errors
            }
          }
        }

        models.push({ id: bp.id, title: bp.title || bp.name || bp.handle || '', tags: bp.tags || bp.categories || [], views: bp.views || bp.images || [], providers });
      } catch (e) {
        // ignore per-blueprint errors
        console.log('/api/printify/catalog-models: error fetching providers for blueprint', bp?.id, e?.message || String(e));
      }
    }

    return res.json({ ok: true, status: 200, body: models, count: models.length });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Prepare publish payloads for Printify (dry-run)
app.post('/api/printify/prepare-publish', async (req, res) => {
  console.log('/api/printify/prepare-publish called');
  // Expect body: { stagedProducts: [ { providerId, variantId, variantName, basePrice, colors, marketingCopy, ... } ] }
  const staged = req.body?.stagedProducts;
  if (!Array.isArray(staged)) return res.status(400).json({ ok: false, message: 'stagedProducts array required' });

  try {
    // Group staged products by provider/shop id so we can create one order per shop
    const groups = {};
    for (const p of staged) {
      const shopId = p.providerId || p.provider?.id || p.providerId;
      if (!shopId) continue;
      if (!groups[shopId]) groups[shopId] = [];
      groups[shopId].push(p);
    }

    const prepared = [];
    for (const shopId of Object.keys(groups)) {
      const items = groups[shopId].map((it) => ({
        variant_id: it.variantId || it.variant?.id,
        quantity: it.quantity || 1,
        retail_price: (it.sellingPrice != null ? String(it.sellingPrice) : (it.basePrice != null ? String(it.basePrice) : undefined)),
        title: it.marketingCopy?.title || it.productName,
        external_id: it.id || undefined,
        // keep reference back to staged product
        _staged_ref: it,
      }));

      const payload = {
        external_id: `auto-publish-${Date.now()}-${shopId}`,
        label: `Auto publish ${shopId}`,
        line_items: items,
        send_shipping_notification: false,
      };

      prepared.push({ shopId, payload });
    }

    return res.json({ ok: true, prepared });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Publish prepared payloads to Printify (confirm=true to actually send)
app.post('/api/printify/publish', async (req, res) => {
  console.log('/api/printify/publish called - confirm?', !!req.body?.confirm);
  // Expect body: { apiKey, prepared: [{ shopId, payload }], confirm: boolean }
  const apiKey = req.body?.apiKey || req.headers['x-printify-api-key'];
  const prepared = req.body?.prepared;
  const confirm = !!req.body?.confirm;

  if (!Array.isArray(prepared)) return res.status(400).json({ ok: false, message: 'prepared payloads required' });
  if (!confirm) return res.json({ ok: true, message: 'confirm flag not set, not sending', prepared });
  if (!apiKey) return res.status(400).json({ ok: false, message: 'API key required to publish' });

  try {
    const results = [];
    for (const entry of prepared) {
      const shopId = entry.shopId;
      const payload = entry.payload;
      try {
        const r = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await r.text();
        let body;
        try { body = JSON.parse(text); } catch (e) { body = { raw: text }; }
        results.push({ shopId, status: r.status, ok: r.ok, body });
      } catch (err) {
        results.push({ shopId, ok: false, error: err?.message || String(err) });
      }
    }

    return res.json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
});

// Serve static build
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
