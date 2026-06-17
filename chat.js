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

    console.log("Transmitting raw file payload to proton local kernel storage area...");
    const formData = new FormData();
    formData.append('image', files); // Target specific direct item index safely

    try {
        appendSystemMessage('System status: Uploading picture to local space, wait...');
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            console.log("Local cluster image proxy allocation done:", result.url);
            sendMessage(result.url);
        } else { 
            alert('Core system file upload rejected.'); 
        }
    } catch (e) { 
        console.error("Local upload stream failure:", e);
        alert('Upload failed: Internal kernel space transmission error.'); 
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