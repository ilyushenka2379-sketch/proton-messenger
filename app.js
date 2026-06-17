const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';

const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "proton-e70cd.firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const authNicknameInput = document.getElementById('auth-nickname');
const authPasswordInput = document.getElementById('auth-password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

let userNickname = '';
let isListening = false;

// Auto-login check from local browser storage
if (localStorage.getItem('proton_nickname')) {
    userNickname = localStorage.getItem('proton_nickname');
    console.log("Cached session restored for user:", userNickname);
    showScreen('chat');
    listenToMessages();
} else {
    showScreen('auth');
}

function showScreen(screen) {
    authScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    if (screen === 'auth') authScreen.classList.remove('hidden');
    if (screen === 'chat') chatScreen.classList.remove('hidden');
}

// DATABASE LOGIN AND REGISTRATION LOGIC
async function handleAuth() {
    const nickname = authNicknameInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    
    if (!nickname || !password) {
        showError('Please fill in all fields!');
        return;
    }

    if (loginButton) loginButton.textContent = "Processing authorization...";
    errorMessage.classList.add('hidden');

    try {
        const userDoc = await db.collection('users').doc(nickname).get();

        if (userDoc.exists) {
            // User exists, verify password
            const userData = userDoc.data();
            if (userData.password === password) {
                console.log("Identity verified successfully for user:", nickname);
                proceedToChat(nickname);
            } else {
                console.warn("Authorization alert: Invalid password attempt for user:", nickname);
                showError('Incorrect password!');
            }
        } else {
            // New user, register automatically
            console.log("Creating new secure credential profile for user:", nickname);
            await db.collection('users').doc(nickname).set({
                nickname: nickname,
                password: password
            });
            proceedToChat(nickname);
        }
    } catch (err) {
        console.error("Firestore transaction channel error:", err);
        showError('Database connection error. Try again.');
    }
}

function proceedToChat(nickname) {
    userNickname = nickname;
    localStorage.setItem('proton_nickname', nickname);
    showScreen('chat');
    listenToMessages();
}

function showError(text) {
    if (loginButton) loginButton.textContent = "Sign In / Register";
    errorMessage.textContent = text;
    errorMessage.classList.remove('hidden');
}

async function sendMessage(imageUrl = '') {
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    console.log("Pushing standard datagram packet into database stream...");
    await db.collection('messages').add({
        text: text,
        imageUrl: imageUrl,
        author: userNickname,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

async function uploadImage(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;

    console.log("Processing image binary stream array payload...");
    const formData = new FormData();
    formData.append('image', files[0]); // Explicitly targeting first element index

    try {
        appendSystemMessage('System status: Uploading picture, please wait...');
        const response = await fetch(`https://imgbb.com{IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            console.log("Image payload deployed to CDN host:", result.data.url);
            sendMessage(result.data.url);
        } else {
            console.warn("CDN payload rejected:", result);
            alert('Hosting service rejected image format');
        }
    } catch (e) {
        console.error("Pipeline uplink upload error:", e);
        alert('Data network pipeline error, retry transfer');
    }
}

function listenToMessages() {
    if (isListening) return;
    isListening = true;
    console.log("Opening remote reactive transaction synchronization channel...");
    
    db.collection('messages').orderBy('timestamp', 'asc').limitToLast(50)
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                item.classList.add('msg');
                
                if (data.author === userNickname) {
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
        }, (error) => {
            console.error("Dynamic reactive sync broken:", error);
        });
}

function appendSystemMessage(text) {
    const item = document.createElement('div');
    item.style.fontSize = '12px';
    item.style.color = '#888';
    item.textContent = text;
    messagesDiv.appendChild(item);
}

function logout() { 
    console.log("Clearing active browser session token data...");
    localStorage.removeItem('proton_nickname');
    userNickname = '';
    showScreen('auth');
    if (authNicknameInput) authNicknameInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (loginButton) loginButton.textContent = "Sign In / Register";
}

input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });