const fetch = global.fetch || require('node-fetch');
const db = require('../db');

function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

exports.chat = async (req, res) => {
  try {
    const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';
    if (!message) return res.json({ success: false, reply: 'Please send a message.' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: message }], max_tokens: 300 })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('OpenAI error:', resp.status, txt);
        return res.json({ success: false, reply: 'AI service error.' });
      }
      const data = await resp.json();
      const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content : 'Sorry, no response.';
      return res.json({ success: true, reply });
    }

    // Fallback: DB-aware rule responses
    const lower = message.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi')) {
      return res.json({ success: true, reply: 'Hi — I\'m the Supermarket helper. Ask about products, your cart, or checkout.' });
    }

    // How many available products?
    if (lower.includes('available products') || lower.includes('how many products') || lower.includes('how many available')) {
      try {
        const rows = await query('SELECT COUNT(*) as cnt FROM products WHERE quantity > 0');
        const cnt = rows && rows[0] ? rows[0].cnt : 0;
        return res.json({ success: true, reply: `There are ${cnt} available product(s) in stock.` });
      } catch (e) {
        console.error('Chat DB error (products count):', e);
        return res.json({ success: false, reply: 'Error checking product availability.' });
      }
    }

    // How many products in my cart?
    if (lower.includes('in my cart') || lower.includes('products in my cart') || lower.includes('how many in my cart')) {
      if (!req.session || !req.session.user) return res.json({ success: false, reply: 'Please log in to view your cart.' });
      try {
        const uid = req.session.user.id;
        const rows = await query('SELECT SUM(quantity) as cnt FROM cart_items WHERE user_id = ?', [uid]);
        const cnt = rows && rows[0] && rows[0].cnt ? rows[0].cnt : 0;
        return res.json({ success: true, reply: `You have ${cnt} item(s) in your cart.` });
      } catch (e) {
        console.error('Chat DB error (cart count):', e);
        return res.json({ success: false, reply: 'Error checking your cart.' });
      }
    }

    // How to view order history / show my orders
    if (lower.includes('order history') || lower.includes('view order history') || lower.includes('my orders')) {
      if (!req.session || !req.session.user) return res.json({ success: false, reply: 'Please log in to view your order history.' });
      try {
        const uid = req.session.user.id;
        const rows = await query('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?', [uid]);
        const cnt = rows && rows[0] ? rows[0].cnt : 0;
        return res.json({ success: true, reply: `You have ${cnt} order(s). Visit the Orders page to view details: /order-history` });
      } catch (e) {
        console.error('Chat DB error (orders):', e);
        return res.json({ success: false, reply: 'Error checking your orders.' });
      }
    }

    // How many users? (admin only)
    if (lower.includes('how many users') || lower.includes('how many customers') || lower.includes('total users')) {
      if (!req.session || !req.session.user) return res.json({ success: false, reply: 'Please log in to view user statistics.' });
      if (req.session.user.role !== 'admin') return res.json({ success: false, reply: 'Only admins can view user statistics.' });
      try {
        const rows = await query('SELECT COUNT(*) as cnt FROM users');
        const cnt = rows && rows[0] ? rows[0].cnt : 0;
        return res.json({ success: true, reply: `There are ${cnt} registered user(s).` });
      } catch (e) {
        console.error('Chat DB error (users count):', e);
        return res.json({ success: false, reply: 'Error checking user count.' });
      }
    }

    // fallback messages
    if (lower.includes('stock') || lower.includes('quantity')) return res.json({ success: true, reply: 'I can check stock for a product if you open the product page. For now, try searching the shopping page.' });
    if (lower.includes('checkout') || lower.includes('buy')) return res.json({ success: true, reply: 'To checkout, go to your cart and click the Proceed to Checkout button.' });

    return res.json({ success: true, reply: `I heard: "${message}" — I can help with product info, your cart, and orders. Try asking: "How many available products?", "How many in my cart?", or "How many users do I have?"` });
  } catch (err) {
    console.error('Chat error:', err);
    res.json({ success: false, reply: 'Internal error handling chat.' });
  }
};
