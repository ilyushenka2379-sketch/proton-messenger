let userNickname = '';
let isCurrentUserPremium = false; 
let currentChatId = 'global'; 

if (!localStorage.getItem('proton_nickname')) {
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
}

const STANDARD_EMOJIS = ['😀', '😂', '🥰', '👍', '🔥', '🎉', '💩', '👀', '💯', '❤️', '🚀', '💻'];
const PREMIUM_EMOJIS_SLOTS = [
    'emojis/1.png', 'emojis/2.png', 'emojis/3.png', 'emojis/4.png', 
    'emojis/5.png', 'emojis/6.jpg', 'emojis/7.jpg'
];

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    
    const profileNode = document.getElementById('current-profile-display');
    if(profileNode) profileNode.textContent = `Logged in as: ${userNickname}`;

    initEmojiPicker();

    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emoji-picker');
        const emojiBtn = document.querySelector('.emoji-btn');
        if (picker && picker.classList.contains('active') && !picker.contains(e.target) && e.target !== emojiBtn) {
            picker.classList.remove('active');
        }
    });

    fetchHistory();
    fetchUsers();
    
    setInterval(fetchHistory, 1500);
    setInterval(fetchUsers, 5000); 
});

function getPrivateChatId(targetUser) {
    const sorted = [userNickname.toLowerCase(), targetUser.toLowerCase()].sort();
    return `private_${sorted[0]}_${sorted[1]}`;
}

function switchChat(chatId, displayTitle) {
    currentChatId = chatId;
    document.getElementById('chat-header').textContent = chatId === 'global' ? '🌍 Global Chat' : `👤 ${displayTitle}`;
    
    document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
    
    if(chatId === 'global') {
        document.getElementById('room-global').classList.add('active');
    } else {
        const targetElement = document.getElementById(`user-room-${displayTitle}`);
        if(targetElement) targetElement.classList.add('active');
    }
    
    const messagesDiv = document.getElementById('messages');
    if(messagesDiv) messagesDiv.innerHTML = '';
    
    fetchHistory();
}

async function fetchUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const container = document.getElementById('users-directory');
        if(!container) return;
        
        container.innerHTML = '';
        users.forEach(user => {
            if(user.nickname.toLowerCase() === userNickname.toLowerCase()) return;
            
            const privateId = getPrivateChatId(user.nickname);
            const item = document.createElement('div');
            item.className = `room-item ${currentChatId === privateId ? 'active' : ''}`;
            item.id = `user-room-${user.nickname}`;
            item.innerHTML = `👤 ${user.nickname}`;
            
            item.onclick = () => switchChat(privateId, user.nickname);
            container.appendChild(item);
        });
    } catch(e) { console.error("Users sync stream interrupted:", e); }
}

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
    if (input) { input.value += emoji; input.focus(); }
}

async function fetchHistory() {
    try {
        const response = await fetch(`/api/messages?chatId=${currentChatId}`);
        const messages = await response.json();
        
        const myLastMsg = [...messages].reverse().find(m => m.author === userNickname);
        if (myLastMsg) {
            isCurrentUserPremium = myLastMsg.isPremium;
        } else {
            if(userNickname.toLowerCase() === 'gdlyuha103') isCurrentUserPremium = true;
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
            authorMarkup = `<div class="author premium-user" onclick="openPM('${data.author}')"><span class="premium-crown">👑</span>${data.author}</div>`;
        } else {
            authorMarkup = `<div class="author" onclick="openPM('${data.author}')">${data.author}</div>`;
        }
        
        let content = authorMarkup;

        if (data.text) {
            let textWithImages = data.text;
            for (let i = 1; i <= 7; i++) {
                const marker = `\\[proton_emoji_${i}\\]`;
                let extension = (i === 6 || i === 7) ? 'jpg' : 'png';
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

function openPM(targetNickname) {
    if(targetNickname.toLowerCase() === userNickname.toLowerCase()) return;
    const privateId = getPrivateChatId(targetNickname);
    switchChat(privateId, targetNickname);
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
            body: JSON.stringify({ 
                text, 
                imageUrl, 
                author: userNickname,
                chatId: currentChatId 
            })
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
    appendSystemMessage('System status: Processing file stream encoding...');

    const reader = new FileReader();
    reader.onload = function (e) { sendMessage(e.target.result); };
    reader.onerror = function (error) { alert('Upload failed.'); };
    reader.readAsDataURL(targetFile); 
}

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const btn = document.getElementById('record-button');
    if (!isRecording) {
        audioChunks = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const r = new FileReader();
                r.onloadend = () => sendMessage(r.result);
                r.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start(); isRecording = true;
            if (btn) { btn.classList.add('recording'); btn.textContent = "STOP"; }
        } catch (err) { alert('Microphone access denied.'); }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        isRecording = false;
        if (btn) { btn.classList.remove('recording'); btn.textContent = "REC"; }
    }
}