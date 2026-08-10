// api/update-post.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { post_id, username, password, site_url, title, content, status, yoast_title, yoast_focuskw, yoast_metadesc, categories, tags } = req.body;

        if (!post_id || !username || !password || !site_url) {
            return res.status(400).json({ error: 'Data tidak lengkap!' });
        }

        const cleanPassword = password.replace(/\s/g, '');
        const auth = 'Basic ' + Buffer.from(`${username}:${cleanPassword}`).toString('base64');

        const updateData = {
            title: title,
            content: content,
            status: status || 'draft',
            meta: {
                _yoast_wpseo_title: yoast_title || '',
                _yoast_wpseo_focuskw: yoast_focuskw || '',
                _yoast_wpseo_metadesc: yoast_metadesc || ''
            }
        };

        if (categories && categories.length) updateData.categories = categories;
        if (tags && tags.length) updateData.tags = tags;

        const response = await fetch(`${site_url}/wp-json/wp/v2/posts/${post_id}`, {
            method: 'POST',
            headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(500).json({ error: `Gagal update: ${response.status}`, detail: responseText.substring(0, 200) });
        }

        const result = JSON.parse(responseText);

        return res.status(200).json({
            success: true,
            message: 'Postingan berhasil diupdate!',
            post_id: result.id || post_id,
            link: `${site_url}/wp-admin/post.php?post=${post_id}&action=edit`
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
