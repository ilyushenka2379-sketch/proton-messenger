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
        
        // DYNAMIC MEDIA SNAPSHOT INTERCEPTOR
        if (data.imageUrl) {
            // Check if the Base64 data string contains a video format descriptor
            if (data.imageUrl.includes('data:video/')) {
                content += `<video src="${data.imageUrl}" controls style="max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 250px;"></video>`;
            } else {
                // Otherwise, treat it as a standard static image (including .webp, .png, .jpg)
                content += `<img src="${data.imageUrl}" alt="photo">`;
            }
        }
        
        item.innerHTML = content;
        messagesDiv.appendChild(item);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}