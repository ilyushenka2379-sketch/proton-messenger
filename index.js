const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const usersFilePath = path.join(__dirname, 'users.json');
const historyFilePath = path.join(__dirname, 'history.json');

// Helpers for data persistence
function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) { console.error("File read pipeline error:", e); }
    return filePath.includes('users') ? {} : [];
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. AUTHENTICATION ROUTE
app.post('/api/auth', (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
        return res.status(400).json({ success: false, error: 'Fields cannot be empty!' });
    }

    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();

    if (users[userKey]) {
        if (users[userKey].password === password) {
            return res.json({ success: true, nickname: users[userKey].nickname });
        } else {
            return res.status(401).json({ success: false, error: 'Incorrect password!' });
        }
    } else {
        users[userKey] = { nickname, password };
        saveData(usersFilePath, users);
        return res.json({ success: true, nickname });
    }
});

// 2. CHAT DATA ROUTES
app.get('/api/messages', (req, res) => {
    res.json(loadData(historyFilePath));
});

app.post('/api/messages', (req, res) => {
    const { text, imageUrl, author } = req.body;
    const history = loadData(historyFilePath);
    
    history.push({ text, imageUrl, author, timestamp: Date.now() });
    if (history.length > 50) history.shift();
    
    saveData(historyFilePath, history);
    res.json({ success: true });
});

// Serve frontend routing entrypoints
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));

const PORT = process.env.PORT || 5002;
http.createServer(app).listen(PORT, () => console.log(`Proton local kernel operating on port ${PORT}`));