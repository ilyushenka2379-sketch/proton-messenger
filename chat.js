let userNickname = '';

if (!localStorage.getItem('proton_nickname')) {
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
}

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    fetchHistory();
    setInterval(fetchHistory, 1500);
});

async function fetchHistory() {
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();
        renderMessages(messages);
    } catch (e) { console.error("Sync data transaction error:", e); }
}

function renderMessages(messages) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const currentCount = messagesDiv.children.length;
    if (currentCount === messages.length) return;

    messagesDiv.innerHTML = '';
    messages.forEach((data) => {
        const item = document.createElement('div');
        item.classList.add('msg');
        item.classList.add(data.author === userNickname ? 'my' : 'other');

        let content = `<div class="author">${data.author}</div>`;
        if (data.text) content += `<div>${data.text}</div>`;
        
        // MULTI-MEDIA PAYLOAD RENDERING COMPONENT
        if (data.imageUrl) {
            if (data.imageUrl.includes('data:video/')) {
                content += `<video src="${data.imageUrl}" controls style="max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 250px;"></video>`;
            } else if (data.imageUrl.includes('data:audio/')) {
                // NEW: Dynamic Audio Player Generation
                content += `<audio src="${data.imageUrl}" controls style="margin-top: 5px; display: block;"></audio>`;
            } else {
                content += `<img src="${data.imageUrl}" alt="photo">`;
            }
        }
        
        item.innerHTML = content;
        messagesDiv.appendChild(item);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage(imageUrl = '') {
    const input = document.getElementById('input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, imageUrl, author: userNickname })
        });
        input.value = '';
        fetchHistory();
    } catch (e) { console.error("Datagram package transmission failed:", e); }
}

function uploadImage(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;

    const targetFile = files[0];
    console.log("Converting static media payload array to binary Base64 text string...");
    appendSystemMessage('System status: Processing picture payload stream...');

    const reader = new FileReader();
    reader.onload = function (e) {
        console.log("Conversion successful. Transmitting compressed packet data...");
        sendMessage(e.target.result);
    };
    reader.onerror = function (error) {
        console.error("FileReader processing intercept error:", error);
        alert('Upload failed: File structure streaming conversion error.');
    };
    
    reader.readAsDataURL(targetFile); 
}

// NEW: SECURE VOICE RECORDING CHANNEL LOGIC
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const recordButton = document.getElementById('record-button');
    
    if (!isRecording) {
        // START RECORDING
        audioChunks = [];
        try {
            console.log("Requesting raw secure microphone hardware uplink...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                console.log("Microphone stream stopped. Encoding raw wave chunks to audio data URL...");
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log("Audio payload array stringified successfully. Pushing to datagram packet...");
                    sendMessage(reader.result); // Pushes the sound Base64 string directly into chat pipeline
                };
                reader.readAsDataURL(audioBlob);
                
                // Disconnect microphone hardware line to preserve resources
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            isRecording = true;
            if (recordButton) {
                recordButton.classList.add('recording');
                recordButton.textContent = "🛑";
            }
            console.log("Voice recording stream pipeline successfully active.");
        } catch (err) {
            console.error("Microphone hardware access rejected:", err);
            alert('Hardware block: Microphone access denied. Check your mobile browser permissions!');
        }
    } else {
        // STOP RECORDING
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        if (recordButton) {
            recordButton.classList.remove('recording');
            recordButton.textContent = "🎤";
        }
    }
}

function appendSystemMessage(text) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    const item = document.createElement('div');
    item.style.fontSize = '12px';
    item.style.color = '#888';
    item.textContent = text;
    messagesDiv.appendChild(item);
}

function logout() { 
    localStorage.removeItem('proton_nickname');
    window.location.href = 'index.html';
}