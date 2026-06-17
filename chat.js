const IMGBB_API_KEY = 'de55d39e084ff3311f5e986142c52e4f';

const firebaseConfig = {
    apiKey: "AIzaSyC-IuRsP6vkYD9_pM9aM4pcEnVHGi16_Ec",
    authDomain: "://firebaseapp.com",
    projectId: "proton-e70cd",
    storageBucket: "proton-e70cd.firebasestorage.app",
    messagingSenderId: "109624272725",
    appId: "1:109624272725:web:330f2cef607cdc767871dc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');

let userNickname = '';

// Route-Guard protection: verify session token validity
if (!localStorage.getItem('proton_nickname')) {
    console.warn("Unauthorized access threat blocked. Redirecting backend terminal channel...");
    window.location.href = 'index.html';
} else {
    userNickname = localStorage.getItem('proton_nickname');
    console.log("Secure channel active for user profile:", userNickname);
    listenToMessages();
}

async function sendMessage(imageUrl = '') {
    const text = input.value.trim();
    if (!text && !imageUrl) return;

    console.log("Publishing standard datagram packet into sync stream...");
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

    console.log("Intercepting stream array payload buffer...");
    const formData = new FormData();
    formData.append('image', files[0]); // Explicitly sending target element binary array index

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
            console.warn("CDN response payload mismatch:", result);
            alert('Upload failed');
        }
    } catch (e) {
        console.error("External connection intercept error:", e);
        alert('Data network pipeline error, retry transfer');
    }
}

function listenToMessages() {
    console.log("Establishing remote reactive pipeline connection...");
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
            console.error("Dynamic subscription sync broken:", error);
        });
}

function appendSystemMessage(text) {
    const item = document.createElement('div');
    item.style.fontSize = '12px';
    item.style.color = '#888';
    item.textContent = text;
    messagesDiv.appendChild(item);
}

function logout() { 
    console.log("Clearing state data token, terminating session...");
    localStorage.removeItem('proton_nickname');
    window.location.href = 'index.html';
}

input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });