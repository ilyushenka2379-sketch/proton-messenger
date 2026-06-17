const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';

const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

let db;
let userNickname = '';

if (!localStorage.getItem('proton_nickname')) {
    console.warn("Session token missing. Route-Guard activated. Redirecting back...");
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
}

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('input');
    
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Chat system connected to secure pipeline for profile:", userNickname);
        listenToMessages();
        
        if (input) {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
        }
    }
});

async function sendMessage(imageUrl = '') {
    const input = document.getElementById('input');
    if (!input || !db) return;
    
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    console.log("Pushing message payload to secure document tree...");
    await db.collection('messages').add({
        text: text,
        imageUrl: imageUrl,
        author: userNickname,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
}

async function uploadImage(inputElement) {
    const files = inputElement.files;
    if (!files || files.length === 0) return;

    console.log("Parsing image input payload streaming buffer...");
    const formData = new FormData();
    formData.append('image', files[0]); // Strictly sending target direct element index

    try {
        appendSystemMessage('System status: Uploading picture, please wait...');
        const response = await fetch(`https://imgbb.com{IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            console.log("Media array snapshot synced to proxy host CDN:", result.data.url);
            sendMessage(result.data.url);
        } else {
            console.warn("CDN response payload error:", result);
            alert('Hosting service error');
        }
    } catch (e) {
        console.error("Data pipeline broken:", e);
        alert('Upload transfer channel error, please retry');
    }
}

function listenToMessages() {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv || !db) return;

    console.log("Opening remote reactive dynamic sync channel...");
    db.collection('messages').orderBy('timestamp', 'asc').limitToLast(50)
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                item.classList.add('msg');
                
                if (data.author === userNickname) {
                    item.classList.add('my');
                } else {
                    item.classList.add('other');
                }

                let content = `<div class="author">${data.author}</div>`;
                if (data.text) content += `<div>${data.text}</div>`;
                if (data.imageUrl) content += `<img src="${data.imageUrl}" alt="photo">`;
                
                item.innerHTML = content;
                messagesDiv.appendChild(item);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, (error) => {
            console.error("Remote stream sync dropped:", error);
        });
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
    console.log("Clearing access keys, closing tunnel...");
    localStorage.removeItem('proton_nickname');
    window.location.href = 'index.html';
}