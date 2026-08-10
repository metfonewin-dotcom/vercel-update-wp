// index.js - Entrypoint untuk Vercel
console.log('Server running!');
module.exports = (req, res) => {
    res.status(200).json({ message: 'Welcome to WordPress Updater API' });
};
