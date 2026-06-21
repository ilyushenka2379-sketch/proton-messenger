let userNickname = '';
let isCurrentUserPremium = false; 
let currentChatId = 'global'; 
let globalUsersCache = []; 

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
    const savedTheme = localStorage.getItem('proton_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const input = document.getElementById('input');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    
    const profileNode = document.getElementById('current-profile-display');
    if(profileNode) {
        const savedAvatar = localStorage.getItem('proton_avatar') || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        profileNode.innerHTML = `
            <span class="avatar-circle" style="background-image: url('${savedAvatar}')"></span>
            <span>${userNickname}</span>
        `;
    }

    initEmojiPicker();
    fetchHistory();
    fetchUsers();
    
    setInterval(fetchHistory, 1500);
    setInterval(fetchUsers, 3000);
    setInterval(sendHeartbeat, 3000);

    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emoji-picker');
        const emojiBtn = document.querySelector('.emoji-btn');
        if (picker && picker.classList.contains('active') && !picker.contains(e.target) && e.target !== emojiBtn) {
            picker.classList.remove('active');
        }
    });
});

async function sendHeartbeat() {
    try {
        await fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: userNickname })
        });
    } catch(e) {}
}

function getPrivateChatId(targetUser) {
    const sorted = [userNickname.toLowerCase(), targetUser.toLowerCase()].sort();
    return `private_${sorted}_${sorted}`;
}

function switchChat(chatId, displayTitle) {
    currentChatId = chatId;
    document.getElementById('chat-header').textContent = chatId === 'global' ? 'Global Chat' : `DM: ${displayTitle}`;
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
        globalUsersCache = await response.json();
        const container = document.getElementById('users-directory');
        if(!container) return;
        
        const me = globalUsersCache.find(u => u.nickname.toLowerCase() === userNickname.toLowerCase());
        if (me) {
            document.documentElement.setAttribute('data-theme', me.theme || 'light');
            document.getElementById('theme-selector').value = me.theme || 'light';
            localStorage.setItem('proton_theme', me.theme || 'light');
            if (me.avatar) localStorage.setItem('proton_avatar', me.avatar);
            
            const avatarUrl = me.avatar ? me.avatar : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            document.getElementById('current-profile-display').innerHTML = `
                <span class="avatar-circle" style="background-image: url('${avatarUrl}')"></span>
                <span>${userNickname}</span>
            `;
        }
        
        container.innerHTML = '';
        globalUsersCache.forEach(user => {
            if(user.nickname.toLowerCase() === userNickname.toLowerCase()) return;
            
            const privateId = getPrivateChatId(user.nickname);
            const item = document.createElement('div');
            item.className = `room-item ${currentChatId === privateId ? 'active' : ''}`;
            item.id = `user-room-${user.nickname}`;
            
            const userAvatar = user.avatar ? user.avatar : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            const statusClass = user.isOnline ? 'online' : '';
            
            item.innerHTML = `
                <span class="avatar-circle" style="background-image: url('${userAvatar}')" onclick="openProfileCard('${user.nickname}', event)"></span>
                <span onclick="switchChat('${privateId}', '${user.nickname}')">${user.nickname}</span>
                <span class="status-dot ${statusClass}"></span>
            `;
            container.appendChild(item);
        });

        document.querySelectorAll('.msg').forEach(msgNode => {
            const authorNode = msgNode.querySelector('.author');
            if (!authorNode) return;
            
            const rawAuthor = authorNode.getAttribute('data-author-name');
            if (!rawAuthor) return;
            
            const userObj = globalUsersCache.find(u => u.nickname.toLowerCase() === rawAuthor.toLowerCase());
            if (userObj && userObj.avatar) {
                const avatarCircle = msgNode.querySelector('.avatar-circle');
                if (avatarCircle) {
                    avatarCircle.style.backgroundImage = `url('${userObj.avatar}')`;
                    avatarCircle.style.backgroundColor = 'transparent';
                }
            }
        });

    } catch(e) { console.error("Users sync stream interrupted:", e); }
}

function initEmojiPicker() {
    const standardGrid = document.getElementById('standard-emojis');
    const premiumGrid = document.getElementById('premium-emojis');
    if (standardGrid) {
        standardGrid.innerHTML = '';
        STANDARD_EMOJIS.forEach(emoji => {
            const span = document.createElement('span'); span.className = 'emoji-item'; span.textContent = emoji;
            span.onclick = () => insertEmoji(emoji, false); standardGrid.appendChild(span);
        });
    }
    if (premiumGrid) {
        premiumGrid.innerHTML = '';
        PREMIUM_EMOJIS_SLOTS.forEach((src, index) => {
            const img = document.createElement('img'); img.className = 'emoji-item premium-slot'; img.src = src;
            img.style.width = '24px'; img.style.height = '24px'; img.style.objectFit = 'contain';
            img.onclick = () => insertEmoji(`[proton_emoji_${index + 1}]`, true); premiumGrid.appendChild(img);
        });
    }
}

function toggleEmojiPicker() { const p = document.getElementById('emoji-picker'); if (p) p.classList.toggle('active'); }
function insertEmoji(e, p) { if (p && !isCurrentUserPremium) { alert('🔒 Premium Only!'); return; } const i = document.getElementById('input'); if (i) { i.value += e; i.focus(); } }

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
            authorMarkup = `<div class="author premium-user" data-author-name="${data.author}" onclick="openProfileCard('${data.author}', event)"><span class="premium-crown">👑</span>${data.author}</div>`;
        } else {
            authorMarkup = `<div class="author" data-author-name="${data.author}" onclick="openProfileCard('${data.author}', event)">${data.author}</div>`;
        }

        const cachedUser = globalUsersCache.find(u => u.nickname.toLowerCase() === data.author.toLowerCase());
        const fallback = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        let avi = fallback;
        let extraStyle = 'background-color: #64748b;'; 

        if (cachedUser && cachedUser.avatar) {
            avi = cachedUser.avatar;
            extraStyle = 'background-color: transparent;';
        }

        const avaImg = `<span class="avatar-circle" style="background-image: url('${avi}'); ${extraStyle}" onclick="openProfileCard('${data.author}', event)"></span>`;
        let contentMarkup = `${avaImg}<div class="msg-body">${authorMarkup}`;

        if (data.text) {
            let textWithImages = data.text;
            for (let i = 1; i <= 7; i++) {
                const marker = `\\[proton_emoji_${i}\\]`;
                let extension = (i === 6 || i === 7) ? 'jpg' : 'png';
                const imgTag = `<img src="emojis/${i}.${extension}" style="width: 32px; height: 32px; display: inline-block; vertical-align: middle; margin: 0 2px;">`;
                textWithImages = textWithImages.replace(new RegExp(marker, 'g'), imgTag);
            }
            contentMarkup += `<div>${textWithImages}</div>`;
        }
        if (data.imageUrl) {
            if (data.imageUrl.includes('data:video/')) {
                contentMarkup += `<video src="${data.imageUrl}" controls style="max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 250px;"></video>`;
            } else if (data.imageUrl.includes('data:audio/')) {
                contentMarkup += `<audio src="${data.imageUrl}" controls style="margin-top: 5px; display: block;"></audio>`;
            } else {
                contentMarkup += `<img class="chat-media" src="${data.imageUrl}" alt="photo">`;
            }
        }
        contentMarkup += `</div>`; 
        item.innerHTML = contentMarkup; 
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
            body: JSON.stringify({ text, imageUrl, author: userNickname, chatId: currentChatId })
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
    
    // ИСПРАВЛЕНО: берем именно первый файл из массива через [0]
    const targetFile = files[0]; 
    
    appendSystemMessage('System status: Processing file stream encoding...');

    const reader = new FileReader();
    reader.onload = function (e) { 
        sendMessage(e.target.result); 
    };
    reader.onerror = function (error) { 
        alert('Upload failed.'); 
    };
    reader.readAsDataURL(targetFile); // ИСПРАВЛЕНО: читаем конкретный файл
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

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('active');
    const me = globalUsersCache.find(u => u.nickname.toLowerCase() === userNickname.toLowerCase());
    if (me && me.avatar) {
        document.getElementById('settings-avatar-preview').style.backgroundImage = `url('${me.avatar}')`;
    } else {
        document.getElementById('settings-avatar-preview').style.backgroundImage = 'none';
    }
}

function closeSettingsModal() { document.getElementById('settings-modal').classList.remove('active'); }

function handleSettingsAvatar(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64 = e.target.result;
        document.getElementById('settings-avatar-preview').style.backgroundImage = `url('${base64}')`;
        localStorage.setItem('proton_avatar', base64);
        await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: userNickname, avatar: base64 })
        });
        fetchUsers();
    };
    reader.readAsDataURL(files);
}

async function handleSettingsTheme(themeValue) {
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('proton_theme', themeValue);
    await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: userNickname, theme: themeValue })
    });
}

function openProfileCard(targetName, event) {
    if (event) event.stopPropagation();
    const user = globalUsersCache.find(u => u.nickname.toLowerCase() === targetName.toLowerCase());
    if (!user) return;

    document.getElementById('view-profile-name').textContent = user.nickname;
    const badge = document.getElementById('view-profile-status');
    badge.textContent = user.isOnline ? 'ONLINE' : 'OFFLINE';
    badge.className = `modal-status-badge ${user.isOnline ? 'online' : ''}`;

    const fallback = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const avi = user.avatar ? user.avatar : fallback;
    document.getElementById('view-profile-avatar').style.backgroundImage = `url('${avi}')`;

    const pmBtn = document.getElementById('view-profile-pm-btn');
    if (user.nickname.toLowerCase() === userNickname.toLowerCase()) {
        pmBtn.style.display = 'none';
    } else {
        pmBtn.style.display = 'block';
        const privateId = getPrivateChatId(user.nickname);
        pmBtn.onclick = () => { closeProfileModal(); switchChat(privateId, user.nickname); };
    }
    document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal() { document.getElementById('profile-modal').classList.remove('active'); }
function closeModal(modalElement, event) { if (event.target === modalElement) modalElement.classList.remove('active'); }
function logout() { localStorage.removeItem('proton_nickname'); localStorage.removeItem('proton_theme'); localStorage.removeItem('proton_avatar'); window.location.href = 'index.html'; }