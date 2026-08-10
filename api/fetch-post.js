// api/fetch-post.js
module.exports = async (req, res) => {
    // ===== CORS HEADERS =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ===== HANDLE OPTIONS =====
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ===== HANYA TERIMA POST =====
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.',
            method: req.method 
        });
    }

    try {
        const { url, username, password } = req.body;

        console.log('📥 Received request:', { url, username: username ? 'present' : 'missing' });

        if (!url || !username || !password) {
            return res.status(400).json({ 
                error: 'Semua field wajib diisi!',
                details: { url: !!url, username: !!username, password: !!password }
            });
        }

        const postId = extractPostId(url);
        if (!postId) {
            return res.status(400).json({ 
                error: 'URL edit tidak valid. Gunakan: domain.com/wp-admin/post.php?post=123&action=edit' 
            });
        }

        const baseUrl = getBaseUrl(url);
        const apiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        console.log('📤 Fetching WordPress:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-WP-Updater/1.0'
            }
        });

        const responseText = await response.text();
        console.log('📊 WordPress Status:', response.status);

        if (!response.ok) {
            return res.status(500).json({
                error: `Gagal fetch data: ${response.status}`,
                detail: responseText.substring(0, 200)
            });
        }

        let post;
        try {
            post = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({
                error: 'Response bukan JSON.',
                detail: responseText.substring(0, 200)
            });
        }

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
        console.error('❌ Error:', error);
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
