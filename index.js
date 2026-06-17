const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const multer = require('multer'); // Modern library for absolute local file uploads

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Create static link distribution channel for uploaded pictures
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const usersFilePath = path.join(__dirname, 'users.json');
const historyFilePath = path.join(__dirname, 'history.json');

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { console.error("Data pipeline load crash:", e); }
    return filePath.includes('users') ? {} : [];
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. LOCAL MULTI-FILE UPLOAD ROUTE
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'File transfer empty' });
    const localImageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: localImageUrl });
});

// 2. AUTHENTICATION ROUTE
app.post('/api/auth', (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ success: false, error: 'Fields cannot be empty!' });

    const users = loadData(usersFilePath);
    const userKey = nickname.toLowerCase();

    if (users[userKey]) {
        if (users[userKey].password === password) return res.json({ success: true, nickname: users[userKey].nickname });
        return res.status(401).json({ success: false, error: 'Incorrect password!' });
    } else {
        users[userKey] = { nickname, password };
        saveData(usersFilePath, users);
        return res.json({ success: true, nickname });
    }
});

// 3. MESSAGES HISTORY ROUTES
app.get('/api/messages', (req, res) => res.json(loadData(historyFilePath)));
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