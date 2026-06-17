const express = require('express');
const path = require('path');
const http = require('http');

const app = express();

// Настраиваем сервер так, чтобы он отдавал всю папку с файлами
app.use(express.static(__dirname));

// Явно указываем пути для браузера
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

const PORT = process.env.PORT || 5002;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Proton Server actively running on port ${PORT}`);
});