const crypto = require('crypto');

function buildMockPayload(amount) {
    const txnRetrievalRef = `MOCK-${Date.now()}`;
    const qrPayload = `NETS-MOCK-${crypto.randomUUID()}`;
    return {
        mock: true,
        amount: amount,
        txnRetrievalRef: txnRetrievalRef,
        qrPayload: qrPayload
    };
}

exports.generateQrCode = async (req, res) => {
    const amount = Number(req.body.amount || 0).toFixed(2);
    const requestUrl = process.env.NETS_QR_REQUEST_URL;
    const apiKey = process.env.API_KEY;
    const projectId = process.env.PROJECT_ID;

    if (!requestUrl || !apiKey || !projectId) {
        return res.json(buildMockPayload(amount));
    }

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'project-id': projectId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body || {})
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
