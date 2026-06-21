const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

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
        if (users[userKey].password === password) return res.json({ success: true, nickname: users[userKey].nickname });
        return res.status(401).json({ success: false, error: 'Incorrect password!' });
    } else {
        if (!isRegisterMode) return res.status(404).json({ success: false, error: 'User not found!' });
        
        users[userKey] = { nickname, password, isPremium: false };
        saveData(usersFilePath, users);
        return res.json({ success: true, nickname });
    }
});

// 2. GET MESSAGES FOR SPECIFIC CHAT
app.get('/api/messages', (req, res) => {
    const targetChatId = req.query.chatId || 'global';
    const history = loadData(historyFilePath);
    const users = loadData(usersFilePath);

    const filteredHistory = history.filter(msg => msg.chatId === targetChatId);

    const enrichedHistory = filteredHistory.map(msg => {
        const userKey = msg.author.toLowerCase();
        const hasPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                             (users[userKey] && users[userKey].isPremium === true);

        return { ...msg, isPremium: hasPremium };
    });

    res.json(enrichedHistory);
});

// 3. POST NEW MESSAGE (С ЗАЩИТОЙ ОТ ОБХОДА ПРЕМИУМ ЭМОДЗИ)
app.post('/api/messages', (req, res) => {
    const { text, imageUrl, author, chatId } = req.body;
    const currentChat = chatId || 'global';
    const history = loadData(historyFilePath);
    const users = loadData(usersFilePath);

    let processedText = text || '';

    // Защитный шлюз: Проверяем, содержит ли текст премиум токены [proton_emoji_X]
    if (processedText.includes('[proton_emoji_')) {
        const userKey = author.toLowerCase();
        // Проверяем реальное наличие премиума у автора сообщения
        const isAuthorPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                                (users[userKey] && users[userKey].isPremium === true);

        // Если премиума нет, вырезаем все попытки обхода через регулярное выражение
        if (!isAuthorPremium) {
            processedText = processedText.replace(/\[proton_emoji_\d+\]/g, '[🔒 Premium Only]');
        }
    }
    
    history.push({ 
        chatId: currentChat, 
        text: processedText, 
        imageUrl: imageUrl || '', 
        author, 
        timestamp: Date.now() 
    });
    
    const currentChannelMsgs = history.filter(m => m.chatId === currentChat);
    if (currentChannelMsgs.length > 50) {
        const firstIndex = history.findIndex(m => m.chatId === currentChat);
        if (firstIndex !== -1) history.splice(firstIndex, 1);
    }
    
    saveData(historyFilePath, history);
    res.json({ success: true });
});

// 4. ROUTE TO DISCOVER REGISTERED USERS FOR SIDEBAR LIST
app.get('/api/users', (req, res) => {
    const users = loadData(usersFilePath);
    const usersList = Object.values(users).map(u => ({ nickname: u.nickname }));
    res.json(usersList);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

const PORT = process.env.PORT || 5002;
http.createServer(app).listen(PORT, () => console.log(`Proton local kernel operating on port ${PORT}`));