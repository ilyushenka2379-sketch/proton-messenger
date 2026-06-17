// 1. Сначала находим элементы на странице
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');

// 2. Подключаем встроенные веб-сокеты браузера
// Автоматически выбирает ws:// для компьютера и wss:// для интернета
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + window.location.host);


// Проверяем успешное подключение в консоли
socket.onopen = () => {
    console.log('Успешно подключились к серверу Proton напрямую!');
};

// Принимаем новые сообщения от сервера
socket.onmessage = (event) => {
    console.log('Сайт получил сообщение:', event.data);
    const item = document.createElement('div');
    item.classList.add('msg');
    item.textContent = event.data;
    messagesDiv.appendChild(item);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Скролл вниз
};

// Функция отправки текста
function sendMessage() {
    if (!input) return; // Защита от ошибок
    const text = input.value.trim();
    if (text && socket.readyState === WebSocket.OPEN) {
        socket.send(text); // Отправляем строку на сервер
        input.value = ''; // Очищаем поле
    }
}

// Отправка по кнопке Enter
if (input) {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}
