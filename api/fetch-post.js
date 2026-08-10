// api/fetch-post.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { url, username, password } = req.body;

        if (!url || !username || !password) {
            return res.status(400).json({ error: 'Semua field wajib diisi!' });
        }

        const postId = extractPostId(url);
        if (!postId) {
            return res.status(400).json({ error: 'URL edit tidak valid.' });
        }

        const baseUrl = getBaseUrl(url);
        const apiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
        });

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(500).json({ error: `Gagal fetch: ${response.status}`, detail: responseText.substring(0, 200) });
        }

        const post = JSON.parse(responseText);

        return res.status(200).json({
            success: true,
            data: {
                id: post.id,
                title: post.title?.rendered || '',
                content: post.content?.rendered || '',
                status: post.status || 'draft',
                link: post.link || '',
                edit_url: url,
                yoast: {
                    title: post.meta?._yoast_wpseo_title || '',
                    focuskw: post.meta?._yoast_wpseo_focuskw || '',
                    metadesc: post.meta?._yoast_wpseo_metadesc || ''
                }
            }
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

function extractPostId(url) {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        if (params.has('post')) return parseInt(params.get('post'));
        if (params.has('p')) return parseInt(params.get('p'));
        return null;
    } catch { return null; }
}

function getBaseUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
    } catch { return url; }
}
