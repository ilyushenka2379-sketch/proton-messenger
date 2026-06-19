let userNickname = '';
let isCurrentUserPremium = false; 

if (!localStorage.getItem('proton_nickname')) {
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
}

// Lists of available emojis
const STANDARD_EMOJIS = ['😀', '😂', '🥰', '👍', '🔥', '🎉', '💩', '👀', '💯', '❤️', '🚀', '💻'];

// Array of 7 custom emoji file paths (6 and 7 are jpg, others are png)
const PREMIUM_EMOJIS_SLOTS = [
    'emojis/1.png', 'emojis/2.png', 'emojis/3.png', 'emojis/4.png', 
    'emojis/5.png', 'emojis/6.jpg', 'emojis/7.jpg'
];

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    
    initEmojiPicker();

    // Close picker when clicking outside form elements
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emoji-picker');
        const emojiBtn = document.querySelector('.emoji-btn');
        if (picker && picker.classList.contains('active') && !picker.contains(e.target) && e.target !== emojiBtn) {
            picker.classList.remove('active');
        }
    });

    fetchHistory();
    setInterval(fetchHistory, 1500);
});

function initEmojiPicker() {
    const standardGrid = document.getElementById('standard-emojis');
    const premiumGrid = document.getElementById('premium-emojis');
    
    if (standardGrid) {
        standardGrid.innerHTML = '';
        STANDARD_EMOJIS.forEach(emoji => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = emoji;
            span.onclick = () => insertEmoji(emoji, false);
            standardGrid.appendChild(span);
        });
    }

    if (premiumGrid) {
        premiumGrid.innerHTML = '';
        PREMIUM_EMOJIS_SLOTS.forEach((src, index) => {
            const img = document.createElement('img');
            img.className = 'emoji-item premium-slot';
            img.src = src;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.objectFit = 'contain';
            // Inserts text token like [proton_emoji_1] on action click
            img.onclick = () => insertEmoji(`[proton_emoji_${index + 1}]`, true);
            premiumGrid.appendChild(img);
        });
    }
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.classList.toggle('active');
}

function insertEmoji(emoji, isPremiumEmoji) {
    if (isPremiumEmoji && !isCurrentUserPremium) {
        alert('🔒 This emoji is exclusive to Proton Premium users!');
        return;
    }

    const input = document.getElementById('input');
    if (input) {
        input.value += emoji;
        input.focus();
    }
}

async function fetchHistory() {
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();
        
        // Scan latest payload array package from current user to find true sync data flag
        const myLastMsg = [...messages].reverse().find(m => m.author === userNickname);
        if (myLastMsg) {
            isCurrentUserPremium = myLastMsg.isPremium;
        } else {
            if(userNickname.toLowerCase() === 'GDlyuha103') isCurrentUserPremium = true;
        }

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

        let authorMarkup = '';
        if (data.isPremium) {
            authorMarkup = `<div class="author premium-user"><span class="premium-crown">👑</span>${data.author}</div>`;
        } else {
            authorMarkup = `<div class="author">${data.author}</div>`;
        }
        
        let content = authorMarkup;

        if (data.text) {
            let textWithImages = data.text;
            
            // Loop parses text string tokens to inject visual inline images (supporting 6 and 7 as jpg)
            for (let i = 1; i <= 7; i++) {
                const marker = `\\[proton_emoji_${i}\\]`;
                let extension = 'png';
                if (i === 6 || i === 7) {
                    extension = 'jpg';
                }
                const imgTag = `<img src="emojis/${i}.${extension}" style="width: 32px; height: 32px; display: inline-block; vertical-align: middle; margin: 0 2px;">`;
                textWithImages = textWithImages.replace(new RegExp(marker, 'g'), imgTag);
            }
            content += `<div>${textWithImages}</div>`;
        }
        
        if (data.imageUrl) {
            if (data.imageUrl.includes('data:video/')) {
                content += `<video src="${data.imageUrl}" controls style="max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 250px;"></video>`;
            } else if (data.imageUrl.includes('data:audio/')) {
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
        
        const picker = document.getElementById('emoji-picker');
        if (picker) picker.classList.remove('active');
        
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

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const recordButton = document.getElementById('record-button');
    
    if (!isRecording) {
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
                    sendMessage(reader.result);
                };
                reader.readAsDataURL(audioBlob);
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