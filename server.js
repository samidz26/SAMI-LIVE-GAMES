const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تقديم الملفات الثابتة (وضع ملف index.html في نفس المجلد)
app.use(express.static(__dirname));

let tiktokLiveConnection = null;
const avatarCache = new Map();

// دالة استخراج صورة البروفايل الاحترافية من تيك توك
function extractAvatar(data) {
    const user = data?.user || {};
    const sources = [
        user.profilePictureUrl,
        user.avatarThumb,
        user.avatarMedium,
        user.avatarLarge,
        user.avatarJpg,
        data?.profilePictureUrl,
        data?.avatarThumb,
        data?.avatarMedium,
        data?.avatarLarge
    ];

    for (const source of sources) {
        if (!source) continue;
        if (typeof source === "string" && source.trim() !== "") {
            return source;
        }
        if (typeof source === "object") {
            if (Array.isArray(source.urlList)) {
                const url = source.urlList.find(item => typeof item === "string" && item.startsWith("http"));
                if (url) return url;
            }
            if (Array.isArray(source.urls)) {
                const url = source.urls.find(item => typeof item === "string" && item.startsWith("http"));
                if (url) return url;
            }
            if (typeof source.url === "string" && source.url.startsWith("http")) {
                return source.url;
            }
        }
    }
    return "";
}

io.on('connection', (socket) => {
    console.log('Client connected to UI');

    socket.on('connect_tiktok', (username) => {
        if (tiktokLiveConnection) {
            try { tiktokLiveConnection.disconnect(); } catch(e){}
        }

        tiktokLiveConnection = new TikTokLiveConnection(username, {
            processInitialData: true,
            fetchRoomInfoOnConnect: true
        });

        tiktokLiveConnection.connect().then(state => {
            console.log(`Connected to TikTok Live: ${username}, Room ID: ${state.roomId}`);
            socket.emit('tiktok_connected', { success: true, roomInfo: state.roomInfo });
        }).catch(err => {
            console.error('Failed to connect to TikTok Live', err);
            socket.emit('tiktok_connected', { success: false, error: err.message });
        });

        // الاستماع للتعليقات في البث
        tiktokLiveConnection.on(WebcastEvent.CHAT, data => {
            const rawComment = data.comment || data.content || '';
            const comment = typeof rawComment === 'string' ? rawComment.trim().toLowerCase() : '';
            
            const tikUser = data.user || {};
            const uniqueId = tikUser.uniqueId || tikUser.displayId || data.uniqueId || 'unknown';
            const nickname = tikUser.nickname || data.nickname || 'مستخدم';

            let avatar = extractAvatar(data);
            if (!avatar && uniqueId && avatarCache.has(uniqueId)) {
                avatar = avatarCache.get(uniqueId);
            }
            if (avatar && uniqueId) {
                avatarCache.set(uniqueId, avatar);
            }

            const user = {
                uniqueId: uniqueId,
                nickname: nickname,
                profilePictureUrl: avatar
            };

            console.log(`[CHAT] ${user.uniqueId} (${user.nickname}): ${comment}`);

            // إرسال التعليق للواجهة الأمامية لكي تتفاعل اللعبة تلقائياً مع إجابات المتابعين
            io.emit('tiktok_comment', { user, comment });
        });

        tiktokLiveConnection.on(ControlEvent.ERROR, err => {
            console.error('TikTok Live Error:', err);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
