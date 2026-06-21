const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws'); // Инициализируем сокеты

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.static(__dirname));

const usersFilePath = path.join(__dirname, 'users.json');
const historyFilePath = path.join(__dirname, 'history.json');
const PREMIUM_NICKNAMES = ['GDlyuha103']; 

function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { console.error("Data pipeline load crash:", e); }
    return filePath.includes('users') ? {} : [];
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. AUTHENTICATION ROUTE
app.post('/api/auth', (req, res) => {
    const { nickname, password, isRegisterMode } = req.body; 
    if (!nickname || !password) return res.status(400).json({ success: false, error: 'Fields cannot be empty!' });

    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();

    if (users[userKey]) {
        if (isRegisterMode) return res.status(400).json({ success: false, error: 'This nickname is already taken!' });
        if (users[userKey].password === password) {
            users[userKey].lastSeen = Date.now();
            saveData(usersFilePath, users);
            return res.json({ success: true, nickname: users[userKey].nickname });
        }
        return res.status(401).json({ success: false, error: 'Incorrect password!' });
    } else {
        if (!isRegisterMode) return res.status(404).json({ success: false, error: 'User not found!' });
        
        users[userKey] = { nickname, password, isPremium: false, avatar: '', theme: 'light', lastSeen: Date.now() };
        saveData(usersFilePath, users);
        return res.json({ success: true, nickname });
    }
});

// UPDATE PROFILE
app.post('/api/profile/update', (req, res) => {
    const { nickname, avatar, theme } = req.body;
    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();

    if (!users[userKey]) return res.status(404).json({ success: false, error: 'User not found' });

    if (avatar !== undefined) users[userKey].avatar = avatar;
    if (theme !== undefined) users[userKey].theme = theme;
    users[userKey].lastSeen = Date.now();

    saveData(usersFilePath, users);
    
    // Оповещаем всех по веб-сокету, что профили обновились
    broadcast({ type: 'users_updated' });
    
    res.json({ success: true, theme: users[userKey].theme, avatar: users[userKey].avatar });
});

// GET USERS LIST
app.get('/api/users', (req, res) => {
    const users = loadData(usersFilePath);
    const heartbeatWindow = 5000;
    const usersList = Object.values(users).map(u => ({
        nickname: u.nickname,
        avatar: u.avatar || '',
        theme: u.theme || 'light',
        isOnline: u.lastSeen && (Date.now() - u.lastSeen < heartbeatWindow)
    }));
    res.json(usersList);
});

// HTTP HISTORY BACKUP FOR INITIAL LOAD
app.get('/api/messages', (req, res) => {
    const targetChatId = req.query.chatId || 'global';
    const history = loadData(historyFilePath);
    const users = loadData(usersFilePath);

    const filteredHistory = history.filter(msg => msg.chatId === targetChatId).map(msg => {
        const userKey = msg.author.toLowerCase();
        const hasPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                             (users[userKey] && users[userKey].isPremium === true);
        return { ...msg, isPremium: hasPremium, authorAvatar: users[userKey] ? users[userKey].avatar : '' };
    });
    res.json(filteredHistory);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

const PORT = process.env.PORT || 5002;
const server = http.createServer(app);

// --- ИНИЦИАЛИЗАЦИЯ ВЕБ-СОКЕТ СЕРВЕРА ---
const wss = new WebSocketServer({ server });
const clients = new Map(); // Храним активные сокет-сессии пользователей

wss.on('connection', (ws) => {
    let clientNickname = '';

    ws.on('message', (message) => {
        try {
            const packet = JSON.parse(message);
            
            // 1. Клиент зашел и регистрирует свою сокет-сессию
            if (packet.type === 'register') {
                clientNickname = packet.nickname;
                clients.set(clientNickname.toLowerCase(), ws);
                updateUserStatus(clientNickname);
                broadcast({ type: 'users_updated' });
            }
            
            // 2. Клиент прислал сигнал "Я в сети"
            if (packet.type === 'heartbeat') {
                updateUserStatus(clientNickname);
            }

            // 3. Клиент отправляет новое сообщение в чат
            if (packet.type === 'message') {
                const { text, imageUrl, chatId } = packet;
                const users = loadData(usersFilePath);
                const userKey = clientNickname.toLowerCase();
                
                updateUserStatus(clientNickname);

                let processedText = text || '';
                if (processedText.includes('[proton_emoji_')) {
                    const isPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                                        (users[userKey] && users[userKey].isPremium === true);
                    if (!isPremium) processedText = processedText.replace(/\[proton_emoji_\d+\]/g, '[🔒 Premium Only]');
                }

                const newMsg = {
                    chatId: chatId || 'global',
                    text: processedText,
                    imageUrl: imageUrl || '',
                    author: clientNickname,
                    timestamp: Date.now()
                };

                // Сохраняем в файл json
                const history = loadData(historyFilePath);
                history.push(newMsg);
                const currentChannelMsgs = history.filter(m => m.chatId === newMsg.chatId);
                if (currentChannelMsgs.length > 50) {
                    const firstIndex = history.findIndex(m => m.chatId === newMsg.chatId);
                    if (firstIndex !== -1) history.splice(firstIndex, 1);
                }
                saveData(historyFilePath, history);

                // Обогащаем для фронтенда
                const hasPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                                     (users[userKey] && users[userKey].isPremium === true);
                const enrichedMsg = {
                    ...newMsg,
                    isPremium: hasPremium,
                    authorAvatar: users[userKey] ? users[userKey].avatar : ''
                };

                // Мгновенно рассылаем сообщение целевым клиентам без всяких интервалов!
                if (enrichedMsg.chatId === 'global') {
                    broadcast({ type: 'new_message', message: enrichedMsg });
                } else {
                    // Если ЛС, шлем только двум участникам диалога
                    const usersInPrivate = enrichedMsg.chatId.replace('private_', '').split('_');
                    usersInPrivate.forEach(uKey => {
                        const targetWs = clients.get(uKey.toLowerCase());
                        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                            targetWs.send(JSON.stringify({ type: 'new_message', message: enrichedMsg }));
                        }
                    });
                }
            }
        } catch(e) { console.error("WS error handler intercept:", e); }
    });

    ws.on('close', () => {
        if (clientNickname) {
            clients.delete(clientNickname.toLowerCase());
            broadcast({ type: 'users_updated' });
        }
    });
});

function updateUserStatus(nickname) {
    if (!nickname) return;
    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();
    if (users[userKey]) {
        users[userKey].lastSeen = Date.now();
        saveData(usersFilePath, users);
    }
}

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
}

server.listen(PORT, () => console.log(`Proton local kernel operating with WebSockets on port ${PORT}`));