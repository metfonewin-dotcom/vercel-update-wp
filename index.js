// index.js - Entrypoint untuk Vercel
module.exports = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        message: 'WordPress Updater API is running!',
        endpoints: {
            fetch: '/api/fetch-post',
            update: '/api/update-post'
        }
    }));
};
