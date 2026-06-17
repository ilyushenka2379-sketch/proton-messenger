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

// Security check: if user already has an active session, redirect to chat room immediately
if (localStorage.getItem('proton_nickname')) {
    window.location.href = 'chat.html';
}

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
            const userData = userDoc.data();
            if (userData.password === password) {
                console.log("Identity verified successfully for user:", nickname);
                proceedToChat(nickname);
            } else {
                console.warn("Authorization alert: Invalid password attempt for user:", nickname);
                showError('Incorrect password!');
            }
        } else {
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
    localStorage.setItem('proton_nickname', nickname);
    window.location.href = 'chat.html'; // Dynamic navigation to chat panel
}

function showError(text) {
    if (loginButton) loginButton.textContent = "Sign In / Register";
    errorMessage.textContent = text;
    errorMessage.classList.remove('hidden');
}