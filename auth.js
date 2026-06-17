const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const authNicknameInput = document.getElementById('auth-nickname');
const authPasswordInput = document.getElementById('auth-password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

// If already logged in, redirect to chat immediately
if (localStorage.getItem('proton_nickname')) {
    window.location.href = 'chat.html';
}

async function handleAuth() {
    const nickname = authNicknameInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    
    // Check if fields are empty
    if (!nickname || !password) {
        showError('Fields cannot be empty! Please enter nickname and password.');
        return;
    }

    if (loginButton) loginButton.textContent = "Processing authorization...";
    if (errorMessage) errorMessage.classList.add('hidden');

    try {
        console.log("Connecting to Firestore database for user:", nickname);
        const userDoc = await db.collection('users').doc(nickname).get();

        if (userDoc.exists) {
            // User exists, check password
            const userData = userDoc.data();
            if (userData.password === password) {
                console.log("Password verified for:", nickname);
                proceedToChat(nickname);
            } else {
                console.warn("Auth alert: Wrong password for user:", nickname);
                showError('Incorrect password! Access denied.');
            }
        } else {
            // New user, register automatically
            console.log("Registering new profile for:", nickname);
            await db.collection('users').doc(nickname).set({
                nickname: nickname,
                password: password
            });
            proceedToChat(nickname);
        }
    } catch (err) {
        console.error("Critical Firestore connection error:", err);
        showError('Database error: ' + err.message);
    }
}

function proceedToChat(nickname) {
    localStorage.setItem('proton_nickname', nickname);
    window.location.href = 'chat.html';
}

function showError(text) {
    if (loginButton) loginButton.textContent = "Sign In / Register";
    if (errorMessage) {
        errorMessage.textContent = text;
        errorMessage.classList.remove('hidden');
    }
}