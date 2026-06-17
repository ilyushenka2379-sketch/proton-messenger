const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';
let userNickname = '';

if (!localStorage.getItem('proton_nickname')) {
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
}

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    if (input) {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }
    // Start continuous remote message pooling sync channel
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
    
    // Check if view update is actually required to save resources
    const currentCount = messagesDiv.children.length;
    if (currentCount === messages.length) return;

    messagesDiv.innerHTML = '';
    messages.forEach((data) => {
        const item = document.createElement('div');
        item.classList.add('msg');
        item.classList.add(data.author === userNickname ? 'my' : 'other');

        let content = `<div class="author">${data.author}</div>`;
        if (data.text) content += `<div>${data.text}</div>`;
        if (data.imageUrl) content += `<img src="${data.imageUrl}" alt="photo">`;
        
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

async function uploadImage(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;

    console.log("Processing image binary stream array payload...");
    const formData = new FormData();
    
    // CRITICAL FIX: Explicitly targeting the first file file[0] inside the payload
    formData.append('image', files[0]);

    try {
        appendSystemMessage('System status: Uploading picture, please wait...');
        const response = await fetch(`https://imgbb.com{IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            console.log("Image payload deployed to CDN host:", result.data.url);
            sendMessage(result.data.url);
        } else {
            console.warn("CDN payload rejected:", result);
            alert('Upload aborted: Hosting service rejected this image format.');
        }
    } catch (e) {
        console.error("Pipeline uplink upload error:", e);
        alert('Upload failed: Data network pipeline transfer error.');
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