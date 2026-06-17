const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

let db;

// Safety initialization wrapper to completely avoid "firebase is not defined" error
window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase initialized successfully inside auth tunnel.");
        
        // Security check: if user already has an active token, redirect to chat room
        if (localStorage.getItem('proton_nickname')) {
            window.location.href = 'chat.html';
        }
    } else {
        console.error("Critical: Firebase core scripts failed to load via network.");
    }
});

async function handleAuth() {
    // Moved element selection directly inside click action to prevent initialization blocks
    const authNicknameInput = document.getElementById('auth-nickname');
    const authPasswordInput = document.getElementById('auth-password');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    if (!authNicknameInput || !authPasswordInput) return;

    const nickname = authNicknameInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    
    if (!nickname || !password) {
        showError(errorMessage, loginButton, 'Fields cannot be empty! Enter nickname and password.');
        return;
    }

    if (!db) {
        showError(errorMessage, loginButton, 'Database connection is not ready yet. Please wait a second.');
        return;
    }

    if (loginButton) loginButton.textContent = "Processing authorization...";
    if (errorMessage) errorMessage.classList.add('hidden');

    try {
        console.log("Querying profile dataset for target user:", nickname);
        const userDoc = await db.collection('users').doc(nickname).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.password === password) {
                console.log("Password matching successful for user:", nickname);
                proceedToChat(nickname);
            } else {
                console.warn("Security warning: Wrong credentials block intercepted for user:", nickname);
                showError(errorMessage, loginButton, 'Incorrect password! Access denied.');
            }
        } else {
            console.log("No existing record found. Automatic profile registry initialization for:", nickname);
            await db.collection('users').doc(nickname).set({
                nickname: nickname,
                password: password
            });
            proceedToChat(nickname);
        }
    } catch (err) {
        console.error("Firestore database pipeline broken:", err);
        showError(errorMessage, loginButton, 'Database pipeline transaction error: ' + err.message);
    }
}

function proceedToChat(nickname) {
    localStorage.setItem('proton_nickname', nickname);
    window.location.href = 'chat.html';
}

function showError(errorElement, buttonElement, text) {
    if (buttonElement) buttonElement.textContent = "Sign In / Register";
    if (errorElement) {
        errorElement.textContent = text;
        errorElement.classList.remove('hidden');
    }
}