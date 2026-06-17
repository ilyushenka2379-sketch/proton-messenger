const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs'); // Встроенный модуль работы с файлами, никогда не сломается!

const app = express();
app.use(express.static(path.join(__dirname, '../frontend'))); // Для локальных тестов
app.use(express.static(__dirname)); // Для работы на хостинге Render

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

const historyFilePath = path.join(__dirname, 'history.json');

// Функция безопасного чтения истории из текстового файла
function loadHistory() {
    try {
        if (fs.existsSync(historyFilePath)) {
            const fileData = fs.readFileSync(historyFilePath, 'utf8');
            return JSON.parse(fileData);
        }
    } catch (e) {
        console.log("Создаем чистую историю...");
    }
    return [];
}

// Функция сохранения сообщения в текстовый файл
function saveToHistory(text) {
    const history = loadHistory();
    history.push({ text, timestamp: Date.now() });
    // Оставляем только последние 50 сообщений, чтобы файл не раздувался
    if (history.length > 50) history.shift();
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
}

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Пользователь подключился к Proton! 🎉');

    // При входе сразу отдаем сохраненный текстовый файл истории
    const history = loadHistory();
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (message) => {
        const textMessage = message.toString();
        console.log('Новое сообщение:', textMessage);

        // Сохраняем в наш файл
        saveToHistory(textMessage);
        
        // Пересылаем всем в сети
        for (let client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: textMessage }));
            }
        }
    });

    ws.on('close', () => clients.delete(ws));
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Proton онлайн на порту ${PORT}`));