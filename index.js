const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

// Подключаем нашу текстовую базу данных
const Datastore = require('nedb-promises');
const db = Datastore.create({ filename: path.join(__dirname, 'messages.db'), autoload: true });

const app = express();

// Раздаём сайт из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', async (ws) => {
    clients.add(ws);
    console.log('Пользователь успешно подключился к Proton! 🎉');

    // МАГИЯ: При подключении достаем из базы последние 50 сообщений, сортируем по времени
    try {
        const history = await db.find({}).sort({ timestamp: 1 }).limit(50);
        // Отправляем историю сообщений обратно вошедшему пользователю в виде JSON
        ws.send(JSON.stringify({ type: 'history', data: history }));
    } catch (err) {
        console.error('Ошибка загрузки истории:', err);
    }

    // Ждём сообщение от браузера
    ws.on('message', async (message) => {
        const textMessage = message.toString();
        console.log('Сервер получил сообщение:', textMessage);

        // Создаем объект сообщения с меткой времени
        const msgObject = {
            text: textMessage,
            timestamp: Date.now()
        };

        // Сохраняем сообщение в файл базы данных messages.db
        await db.insert(msgObject);
        
        // Пересылаем полученное сообщение ВСЕМ, кто сейчас онлайн
        for (let client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: textMessage }));
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
    console.log(`Сервер Proton запущен на порту ${PORT}`);
});
