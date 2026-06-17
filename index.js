const express = require('express');
const path = require('path');
const http = require('http'); // Нам нужен встроенный модуль http
const WebSocket = require('ws');

const app = express();

// Раздаём сайт из папки frontend
app.use(express.static(__dirname));

// 1. Создаем правильный базовый HTTP-сервер вокруг Express
const server = http.createServer(app);

// 2. Создаём WebSocket сервер и привязываем его к нашему HTTP-серверу
const wss = new WebSocket.Server({ server });

// Храним список всех активных пользователей в сети
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Пользователь успешно подключился к Proton! 🎉');

    // Ждём сообщение от браузера
    ws.on('message', (message) => {
        // Декодируем сообщение из буфера в обычный текст
        const textMessage = message.toString();
        console.log('Сервер получил сообщение:', textMessage);
        
        // Пересылаем полученное сообщение ВСЕМ, кто сейчас онлайн
        for (let client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(textMessage);
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Пользователь отключился');
    });
});

// 3. Запускаем именно склеенный server, а не app
// Хостинг сам подставит нужный порт в переменную process.env.PORT, а если её нет — включит 5002
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
    console.log(`Сервер Proton запущен на порту ${PORT}`);
});
