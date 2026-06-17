const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

const historyFilePath = path.join(__dirname, 'history.json');

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

function saveToHistory(text) {
    const history = loadHistory();
    history.push({ text, timestamp: Date.now() });
    if (history.length > 50) history.shift();
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
}

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Пользователь подключился к Proton! 🎉');

    const history = loadHistory();
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (message) => {
        const textMessage = message.toString();
        
        try {
            const parsed = JSON.parse(textMessage);
            if (parsed.type === 'call-signal') {
                for (let client of clients) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(textMessage);
                    }
                }
                return;
            }
        } catch (e) {}

        console.log('Новое сообщение в чате:', textMessage);
        saveToHistory(textMessage);
        
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