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
}

async function startCall() {
    // Включаем кнопки СРАЗУ, чтобы можно было сбросить, даже если камера зависла
    if (callBtn) callBtn.style.display = 'none';
    if (hangupBtn) hangupBtn.style.display = 'inline-block';

    try {
        // Пробуем включить и камеру, и звук
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
        console.log('Не удалось включить всё сразу, пробуем только аудио...', err);
        try {
            // Если не вышло (например, нет камеры на ПК), пробуем только микрофон
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err2) {
            alert('Ошибка: Браузер заблокировал доступ к камере и микрофону. Проверьте разрешения в настройках телефона/ПК!');
            hangUp();
            return;
        }
    }

    // Если поток успешно получен, выводим его на экран
    if (localVideo && localStream) localVideo.srcObject = localStream;
    
    setupPeerConnection();
    
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'call-signal', sdp: offer }));
    } catch (e) {
        console.error('Ошибка создания оффера:', e);
    }
}