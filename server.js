import express from "express";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let connection = null;
let clients = [];
let lastViewer = null;

// إرسال حدث لجميع المتصفحات المتصلة
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

// الصفحة الرئيسية
app.get("/", (req, res) => {
res.send(`

<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>SAMI LIVE GAMES</title><style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #111;
  color: white;
  font-family: Arial, sans-serif;

  display: flex;
  justify-content: center;
  align-items: center;

  text-align: center;
}

.container {
  width: 90%;
  max-width: 500px;
}

/* الصفحة الأولى */

#connectPage {
  display: block;
}

.logo {
  font-size: 34px;
  font-weight: bold;
  margin-bottom: 35px;
}

input {
  width: 100%;
  padding: 17px;

  border: none;
  border-radius: 12px;

  font-size: 18px;
  text-align: center;

  margin-bottom: 15px;
}

button {
  width: 100%;

  padding: 17px;

  border: none;
  border-radius: 12px;

  background: #ff0050;
  color: white;

  font-size: 20px;
  font-weight: bold;

  cursor: pointer;
}

button:active {
  transform: scale(.97);
}

#status {
  margin-top: 20px;
  font-size: 17px;
}

/* الصفحة الثانية */

#livePage {
  display: none;
}

.liveTitle {
  font-size: 30px;
  margin-bottom: 35px;
}

.viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
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

  font-size: 28px;
  font-weight: bold;
}

.waiting {
  font-size: 22px;
  opacity: .7;
}

</style></head><body><div class="container">  <!-- الصفحة الأولى -->  <div id="connectPage"><div class="logo">
  🎮 SAMI LIVE GAMES
</div>

<input
  id="username"
  type="text"
  placeholder="اسم مستخدم TikTok"
  autocomplete="off"
>

<button onclick="connectTikTok()">
  🔴 اتصال باللايف
</button>

<div id="status"></div>

  </div>  <!-- الصفحة الثانية -->  <div id="livePage"><div class="liveTitle">
  🔴 TikTok LIVE
</div>

<div id="viewer" class="viewer">

  <div class="waiting">
    في انتظار دخول شخص...
  </div>

</div>

  </div></div><script>

let eventSource = null;


// الاتصال باللايف

async function connectTikTok() {

  const input =
    document.getElementById("username");

  const status =
    document.getElementById("status");

  let username =
    input.value.trim();

  if (!username) {

    status.textContent =
      "⚠️ اكتب اسم مستخدم TikTok";

    return;
  }

  username =
    username.replace(/^@/, "");

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
          username: username
        })

      });


    const data =
      await response.json();


    if (!data.success) {

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


    startEvents();

  }

  catch (error) {

    console.error(error);

    status.textContent =
      "❌ حدث خطأ أثناء الاتصال";

  }

}


// استقبال الأحداث

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


        if (data.type === "viewer") {

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

}


// عرض المشاهد

function showViewer(viewer) {

  const container =
    document.getElementById("viewer");


  container.innerHTML = "";


  const image =
    document.createElement("img");

  image.className =
    "avatar";


  if (viewer.avatar) {

    image.src =
      viewer.avatar;

  }


  const name =
    document.createElement("div");

  name.className =
    "viewerName";


  name.textContent =
    viewer.name || "مشاهد";


  container.appendChild(image);

  container.appendChild(name);

}

</script></body></html>
  `);
});// الاتصال بـ TikTok

app.post("/connect", async (req, res) => {

try {

let username =
  String(req.body.username || "").trim();

username =
  username.replace(/^@/, "");


if (!username) {

  return res.json({
    success: false,
    message: "اسم المستخدم فارغ"
  });

}


// إغلاق الاتصال السابق

if (connection) {

  try {

    await connection.disconnect();

  } catch {}

  connection = null;

}


console.log(
  "Connecting to TikTok:",
  username
);


// إنشاء اتصال جديد

connection =
  new TikTokLiveConnection(
    username,
    {
      processInitialData: false
    }
  );


// دخول مشاهد جديد

connection.on(
  WebcastEvent.MEMBER,
  (data) => {

    try {

      const user =
        data.user || {};


      const viewer = {

        name:
          user.nickname ||
          user.uniqueId ||
          "مشاهد",

        avatar:
          user.profilePicture
            ?.url?.[0] ||

          user.avatarThumb
            ?.urlList?.[0] ||

          ""

      };


      lastViewer =
        viewer;


      console.log(
        "VIEWER JOIN:",
        viewer.name
      );


      broadcast({

        type: "viewer",

        viewer: viewer

      });

    }

    catch (error) {

      console.error(
        "Member event error:",
        error
      );

    }

  }
);


// محاولة الاتصال

const state =
  await connection.connect();


console.log(
  "CONNECTED!",
  state?.roomId || ""
);


return res.json({

  success: true,

  roomId:
    state?.roomId || null

});

}

catch (error) {

console.error(
  "TikTok connection error:",
  error
);


return res.json({

  success: false,

  message:
    error?.message ||
    "تعذر الاتصال باللايف"

});

}

});

// قناة الأحداث للصفحة

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

// إذا كان هناك شخص أخير، اعرضه

if (lastViewer) {

res.write(
  `data: ${JSON.stringify({
    type: "viewer",
    viewer: lastViewer
  })}\n\n`
);

}

req.on("close", () => {

clients =
  clients.filter(
    client => client !== res
  );

});

});

// تشغيل السيرفر

app.listen(
PORT,
"0.0.0.0",
() => {

console.log(
  "SAMI LIVE GAMES running on port " +
  PORT
);

}
);
