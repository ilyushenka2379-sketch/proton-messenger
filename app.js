const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');

// 1. НАСТРОЙКА БЕЗОПАСНЫХ СОКЕТОВ ДЛЯ ИНТЕРНЕТА (WSS)
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + window.location.host);

socket.onopen = () => {
    console.log('Успешно подключились к серверу Proton напрямую!');
};

function appendMessage(text) {
    const item = document.createElement('div');
    item.classList.add('msg');
    item.textContent = text;
    messagesDiv.appendChild(item);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.onmessage = (event) => {
    try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'history') {
            messagesDiv.innerHTML = '';
            parsed.data.forEach(msg => appendMessage(msg.text));
            return;
        } else if (parsed.type === 'message') {
            appendMessage(parsed.data);
            return;
        } else if (parsed.type === 'call-signal') {
            handleCallSignal(parsed);
            return;
        }
    } catch (e) {
        appendMessage(event.data);
    }
};

function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (text && socket.readyState === WebSocket.OPEN) {
        socket.send(text);
        input.value = '';
    }
}

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// --- ЖЕЛЕЗОБЕТОННАЯ ЛОГИКА ВИДЕОЗВОНКОВ ---
let localStream;
let peerConnection;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');

const rtcConfig = { iceServers: [{ urls: 'stun:://google.com' }] };

function handleCallSignal(message) {
    if (!peerConnection) setupPeerConnection();
    if (message.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
            .then(() => {
                if (peerConnection.remoteDescription.type === 'offer') {
                    peerConnection.createAnswer().then(answer => {
                        peerConnection.setLocalDescription(answer);
                        socket.send(JSON.stringify({ type: 'call-signal', sdp: answer }));
                    });
                }
            }).catch(e => console.error(e));
    } else if (message.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(e => {});
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'call-signal', candidate: event.candidate }));
        }
    };
    peerConnection.ontrack = (event) => {
        if (remoteVideo && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
}

async function startCall() {
    // Кнопка сброса появляется МОМЕНТАЛЬНО, чтобы интерфейс не зависал
    if (callBtn) callBtn.style.display = 'none';
    if (hangupBtn) hangupBtn.style.display = 'inline-block';

    try {
        // Запрашиваем медиапотоки у смартфона
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) localVideo.srcObject = localStream;
    } catch (err) {
        console.warn('Камера недоступна, пробуем только микрофон...', err);
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (localVideo) localVideo.srcObject = localStream;
        } catch (err2) {
            alert('Браузер заблокировал доступ к камере/микрофону! Пожалуйста, нажмите на иконку замочка в адресной строке браузера телефона и разрешите камере работать.');
            hangUp();
            return;
        }
    }

    setupPeerConnection();

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'call-signal', sdp: offer }));
    } catch (e) {
        console.error(e);
    }
}

function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    if (callBtn) callBtn.style.display = 'inline-block';
    if (hangupBtn) hangupBtn.style.display = 'none';
    
    // Перезагружаем сокет-соединение для очистки сигналов звонка
    window.location.reload();
}