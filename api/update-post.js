// api/update-post.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { 
            post_id, 
            username, 
            password, 
            site_url,
            title,
            content,
            status,
            yoast_title,
            yoast_focuskw,
            yoast_metadesc,
            categories,
            tags
        } = req.body;

        // Validasi input
        if (!post_id || !username || !password || !site_url) {
            return res.status(400).json({ 
                error: 'Data tidak lengkap!',
                details: { 
                    post_id: !!post_id, 
                    username: !!username, 
                    password: !!password, 
                    site_url: !!site_url 
                }
            });
        }

        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        // Build data update
        const updateData = {
            title: title || '',
            content: content || '<p>Konten kosong.</p>',
            status: status || 'draft',
            meta: {
                _yoast_wpseo_title: yoast_title || '',
                _yoast_wpseo_focuskw: yoast_focuskw || '',
                _yoast_wpseo_metadesc: yoast_metadesc || ''
            }
        };

        // Tambahkan kategori & tags jika ada
        if (categories && categories.length > 0) {
            updateData.categories = categories;
        }
        if (tags && tags.length > 0) {
            updateData.tags = tags;
        }

        const apiUrl = `${site_url}/wp-json/wp/v2/posts/${post_id}`;
        console.log('📤 Updating:', apiUrl);
        console.log('📤 Data:', JSON.stringify(updateData, null, 2));

        // Kirim ke WordPress
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-WP-Updater/1.0'
            },
            body: JSON.stringify(updateData)
        });

        const responseText = await response.text();

        // Cek response
        if (!response.ok) {
            console.error('❌ WordPress Error:', response.status, responseText.substring(0, 200));
            
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                return res.status(500).json({
                    error: 'WordPress REST API tidak aktif atau URL salah.',
                    detail: 'Periksa setting permalink WordPress.',
                    status: response.status
                });
            }

            return res.status(500).json({
                error: `Gagal update: ${response.status}`,
                detail: responseText.substring(0, 200)
            });
        }

        // Parse response
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Parse Error:', e.message);
            return res.status(500).json({
                error: 'Response bukan JSON.',
                detail: responseText.substring(0, 200)
            });
        }

        // Verifikasi update
        console.log('🔍 Verifikasi update...');
        const verifyResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': auth }
        });
        const verifyText = await verifyResponse.text();
        console.log('📊 Verify:', verifyText.substring(0, 200));

        return res.status(200).json({
            success: true,
            message: 'Postingan berhasil diupdate!',
            post_id: result.id || post_id,
            link: `${site_url}/wp-admin/post.php?post=${post_id}&action=edit`,
            view: result.link || `${site_url}/?p=${post_id}`,
            verification: verifyText.substring(0, 200)
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ 
            error: 'Terjadi kesalahan pada server.',
            message: error.message 
        });
    }
};
