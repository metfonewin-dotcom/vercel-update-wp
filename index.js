// index.js - Entrypoint untuk Vercel (tidak mengganggu API)
module.exports = (req, res) => {
    // Hanya untuk root path (/)
    if (req.url === '/' || req.url === '') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('WordPress Updater is running! <a href="/index.html">Go to App</a>');
    } else {
        // Untuk path lain, biarkan Vercel routing menangani
        res.writeHead(404);
        res.end('Not Found');
    }
};
