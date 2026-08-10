const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ===== FETCH POST =====
app.post('/api/fetch-post', async (req, res) => {
    try {
        const { url, username, password } = req.body;

        if (!url || !username || !password) {
            return res.status(400).json({ error: 'Semua field wajib diisi!' });
        }

        // Extract post ID
        const postId = extractPostId(url);
        if (!postId) {
            return res.status(400).json({ error: 'URL tidak valid!' });
        }

        const baseUrl = getBaseUrl(url);
        const apiUrl = `${baseUrl}/wp-json/wp/v2/posts/${postId}`;
        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        console.log('📤 Fetching:', apiUrl);

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: 'Gagal fetch data', detail: data });
        }

        return res.json({
            success: true,
            data: {
                id: data.id,
                title: data.title?.rendered || '',
                content: data.content?.rendered || '',
                status: data.status || 'draft',
                link: data.link || '',
                yoast: {
                    title: data.meta?._yoast_wpseo_title || '',
                    focuskw: data.meta?._yoast_wpseo_focuskw || '',
                    metadesc: data.meta?._yoast_wpseo_metadesc || ''
                }
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== UPDATE POST =====
app.post('/api/update-post', async (req, res) => {
    try {
        const { post_id, username, password, site_url, title, content, status, yoast_title, yoast_focuskw, yoast_metadesc, categories, tags } = req.body;

        if (!post_id || !username || !password || !site_url) {
            return res.status(400).json({ error: 'Data tidak lengkap!' });
        }

        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        const updateData = {
            title: title || '',
            content: content || '',
            status: status || 'draft',
            meta: {
                _yoast_wpseo_title: yoast_title || '',
                _yoast_wpseo_focuskw: yoast_focuskw || '',
                _yoast_wpseo_metadesc: yoast_metadesc || ''
            }
        };

        if (categories && categories.length) updateData.categories = categories;
        if (tags && tags.length) updateData.tags = tags;

        const apiUrl = `${site_url}/wp-json/wp/v2/posts/${post_id}`;

        console.log('📤 Updating:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: 'Gagal update', detail: data });
        }

        return res.json({
            success: true,
            message: 'Postingan berhasil diupdate!',
            post_id: data.id || post_id,
            link: `${site_url}/wp-admin/post.php?post=${post_id}&action=edit`
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== HELPER FUNCTIONS =====
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

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
