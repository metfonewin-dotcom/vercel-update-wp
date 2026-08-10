// api/fetch-post.js
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { url, username, password } = req.body;

        // Validasi input
        if (!url || !username || !password) {
            return res.status(400).json({ 
                error: 'Semua field wajib diisi!',
                details: { url: !!url, username: !!username, password: !!password }
            });
        }

        // Extract post ID dari URL
        const postId = extractPostId(url);
        if (!postId) {
            return res.status(400).json({ 
                error: 'URL edit tidak valid. Gunakan format: domain.com/wp-admin/post.php?post=123&action=edit' 
            });
        }

        // Build API URL
        const baseUrl = getBaseUrl(url);
        const apiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        console.log('📤 Fetching:', apiUrl);

        // Fetch dari WordPress
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-WP-Updater/1.0'
            }
        });

        const responseText = await response.text();

        // Cek response
        if (!response.ok) {
            console.error('❌ WordPress Error:', response.status, responseText.substring(0, 200));
            
            // Cek apakah ini masalah REST API
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                return res.status(500).json({
                    error: 'WordPress REST API tidak aktif atau URL salah.',
                    detail: 'Periksa setting permalink WordPress atau pastikan REST API aktif.',
                    status: response.status
                });
            }

            return res.status(500).json({
                error: `Gagal fetch data: ${response.status}`,
                detail: responseText.substring(0, 200)
            });
        }

        // Parse JSON
        let post;
        try {
            post = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Parse Error:', e.message);
            return res.status(500).json({
                error: 'Response bukan JSON. Periksa REST API WordPress.',
                detail: responseText.substring(0, 200)
            });
        }

        // Cek apakah Yoast SEO aktif
        const hasYoast = post.meta && (
            post.meta._yoast_wpseo_title !== undefined ||
            post.meta._yoast_wpseo_focuskw !== undefined ||
            post.meta._yoast_wpseo_metadesc !== undefined
        );

        // Return data
        return res.status(200).json({
            success: true,
            data: {
                id: post.id,
                title: post.title?.rendered || '',
                content: post.content?.rendered || '',
                status: post.status || 'draft',
                link: post.link || '',
                edit_url: url,
                has_yoast: hasYoast,
                yoast: {
                    title: post.meta?._yoast_wpseo_title || '',
                    focuskw: post.meta?._yoast_wpseo_focuskw || '',
                    metadesc: post.meta?._yoast_wpseo_metadesc || ''
                }
            },
            warning: !hasYoast ? '⚠️ Yoast SEO tidak terdeteksi. Pastikan plugin Yoast aktif.' : null
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ 
            error: 'Terjadi kesalahan pada server.',
            message: error.message 
        });
    }
};

// ===== FUNGSI BANTU =====
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
