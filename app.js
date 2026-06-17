// ВСТАВЬТЕ СЮДА ВАШ КЛЮЧ ИЗ IMGBB ДЛЯ КАРТИНОК:
const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';

// Конфигурация Firebase со скриншота
const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Элементы экранов
const authScreen = document.getElementById('auth-screen');
const nameScreen = document.getElementById('name-screen');
const chatScreen = document.getElementById('chat-screen');
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const nicknameInput = document.getElementById('nickname-input');

let currentUser = null;
let userNickname = '';

// Следим за состоянием пользователя (Вошел/Вышел)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Проверяем, есть ли у пользователя никнейм в базе данных
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            userNickname = userDoc.data().nickname;
            showScreen('chat');
            listenToMessages();
        } else {
            showScreen('name');
        }
    } else {
        showScreen('auth');
    }
});

function showScreen(screen) {
    authScreen.classList.add('hidden');
    nameScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    if (screen === 'auth') authScreen.classList.remove('hidden');
    if (screen === 'name') nameScreen.classList.remove('hidden');
    if (screen === 'chat') chatScreen.classList.remove('hidden');
}

// 1. ВХОД ЧЕРЕЗ GOOGLE
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Используем редирект вместо всплывающего окна
    auth.signInWithRedirect(provider).catch(err => alert('Ошибка входа: ' + err.message));
}

// 2. СОХРАНЕНИЕ НИКНЕЙМА
async function saveNickname() {
    const nick = nicknameInput.value.trim();
    if (!nick) return alert('Type name!');
    
    await db.collection('users').doc(currentUser.uid).set({ nickname: nick });
    userNickname = nick;
    showScreen('chat');
    listenToMessages();
}

// 3. ОТПРАВКА СООБЩЕНИЯ
async function sendMessage(imageUrl = '') {
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    await db.collection('messages').add({
        text: text,
        imageUrl: imageUrl,
        author: userNickname,
        uid: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

// 4. ЗАГРУЗКА КАРТИНКИ ЧЕРЕЗ IMGBB
async function uploadImage(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        appendSystemMessage('Loadung image...');
        const response = await fetch(`https://imgbb.com{IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            // Отправляем ссылку на картинку в базу данных чата
            sendMessage(result.data.url);
        } else {
            alert('Loading image error');
        }
    } catch (e) {
        alert('Server is busy, try later.');
    }
}

// 5. ЖИВАЯ ТРАНСЛЯЦИЯ СООБЩЕНИЙ С ЭКРАНА
function listenToMessages() {
    db.collection('messages').orderBy('timestamp', 'asc').limitToLast(50)
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                item.classList.add('msg');
                
                // Проверяем, наше сообщение или чужое
                if (data.uid === currentUser.uid) {
                    item.classList.add('my');
                } else {
                    item.classList.add('other');
                }

                let content = `<div class="author">${data.author}</div>`;
                if (data.text) content += `<div>${data.text}</div>`;
                if (data.imageUrl) content += `<img src="${data.imageUrl}" alt="photo">`;
                
                item.innerHTML = content;
                messagesDiv.appendChild(item);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

function appendSystemMessage(text) {
    const item = document.createElement('div');
    item.style.fontSize = '12px';
    item.style.color = '#888';
    item.textContent = text;
    messagesDiv.appendChild(item);
}

function logout() { auth.signOut(); }
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });