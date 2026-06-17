const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');

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
        // Если пришла обычная строка
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

// --- ИСПРАВЛЕННАЯ ЛОГИКА ЗВОНКОВ ---
let localStream;
let peerConnection;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');

// ТОЧНЫЙ АДРЕС СЕРВЕРА GOOGLE БЕЗ ОПЕЧАТОК:
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
            });
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
        if (remoteVideo) remoteVideo.srcObject = event.streams[0];
    };
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
    if (callBtn) callBtn.style.display = 'none';
    if (hangupBtn) hangupBtn.style.display = 'inline-block';
}

async function startCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) localVideo.srcObject = localStream;
        setupPeerConnection();
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'call-signal', sdp: offer }));
    } catch (err) {
        alert('Ошибка камеры: ' + err.message);
    }
}

function hangUp() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    peerConnection = null;
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    if (callBtn) callBtn.style.display = 'inline-block';
    if (hangupBtn) hangupBtn.style.display = 'none';
}