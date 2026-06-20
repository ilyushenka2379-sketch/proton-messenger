// Restoration guard channel
if (localStorage.getItem('proton_nickname')) {
    window.location.href = 'chat.html';
}

let isRegisterMode = false;

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const button = document.getElementById('login-button');
    const toggleContainer = document.getElementById('toggle-container');
    const errorMessage = document.getElementById('error-message');

    if (errorMessage) errorMessage.classList.add('hidden');

    if (isRegisterMode) {
        title.textContent = "Create Proton Account ✨";
        subtitle.textContent = "Choose a nickname and password to register.";
        button.textContent = "Register";
        toggleContainer.innerHTML = 'Already have an account? <span onclick="toggleAuthMode()">Sign In</span>';
    } else {
        title.textContent = "Login to Proton 🚀";
        subtitle.textContent = "Enter nickname and password to start chatting.";
        button.textContent = "Sign In";
        toggleContainer.innerHTML = 'Don\'t have an account? <span onclick="toggleAuthMode()">Register</span>';
    }
}

async function handleAuth() {
    const authNicknameInput = document.getElementById('auth-nickname');
    const authPasswordInput = document.getElementById('auth-password');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    if (!authNicknameInput || !authPasswordInput) return;

    const nickname = authNicknameInput.value.trim();
    const password = authPasswordInput.value.trim();
    
    if (!nickname || !password) {
        showError(errorMessage, loginButton, 'Fields cannot be empty! Enter nickname and password.');
        return;
    }

    if (loginButton) {
        loginButton.textContent = isRegisterMode ? "Processing registration..." : "Processing authorization...";
    }
    if (errorMessage) errorMessage.classList.add('hidden');

    try {
        console.log("Transmitting identity credentials array payload...");
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password, isRegisterMode }) // <-- ОТПРАВЛЯЕМ РЕЖИМ НА СЕРВЕР
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            console.log("Session verified successfully for user:", result.nickname);
            localStorage.setItem('proton_nickname', result.nickname);
            window.location.href = 'chat.html';
        } else {
            console.warn("Authorization rejected by local kernel:", result.error);
            showError(errorMessage, loginButton, result.error || 'Authorization failed.');
        }
    } catch (err) {
        console.error("Local network pipeline broken:", err);
        showError(errorMessage, loginButton, 'Network error. Core server unreachable.');
    }
}

function showError(errorElement, buttonElement, text) {
    if (buttonElement) {
        buttonElement.textContent = isRegisterMode ? "Register" : "Sign In";
    }
    if (errorElement) {
        errorElement.textContent = text;
        errorElement.classList.remove('hidden');
    }
}