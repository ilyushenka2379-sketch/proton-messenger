if (localStorage.getItem('proton_nickname')) {
    window.location.href = 'chat.html';
}

let isRegisterMode = false;
let selectedTheme = 'dark'; // По умолчанию темная

// ФУНКЦИЯ ДИНАМИЧЕСКОГО ПЕРЕКЛЮЧЕНИЯ ТЕМЫ О К Н А ВХОДА
function changeAuthTheme(themeMode) {
    selectedTheme = themeMode;
    document.getElementById('auth-btn-white').classList.remove('active');
    document.getElementById('auth-btn-dark').classList.remove('active');
    
    if (themeMode === 'white') {
        document.getElementById('auth-btn-white').classList.add('active');
        document.documentElement.setAttribute('data-auth-theme', 'white');
    } else {
        document.getElementById('auth-btn-dark').classList.add('active');
        document.documentElement.removeAttribute('data-auth-theme');
    }
}

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
        showError(errorMessage, loginButton, 'Fields cannot be empty!');
        return;
    }

    if (loginButton) loginButton.textContent = "Processing...";
    if (errorMessage) errorMessage.classList.add('hidden');

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password, isRegisterMode })
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            // СОХРАНЯЕМ ТЕМУ ИЗ ЛОГИНА ДЛЯ МЕССРЕНДЖЕРА ЧАТА
            localStorage.setItem('proton_theme', selectedTheme);
            localStorage.setItem('proton_nickname', result.nickname);
            
            // Также отправляем запрос на сервер, чтобы обновить тему в users.json
            await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: result.nickname, theme: selectedTheme })
            });

            window.location.href = 'chat.html';
        } else {
            showError(errorMessage, loginButton, result.error || 'Authorization failed.');
        }
    } catch (err) {
        showError(errorMessage, loginButton, 'Network error. Server unreachable.');
    }
}

function showError(errorElement, buttonElement, text) {
    if (buttonElement) buttonElement.textContent = isRegisterMode ? "Register" : "Sign In";
    if (errorElement) { errorElement.textContent = text; errorElement.classList.remove('hidden'); }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('auth-password');
    const eyeIcon = document.getElementById('toggle-password-eye');
    
    if (!passwordInput || !eyeIcon) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.opacity = '1'; // Делаем ярче, когда пароль открыт
    } else {
        passwordInput.type = 'password';
        eyeIcon.style.opacity = '0.5'; // Приглушаем, когда скрыт
    }
}