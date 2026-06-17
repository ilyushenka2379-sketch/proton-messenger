// Restoration guard channel
if (localStorage.getItem('proton_nickname')) {
    window.location.href = 'chat.html';
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

    if (loginButton) loginButton.textContent = "Processing authorization...";
    if (errorMessage) errorMessage.classList.add('hidden');

    try {
        console.log("Transmitting identity credentials array payload...");
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
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
    if (buttonElement) buttonElement.textContent = "Sign In / Register";
    if (errorElement) {
        errorElement.textContent = text;
        errorElement.classList.remove('hidden');
    }
}