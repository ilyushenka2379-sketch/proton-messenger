const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';

const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const authScreen = document.getElementById('auth-screen');
const nameScreen = document.getElementById('name-screen');
const chatScreen = document.getElementById('chat-screen');
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const nicknameInput = document.getElementById('nickname-input');
const loginButton = document.getElementById('login-button');

let currentUser = null;
let userNickname = '';

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("User authorized successfully via Google token:", user.uid);
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userNickname = userDoc.data().nickname;
                showScreen('chat');
                listenToMessages();
            } else {
                showScreen('name');
            }
        } catch (error) {
            console.error("Critical Firestore dynamic verification error:", error);
            showScreen('name');
        }
    } else {
        console.log("No valid active session detected. Showing authorization interface.");
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

function loginWithGoogle() {
    if (loginButton) loginButton.textContent = "Connecting to Google...";
    console.log("Initializing dynamic cross-origin identity provider routing...");
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Using native direct redirect to securely bypass third-party cookie restrictions
    auth.signInWithRedirect(provider).catch(err => {
        if (loginButton) loginButton.textContent = "Войти через Google";
        console.error("Identity tunnel registration failed:", err);
        alert('Authentication process error: ' + err.message);
    });
}

async function saveNickname() {
    const nick = nicknameInput.value.trim();
    if (!nick) return alert('Name field cannot be empty!');
    
    console.log("Syncing custom nickname profile parameters...");
    await db.collection('users').doc(currentUser.uid).set({ nickname: nick });
    userNickname = nick;
    showScreen('chat');
    listenToMessages();
}

async function sendMessage(imageUrl = '') {
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    console.log("Publishing standard datagram packet into sync stream...");
    await db.collection('messages').add({
        text: text,
        imageUrl: imageUrl,
        author: userNickname,
        uid: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

async function uploadImage(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;

    console.log("Intercepting stream array payload buffer...");
    const formData = new FormData();
    formData.append('image', files[0]); // Fix: sending strictly first target array element

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
            console.warn("CDN response payload mismatch:", result);
            alert('Image proxy hosting service rejected the request');
        }
    } catch (e) {
        console.error("External connection intercept error:", e);
        alert('Data uplink pipeline error, please retry');
    }
}

function listenToMessages() {
    console.log("Establishing remote reactive pipeline connection...");
    db.collection('messages').orderBy('timestamp', 'asc').limitToLast(50)
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                item.classList.add('msg');
                
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
        }, (error) => {
            console.error("Dynamic subscription sync broken:", error);
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
    console.log("Clearing state data token, terminating session...");
    auth.signOut(); 
}
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });