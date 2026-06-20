const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
// Increasing packet size limit to 10MB so larger stringified images can pass through smoothly
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const usersFilePath = path.join(__dirname, 'users.json');
const historyFilePath = path.join(__dirname, 'history.json');

// --- СПИСОК ПРЕМИУМ-ПОЛЬЗОВАТЕЛЕЙ (АДМИН-ПАНЕЛЬ) ---
// Впиши сюда свой точный никнейм в кавычках (регистр не важен).
// Если хочешь добавить друзей, пиши через запятую, например: ['ТвойНик', 'НикДруга']
const PREMIUM_NICKNAMES = ['GDlyuha103']; 
// ----------------------------------------------------

function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { console.error("Data pipeline load crash:", e); }
    return filePath.includes('users') ? {} : [];
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. AUTHENTICATION ROUTE (С разделением режимов Входа и Регистрации)
app.post('/api/auth', (req, res) => {
    const { nickname, password, isRegisterMode } = req.body; 
    if (!nickname || !password) return res.status(400).json({ success: false, error: 'Fields cannot be empty!' });

    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();

    if (users[userKey]) {
        // Если пользователь существует, но пытается зарегистрироваться заново
        if (isRegisterMode) {
            return res.status(400).json({ success: false, error: 'This nickname is already taken!' });
        }
        // Если это обычный вход, проверяем пароль
        if (users[userKey].password === password) {
            return res.json({ success: true, nickname: users[userKey].nickname });
        }
        return res.status(401).json({ success: false, error: 'Incorrect password!' });
    } else {
        // Если пользователя нет, и он пытается войти через Sign In
        if (!isRegisterMode) {
            return res.status(404).json({ success: false, error: 'User not found! Click "Register" below to create an account.' });
        }
        
        // Если пользователя нет, и он нажал Register — создаем новый аккаунт
        users[userKey] = { nickname, password, isPremium: false };
        saveData(usersFilePath, users);
        return res.json({ success: true, nickname });
    }
});

// 2. MESSAGES HISTORY ROUTES (Handles both text and Base64 strings natively)
app.get('/api/messages', (req, res) => {
    const history = loadData(historyFilePath);
    const users = loadData(usersFilePath);

    // Перед отправкой истории на фронтенд, проверяем каждого автора на наличие премиума
    const enrichedHistory = history.map(msg => {
        const userKey = msg.author.toLowerCase();
        
        // Проверяем: есть ли ник в списке ручного премиума или стоит ли флаг true в users.json
        const hasPremium = PREMIUM_NICKNAMES.map(n => n.toLowerCase()).includes(userKey) || 
                             (users[userKey] && users[userKey].isPremium === true);

        return {
            ...msg,
            isPremium: hasPremium // Добавляем булево поле для фронтенда chat.js
        };
    });

    res.json(enrichedHistory);
});

app.post('/api/messages', (req, res) => {
    const { text, imageUrl, author } = req.body;
    const history = loadData(historyFilePath);
    history.push({ text, imageUrl, author, timestamp: Date.now() });
    if (history.length > 50) history.shift();
    saveData(historyFilePath, history);
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

const PORT = process.env.PORT || 5002;
http.createServer(app).listen(PORT, () => console.log(`Proton local kernel operating on port ${PORT}`));