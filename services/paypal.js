const fetch = require('node-fetch');

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY;

const getAccessToken = async () => {
    if (!PAYPAL_CLIENT || !PAYPAL_SECRET || !PAYPAL_API || !PAYPAL_CURRENCY) {
        throw new Error('PayPal credentials not configured');
    }

    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal token error: ${text}`);
    }

    const data = await response.json();
    return data.access_token;
};

const createOrder = async (amount) => {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: PAYPAL_CURRENCY,
                        value: amount
                    }
                }
            ]
        })
    });

    return await response.json();
};

const captureOrder = async (orderId) => {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });

    return await response.json();
};

module.exports = { createOrder, captureOrder };
