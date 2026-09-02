import express from "express";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let connection = null;
let currentUser = null;
let clients = [];

function sendToClients(data) {
const message = "data: ${JSON.stringify(data)}\n\n";

clients = clients.filter((res) => {
try {
res.write(message);
return true;
} catch {
return false;
}
});
}

// الصفحة الرئيسية
app.get("/", (req, res) => {
res.send(`

<!DOCTYPE html><html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SAMI LIVE GAMES</title><style>
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

h1 {
  font-size: 32px;
  margin-bottom: 30px;
}

input {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  border: none;
  font-size: 18px;
  text-align: center;
  margin-bottom: 15px;
}

button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: #ff0050;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

#status {
  margin-top: 20px;
  font-size: 18px;
}

#page2 {
  display: none;
}

.avatar {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  object-fit: cover;
  border: 5px solid white;
}

.name {
  margin-top: 20px;
  font-size: 28px;
  font-weight: bold;
}

.waiting {
  font-size: 22px;
  opacity: .7;
}
</style></head><body><div class="container">  <div id="page1">
    <h1>🎮 SAMI LIVE GAMES</h1><input
  id="username"
  placeholder="اكتب اسم مستخدم TikTok"
  autocomplete="off"
>

<button onclick="connectTikTok()">
  🔴 اتصال باللايف
</button>

<div id="status"></div>

  </div>  <div id="page2"><h1>🔴 LIVE</h1>

<div id="viewer">
  <div class="waiting">
    في انتظار دخول شخص...
  </div>
</div>

  </div></div><script>

let eventSource = null;

async function connectTikTok() {

  const username =
    document.getElementById("username").value.trim();

  const status =
    document.getElementById("status");

  if (!username) {
    status.textContent =
      "⚠️ اكتب اسم مستخدم TikTok أولاً";
    return;
  }

  status.textContent =
    "⏳ جاري الاتصال باللايف...";

  try {

    const response = await fetch("/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });

    const data = await response.json();

    if (!data.success) {
      status.textContent =
        "❌ فشل الاتصال: " + data.message;
      return;
    }

    document.getElementById("page1").style.display = "none";
    document.getElementById("page2").style.display = "block";

    startEvents();

  } catch (error) {

    status.textContent =
      "❌ حدث خطأ أثناء الاتصال";

    console.error(error);
  }
}

function startEvents() {

  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource("/events");

  eventSource.onmessage = function(event) {

    const data = JSON.parse(event.data);

    if (data.type === "viewer") {

      const viewer = data.viewer;

      const viewerBox =
        document.getElementById("viewer");

      viewerBox.innerHTML = "";

      const img =
        document.createElement("img");

      img.className = "avatar";

      img.src =
        viewer.avatar ||
        "https://via.placeholder.com/180";

      const name =
        document.createElement("div");

      name.className = "name";

      name.textContent =
        viewer.name || "مشاهد";

      viewerBox.appendChild(img);
      viewerBox.appendChild(name);
    }
  };
}

</script></body>
</html>
  `);
});// الاتصال بـ TikTok
app.post("/connect", async (req, res) => {

try {

let username = String(req.body.username || "").trim();

username = username.replace(/^@/, "");

if (!username) {
  return res.json({
    success: false,
    message: "اسم المستخدم فارغ"
  });
}

if (connection) {
  try {
    await connection.disconnect();
  } catch {}
}

connection = new TikTokLiveConnection(username);

connection.on(
  WebcastEvent.MEMBER,
  (data) => {

    const user =
      data.user || {};

    const viewer = {
      name:
        user.nickname ||
        user.uniqueId ||
        "مشاهد",

      avatar:
        user.profilePicture?.url?.[0] ||
        user.avatarThumb?.urlList?.[0] ||
        ""
    };

    currentUser = viewer;

    console.log(
      "JOIN:",
      viewer.name
    );

    sendToClients({
      type: "viewer",
      viewer
    });
  }
);

await connection.connect();

console.log(
  "Connected to TikTok LIVE:",
  username
);

res.json({
  success: true
});

} catch (error) {

console.error(
  "TikTok connection error:",
  error
);

res.json({
  success: false,
  message:
    error?.message ||
    "تعذر الاتصال باللايف"
});

}
});

// إرسال الأحداث للمتصفح
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

if (currentUser) {

res.write(
  `data: ${JSON.stringify({
    type: "viewer",
    viewer: currentUser
  })}\n\n`
);

}

req.on("close", () => {

clients =
  clients.filter(
    (client) => client !== res
  );

});
});

app.listen(PORT, "0.0.0.0", () => {

console.log(
"SAMI LIVE GAMES running on port ${PORT}"
);

});
