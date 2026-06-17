wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Пользователь успешно подключился к Proton! 🎉');

    const history = loadHistory();
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (message) => {
        const textMessage = message.toString();
        
        try {
            // Проверяем, это обычный текст или сложный технический сигнал для звонка
            const parsed = JSON.parse(textMessage);
            if (parsed.type === 'call-signal') {
                // Пересылаем сигнал звонка ВСЕМ остальным участникам чата
                for (let client of clients) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(textMessage);
                    }
                }
                return;
            }
        } catch (e) {
            // Если это не JSON (обычная строка), значит это текстовое сообщение в чат
        }

        console.log('Новое сообщение в чате:', textMessage);
        saveToHistory(textMessage);
        
        for (let client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'message', data: textMessage }));
            }
        }
    });

    ws.on('close', () => clients.delete(ws));
});