// --- ЛОГИКА ВИДЕОЗВОНКОВ (WebRTC) ---
let localStream;
let peerConnection;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');

// Стандартные бесплатные сервера от Google, чтобы устройства нашли друг друга через интернет
const rtcConfig = { iceServers: [{ urls: 'stun:://google.com' }] };

// Перехватываем сигналы звонка от сервера
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
            });
    } else if (message.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
}

// Настройка прямого соединения между браузерами
function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Отправляем свои сетевые координаты собеседнику
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'call-signal', candidate: event.candidate }));
        }
    };

    // Как только видеопоток от собеседника пойман — выводим на большой экран
    peerConnection.ontrack = (event) => {
        if (remoteVideo) remoteVideo.srcObject = event.streams[0];
    };

    // Добавляем наше видео в поток для отправки
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
    
    if (callBtn) callBtn.style.display = 'none';
    if (hangupBtn) hangupBtn.style.display = 'inline-block';
}

// Функция нажатия кнопки "Позвонить"
async function startCall() {
    try {
        // Запрашиваем доступ к камере и микрофону смартфона/ПК
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) localVideo.srcObject = localStream;

        setupPeerConnection();

        // Создаем предложение о звонке (Offer) и шлем его через сервер
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'call-signal', sdp: offer }));
    } catch (err) {
        alert('Не удалось включить камеру/микрофон: ' + err.message);
    }
}

// Функция завершения звонка
function hangUp() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    peerConnection = null;
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    if (callBtn) callBtn.style.display = 'inline-block';
    if (hangupBtn) hangupBtn.style.display = 'none';
}

// Модифицируем старый приемщик сообщений, чтобы он ловил технические сигналы звонка
const originalOnMessage = socket.onmessage;
socket.onmessage = (event) => {
    try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'call-signal') {
            handleCallSignal(parsed);
            return;
        }
    } catch (e) {}
    
    // Если это не сигнал звонка, отдаем управление старому коду чата
    if (originalOnMessage) originalOnMessage(event);
};