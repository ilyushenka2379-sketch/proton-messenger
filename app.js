const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');

// Автоматически выбирает ws:// для компьютера и wss:// для интернета
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + window.location.host);

socket.onopen = () => {
    console.log('Успешно подключились к серверу Proton напрямую!');
};

// Функция отрисовки одного сообщения на экране
function appendMessage(text) {
    const item = document.createElement('div');
    item.classList.add('msg');
    item.textContent = text;
    messagesDiv.appendChild(item);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Скролл вниз
}

// Принимаем данные от сервера
socket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    console.log('Сайт получил пакет:', response);

    if (response.type === 'history') {
        // Если прилетела история — очищаем экран и выводим старые сообщения
        messagesDiv.innerHTML = '';
        response.data.forEach(msg => appendMessage(msg.text));
    } else if (response.type === 'message') {
        // Если прилетело новое живое сообщение — просто добавляем его в конец
        appendMessage(response.data);
    }
};

// Функция отправки текста
function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (text && socket.readyState === WebSocket.OPEN) {
        socket.send(text); // Пуляем строку
        input.value = '';
    }
}

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
