// api/index.js - Root API
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        message: 'API is working!',
        endpoints: {
            fetch: '/api/fetch-post',
            update: '/api/update-post'
        }
    });
};
