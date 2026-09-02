import express from "express";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let connection = null;
let clients = [];


// ========================================
// إرسال الأحداث إلى جميع صفحات العرض
// ========================================

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;

    clients = clients.filter((client) => {
        try {
            client.write(message);
            return true;
        } catch {
            return false;
        }
    });
}


// ========================================
// استخراج بيانات المستخدم
// ========================================

function extractUser(data) {

    const user =
        data?.user ||
        data?.userInfo ||
        data?.member ||
        data ||
        {};

    const uniqueId =
        data?.uniqueId ||
        data?.unique_id ||
        user?.uniqueId ||
        user?.unique_id ||
        user?.uniqueIdStr ||
        "";

    const nickname =
        data?.nickname ||
        user?.nickname ||
        data?.displayName ||
        user?.displayName ||
        uniqueId ||
        "مشاهد";

    const avatar =
        data?.profilePictureUrl ||
        data?.profilePicture?.url?.[0] ||
        data?.avatarThumb?.urlList?.[0] ||
        data?.avatarLarger?.urlList?.[0] ||
        user?.profilePictureUrl ||
        user?.profilePicture?.url?.[0] ||
        user?.avatarThumb?.urlList?.[0] ||
        user?.avatarLarger?.urlList?.[0] ||
        "";

    return {
        name: nickname,
        username: uniqueId,
        avatar: avatar
    };
}


// ========================================
// الصفحة الرئيسية
// ========================================

app.get("/", (req, res) => {

    res.send(`

<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>SAMI LIVE GAMES</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    min-height: 100vh;

    background:
        radial-gradient(
            circle at center,
            #292929,
            #0d0d0d
        );

    color: white;

    font-family: Arial, sans-serif;

    display: flex;

    justify-content: center;

    align-items: center;

    text-align: center;

}

.container {

    width: 92%;

    max-width: 500px;

}

#connectPage {
    display: block;
}

#livePage {
    display: none;
}

.logo {

    font-size: 34px;

    font-weight: bold;

    margin-bottom: 15px;

}

.subtitle {

    font-size: 18px;

    opacity: .7;

    margin-bottom: 30px;

}

input {

    width: 100%;

    padding: 17px;

    border: none;

    outline: none;

    border-radius: 14px;

    font-size: 18px;

    text-align: center;

    margin-bottom: 15px;

}

button {

    width: 100%;

    padding: 17px;

    border: none;

    border-radius: 14px;

    background: #ff0050;

    color: white;

    font-size: 20px;

    font-weight: bold;

    cursor: pointer;

}

button:disabled {
    opacity: .6;
}

#status {

    margin-top: 20px;

    min-height: 25px;

}

.liveTitle {

    font-size: 30px;

    font-weight: bold;

    margin-bottom: 10px;

}

.liveStatus {

    opacity: .7;

    margin-bottom: 35px;

}

.viewer {

    min-height: 320px;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

}

.avatar {

    width: 190px;

    height: 190px;

    border-radius: 50%;

    object-fit: cover;

    border: 5px solid white;

    background: #222;

}

.viewerName {

    margin-top: 20px;

    font-size: 30px;

    font-weight: bold;

}

.viewerUsername {

    margin-top: 8px;

    opacity: .6;

    direction: ltr;

}

.waiting {

    font-size: 22px;

    opacity: .65;

}

</style>

</head>

<body>


<div class="container">


<!-- ============================= -->
<!-- صفحة الاتصال -->
<!-- ============================= -->

<div id="connectPage">

    <div class="logo">
        🎮 SAMI LIVE GAMES
    </div>

    <div class="subtitle">
        الاتصال بـ TikTok LIVE
    </div>

    <input
        id="username"
        placeholder="اسم مستخدم TikTok"
        autocomplete="off"
    >

    <button
        id="connectButton"
        onclick="connectTikTok()"
    >
        🔴 اتصال باللايف
    </button>

    <div id="status"></div>

</div>


<!-- ============================= -->
<!-- صفحة العرض -->
<!-- ============================= -->

<div id="livePage">

    <div class="liveTitle">
        🔴 TikTok LIVE
    </div>

    <div
        id="liveStatus"
        class="liveStatus"
    >
        جاري الاتصال...
    </div>

    <div
        id="viewer"
        class="viewer"
    >

        <div class="waiting">
            👀 في انتظار دخول شخص...
        </div>

    </div>

</div>


</div>


<script>


// ========================================
// متغير اتصال الأحداث
// ========================================

let eventSource = null;


// ========================================
// فتح قناة الأحداث
// ========================================

function startEvents() {

    console.log("Opening SSE connection...");

    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource("/events");


    eventSource.onopen = function() {

        console.log(
            "✅ SSE connected"
        );

    };


    eventSource.onmessage = function(event) {

        console.log(
            "📥 SSE MESSAGE:",
            event.data
        );


        try {

            const data =
                JSON.parse(event.data);


            console.log(
                "EVENT DATA:",
                data
            );


            if (
                data.type === "viewer" &&
                data.viewer
            ) {

                console.log(
                    "👤 NEW VIEWER:",
                    data.viewer
                );


                showViewer(
                    data.viewer
                );

            }

        }

        catch (error) {

            console.error(
                "❌ SSE parse error:",
                error
            );

        }

    };


    eventSource.onerror = function(error) {

        console.log(
            "⚠️ SSE connection error",
            error
        );

    };

}


// ========================================
// الاتصال بـ TikTok
// ========================================

async function connectTikTok() {


    const usernameInput =
        document.getElementById(
            "username"
        );


    const status =
        document.getElementById(
            "status"
        );


    const button =
        document.getElementById(
            "connectButton"
        );


    let username =
        usernameInput.value.trim();


    if (!username) {

        status.textContent =
            "⚠️ اكتب اسم مستخدم TikTok";

        return;

    }


    username =
        username.replace(
            /^@/,
            ""
        );


    button.disabled = true;


    status.textContent =
        "⏳ جاري الاتصال باللايف...";


    // ====================================
    // مهم جداً
    // نفتح SSE قبل TikTok
    // ====================================

    startEvents();


    try {


        const response =
            await fetch(
                "/connect",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username
                        })

                }
            );


        const result =
            await response.json();


        console.log(
            "CONNECT RESULT:",
            result
        );


        if (!result.success) {

            button.disabled = false;

            status.textContent =
                "❌ فشل الاتصال: " +
                result.message;

            return;

        }


        // =================================
        // إظهار صفحة العرض
        // =================================

        document.getElementById(
            "connectPage"
        ).style.display = "none";


        document.getElementById(
            "livePage"
        ).style.display = "block";


        document.getElementById(
            "liveStatus"
        ).textContent =
            "🟢 متصل بـ @" +
            username;


    }

    catch (error) {

        console.error(
            "CONNECT ERROR:",
            error
        );


        button.disabled = false;


        status.textContent =
            "❌ حدث خطأ أثناء الاتصال";

    }

}


// ========================================
// عرض الشخص
// ========================================

function showViewer(viewer) {


    const container =
        document.getElementById(
            "viewer"
        );


    container.innerHTML = "";


    // ====================================
    // الصورة
    // ====================================

    if (viewer.avatar) {


        const image =
            document.createElement(
                "img"
            );


        image.className =
            "avatar";


        image.src =
            viewer.avatar;


        image.alt =
            viewer.name ||
            "مشاهد";


        image.onerror =
            function() {

                console.log(
                    "❌ Avatar failed:",
                    viewer.avatar
                );

            };


        container.appendChild(
            image
        );

    }


    // ====================================
    // الاسم
    // ====================================

    const name =
        document.createElement(
            "div"
        );


    name.className =
        "viewerName";


    name.textContent =
        viewer.name ||
        "مشاهد";


    container.appendChild(
        name
    );


    // ====================================
    // username
    // ====================================

    if (viewer.username) {


        const username =
            document.createElement(
                "div"
            );


        username.className =
            "viewerUsername";


        username.textContent =
            "@" +
            viewer.username;


        container.appendChild(
            username
        );

    }

}


// ========================================
// تشغيل SSE فور فتح الصفحة
// ========================================

// مهم:
// القناة تفتح من البداية حتى لا نفقد
// حدث دخول المشاهد أثناء الاتصال.

startEvents();

</script>


</body>

</html>

    `);

});


// ========================================
// الاتصال بـ TikTok
// ========================================

app.post("/connect", async (req, res) => {

    try {


        let username =
            String(
                req.body.username || ""
            ).trim();


        username =
            username.replace(
                /^@/,
                ""
            );


        if (!username) {

            return res.json({

                success: false,

                message:
                    "اسم المستخدم فارغ"

            });

        }


        // =================================
        // إغلاق الاتصال السابق
        // =================================

        if (connection) {

            try {

                await connection.disconnect();

            }

            catch (error) {

                console.log(
                    "Previous connection close error:",
                    error.message
                );

            }

            connection = null;

        }


        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "🔴 NEW TIKTOK CONNECTION"
        );
        console.log(
            "Username:",
            username
        );
        console.log(
            "================================"
        );


        // =================================
        // إنشاء الاتصال
        // =================================

        connection =
            new TikTokLiveConnection(
                username,
                {
                    processInitialData: false
                }
            );


        // =================================
        // MEMBER
        // دخول شخص إلى اللايف
        // =================================

        connection.on(
            WebcastEvent.MEMBER,
            (data) => {


                console.log("");
                console.log(
                    "================================"
                );
                console.log(
                    "👤 MEMBER EVENT RECEIVED"
                );
                console.log(
                    "================================"
                );


                console.log(
                    "RAW DATA:"
                );


                try {

                    console.log(
                        JSON.stringify(
                            data,
                            null,
                            2
                        )
                    );

                }

                catch {

                    console.log(
                        data
                    );

                }


                // استخراج المستخدم

                const viewer =
                    extractUser(
                        data
                    );


                console.log(
                    "EXTRACTED VIEWER:"
                );


                console.log(
                    viewer
                );


                // إرسال للمتصفح

                broadcast({

                    type:
                        "viewer",

                    viewer:
                        viewer

                });


            }
        );


        // =================================
        // CHAT
        // =================================

        connection.on(
            WebcastEvent.CHAT,
            (data) => {

                console.log(
                    "💬 CHAT:",
                    data?.comment ||
                    data?.user?.nickname ||
                    ""
                );

            }
        );


        // =================================
        // GIFT
        // =================================

        connection.on(
            WebcastEvent.GIFT,
            (data) => {

                console.log(
                    "🎁 GIFT EVENT"
                );

            }
        );


        // =================================
        // FOLLOW
        // =================================

        connection.on(
            WebcastEvent.FOLLOW,
            (data) => {

                console.log(
                    "❤️ FOLLOW EVENT"
                );

            }
        );


        // =================================
        // LIKE
        // =================================

        connection.on(
            WebcastEvent.LIKE,
            (data) => {

                console.log(
                    "👍 LIKE EVENT"
                );

            }
        );


        // =================================
        // ERROR
        // =================================

        connection.on(
            "error",
            (error) => {

                console.error(
                    "❌ TIKTOK ERROR:",
                    error
                );

            }
        );


        // =================================
        // الاتصال الفعلي
        // =================================

        const state =
            await connection.connect();


        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "✅ TIKTOK CONNECTED"
        );
        console.log(
            "Room ID:",
            state?.roomId ||
            "unknown"
        );
        console.log(
            "================================"
        );


        return res.json({

            success: true,

            roomId:
                state?.roomId ||
                null

        });

    }

    catch (error) {


        console.error("");
        console.error(
            "❌ CONNECTION FAILED"
        );


        console.error(
            error
        );


        connection = null;


        return res.json({

            success: false,

            message:
                error?.message ||
                "تعذر الاتصال باللايف"

        });

    }

});


// ========================================
// Server-Sent Events
// ========================================

app.get("/events", (req, res) => {


    res.setHeader(
        "Content-Type",
        "text/event-stream"
    );


    res.setHeader(
        "Cache-Control",
        "no-cache, no-transform"
    );


    res.setHeader(
        "Connection",
        "keep-alive"
    );


    res.setHeader(
        "X-Accel-Buffering",
        "no"
    );


    res.flushHeaders();


    // إرسال رسالة اختبار
    res.write(
        `data: ${JSON.stringify({
            type: "connected"
        })}\n\n`
    );


    clients.push(
        res
    );


    console.log(
        "🌐 SSE CLIENT CONNECTED. Clients:",
        clients.length
    );


    // Heartbeat لمنع Render
    // من إغلاق الاتصال

    const heartbeat =
        setInterval(() => {

            try {

                res.write(
                    ": heartbeat\n\n"
                );

            }

            catch {}

        }, 15000);


    req.on(
        "close",
        () => {

            clearInterval(
                heartbeat
            );


            clients =
                clients.filter(
                    client =>
                        client !== res
                );


            console.log(
                "🌐 SSE CLIENT DISCONNECTED. Clients:",
                clients.length
            );

        }
    );

});


// ========================================
// تشغيل السيرفر
// ========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "🎮 SAMI LIVE GAMES"
        );
        console.log(
            "Server running on port:",
            PORT
        );
        console.log(
            "================================"
        );

    }
);
