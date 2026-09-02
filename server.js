import express from "express";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let connection = null;
let clients = [];
let lastViewer = null;
let connectedUsername = null;

// إرسال حدث لكل صفحات اللعبة المتصلة
function broadcast(data) {
const message = "data: ${JSON.stringify(data)}\n\n";

clients = clients.filter((client) => {
try {
client.write(message);
return true;
} catch {
return false;
}
});
}

// ================================
// الصفحة الرئيسية
// ================================

app.get("/", (req, res) => {

res.send(`

<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta
name="viewport"
content="width=device-width, initial-scale=1.0"

«»

<title>SAMI LIVE GAMES</title><style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  background:
    radial-gradient(
      circle at center,
      #252525 0%,
      #111 65%
    );

  color: white;

  font-family: Arial, sans-serif;

  display: flex;

  justify-content: center;

  align-items: center;

  text-align: center;

}


/* =========================
   الحاوية
========================= */

.container {

  width: 92%;

  max-width: 500px;

}


/* =========================
   الصفحة الأولى
========================= */

#connectPage {

  display: block;

}

.logo {

  font-size: 34px;

  font-weight: bold;

  margin-bottom: 35px;

}

.subtitle {

  font-size: 18px;

  opacity: .7;

  margin-bottom: 25px;

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

button:active {

  transform: scale(.97);

}

button:disabled {

  opacity: .6;

  cursor: wait;

}

#status {

  margin-top: 20px;

  min-height: 25px;

  font-size: 17px;

}


/* =========================
   الصفحة الثانية
========================= */

#livePage {

  display: none;

}

.liveTitle {

  font-size: 30px;

  font-weight: bold;

  margin-bottom: 35px;

}

.liveStatus {

  font-size: 16px;

  opacity: .7;

  margin-bottom: 35px;

}

.viewer {

  min-height: 300px;

  display: flex;

  flex-direction: column;

  justify-content: center;

  align-items: center;

}

.avatar {

  width: 190px;

  height: 190px;

  border-radius: 50%;

  object-fit: cover;

  border: 5px solid white;

  background: #222;

  box-shadow:
    0 0 30px rgba(255,255,255,.15);

}

.viewerName {

  margin-top: 22px;

  font-size: 30px;

  font-weight: bold;

  word-break: break-word;

}

.viewerUsername {

  margin-top: 8px;

  font-size: 17px;

  opacity: .65;

  direction: ltr;

}

.waiting {

  font-size: 22px;

  opacity: .65;

}

</style></head><body><div class="container">  <!-- =========================
       الصفحة الأولى
  ========================== -->  <div id="connectPage"><div class="logo">
  🎮 SAMI LIVE GAMES
</div>

<div class="subtitle">
  الاتصال بـ TikTok LIVE
</div>


<input
  id="username"
  type="text"
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

  </div>  <!-- =========================
       الصفحة الثانية
  ========================== -->  <div id="livePage"><div class="liveTitle">
  🔴 TikTok LIVE
</div>


<div
  id="liveStatus"
  class="liveStatus"
>
  متصل باللايف
</div>


<div
  id="viewer"
  class="viewer"
>

  <div class="waiting">
    👀 في انتظار دخول شخص...
  </div>

</div>

  </div></div><script>


let eventSource = null;


// ================================
// الاتصال
// ================================

async function connectTikTok() {


  const input =
    document.getElementById("username");


  const status =
    document.getElementById("status");


  const button =
    document.getElementById("connectButton");


  let username =
    input.value.trim();


  if (!username) {

    status.textContent =
      "⚠️ اكتب اسم مستخدم TikTok";

    return;

  }


  username =
    username.replace(/^@/, "");


  button.disabled = true;


  status.textContent =
    "⏳ جاري الاتصال باللايف...";


  try {


    const response =
      await fetch("/connect", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username
        })

      });


    const data =
      await response.json();


    if (!data.success) {

      button.disabled = false;

      status.textContent =
        "❌ فشل الاتصال: " +
        data.message;

      return;

    }


    // الانتقال للصفحة الثانية

    document.getElementById(
      "connectPage"
    ).style.display = "none";


    document.getElementById(
      "livePage"
    ).style.display = "block";


    document.getElementById(
      "liveStatus"
    ).textContent =
      "🟢 متصل بـ @" + username;


    startEvents();


  }

  catch (error) {


    console.error(error);


    button.disabled = false;


    status.textContent =
      "❌ حدث خطأ أثناء الاتصال";

  }

}



// ================================
// استقبال الأحداث
// ================================

function startEvents() {


  if (eventSource) {

    eventSource.close();

  }


  eventSource =
    new EventSource("/events");


  eventSource.onmessage =
    function(event) {


      try {


        const data =
          JSON.parse(event.data);


        if (
          data.type === "viewer"
          &&
          data.viewer
        ) {

          showViewer(data.viewer);

        }


      }

      catch (error) {

        console.error(
          "Event error:",
          error
        );

      }

    };


  eventSource.onerror =
    function() {

      console.log(
        "EventSource connection problem"
      );

    };

}



// ================================
// عرض الشخص الجديد
// ================================

function showViewer(viewer) {


  const container =
    document.getElementById("viewer");


  container.innerHTML = "";


  const image =
    document.createElement("img");


  image.className =
    "avatar";


  image.alt =
    viewer.name || "TikTok";


  if (viewer.avatar) {

    image.src =
      viewer.avatar;

  }


  image.onerror =
    function() {

      this.style.display = "none";

    };


  const name =
    document.createElement("div");


  name.className =
    "viewerName";


  name.textContent =
    viewer.name || "مشاهد";


  const username =
    document.createElement("div");


  username.className =
    "viewerUsername";


  username.textContent =
    viewer.username
      ? "@" + viewer.username
      : "";


  container.appendChild(image);

  container.appendChild(name);

  container.appendChild(username);

}


</script></body></html>
  `);});

// ================================
// الاتصال بـ TikTok
// ================================

app.post("/connect", async (req, res) => {

try {

let username =
  String(
    req.body.username || ""
  ).trim();


username =
  username.replace(/^@/, "");


if (!username) {

  return res.json({

    success: false,

    message:
      "اسم المستخدم فارغ"

  });

}


// إغلاق الاتصال السابق

if (connection) {

  try {

    await connection.disconnect();

  }

  catch {}

  connection = null;

}


lastViewer = null;


connectedUsername =
  username;


console.log(
  "================================"
);

console.log(
  "Connecting to TikTok LIVE:",
  username
);

console.log(
  "================================"
);


// الاتصال مع تعطيل البيانات القديمة

connection =
  new TikTokLiveConnection(
    username,
    {
      processInitialData: false
    }
  );


// =================================
// شخص دخل LIVE
// =================================

connection.on(
  WebcastEvent.MEMBER,
  (data) => {


    try {


      /*
       * في النسخة الحديثة من المكتبة:
       *
       * data.uniqueId
       * data.nickname
       * data.profilePictureUrl
       *
       * هي بيانات الشخص مباشرة.
       */


      const viewer = {

        name:
          data.nickname ||
          data.uniqueId ||
          "مشاهد",

        username:
          data.uniqueId ||
          "",

        avatar:
          data.profilePictureUrl ||
          ""

      };


      console.log(
        "👤 VIEWER JOIN:",
        viewer.username,
        "|",
        viewer.name
      );


      console.log(
        "🖼️ AVATAR:",
        viewer.avatar
          ? "YES"
          : "NO"
      );


      // الشخص الجديد يحل محل السابق

      lastViewer =
        viewer;


      // إرسال للشاشة

      broadcast({

        type:
          "viewer",

        viewer:
          viewer

      });


    }

    catch (error) {


      console.error(
        "MEMBER EVENT ERROR:",
        error
      );

    }

  }
);



// =================================
// أخطاء الاتصال
// =================================

connection.on(
  "error",
  (error) => {

    console.error(
      "TikTok connection error:",
      error
    );

    broadcast({

      type:
        "connection_error",

      message:
        error?.message ||
        "TikTok connection error"

    });

  }
);



// =================================
// الاتصال الفعلي
// =================================

const state =
  await connection.connect();


console.log(
  "================================"
);

console.log(
  "✅ CONNECTED TO TIKTOK LIVE"
);

console.log(
  "Username:",
  username
);

console.log(
  "Room ID:",
  state?.roomId || "unknown"
);

console.log(
  "================================"
);


return res.json({

  success: true,

  roomId:
    state?.roomId || null

});

}

catch (error) {

console.error(
  "❌ TikTok connection failed:"
);


console.error(error);


connection = null;


return res.json({

  success: false,

  message:
    error?.message ||
    "تعذر الاتصال باللايف"

});

}

});

// ================================
// قناة الأحداث
// ================================

app.get("/events", (req, res) => {

res.setHeader(
"Content-Type",
"text/event-stream"
);

res.setHeader(
"Cache-Control",
"no-cache"
);

res.setHeader(
"Connection",
"keep-alive"
);

res.flushHeaders();

clients.push(res);

// لا نرسل الشخص القديم تلقائيًا.
// نريد فقط الأشخاص الذين يدخلون
// بعد فتح صفحة LIVE.

req.on(
"close",
() => {

  clients =
    clients.filter(
      client =>
        client !== res
    );

}

);

});

// ================================
// تشغيل السيرفر
// ================================

app.listen(
PORT,
"0.0.0.0",
() => {

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
