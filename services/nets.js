exports.generateQrCode = async (req, res) => {
    const amount = Number(req.body.amount || req.body.amt_in_dollars || 0);
    const requestUrl = process.env.NETS_QR_REQUEST_URL;
    const apiKey = process.env.API_KEY;
    const projectId = process.env.PROJECT_ID;
    const apiSecret = process.env.API_SECRET;

    if (!requestUrl || !apiKey || !projectId) {
        return res.status(500).json({
            error: 'NETS QR not configured',
            missing: {
                NETS_QR_REQUEST_URL: !requestUrl,
                API_KEY: !apiKey,
                PROJECT_ID: !projectId
            }
        });
    }

    try {
        // Use NETS-required fields with sensible defaults, while allowing overrides from req.body.
        const payload = {
            txn_id: req.body.txn_id || process.env.NETS_TXN_ID || 'sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b',
            amt_in_dollars: Number.isFinite(amount) ? amount : 0,
            notify_mobile: typeof req.body.notify_mobile === 'number' ? req.body.notify_mobile : 0,
            ...req.body
        };

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'project-id': projectId,
                ...(apiSecret ? { 'api-secret': apiSecret } : {}),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
