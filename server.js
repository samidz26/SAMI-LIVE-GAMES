import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
res.send(`

<!DOCTYPE html><html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAMI LIVE GAMES</title>
</head><body style="
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#111;
  color:white;
  font-family:Arial;
  text-align:center;
">  <div>
    <h1>🎮 SAMI LIVE GAMES</h1>
    <p id="message">مرحبًا بك في أول تجربة!</p><button onclick="testGame()" style="
  padding:15px 30px;
  font-size:20px;
  border:0;
  border-radius:10px;
  cursor:pointer;
">
  اضغط هنا
</button>

  </div>  <script>
    function testGame() {
      document.getElementById("message").textContent =
        "🎉 اللعبة تعمل بنجاح!";
    }
  </script></body>
</html>
  `);
});app.listen(PORT, "0.0.0.0", () => {
console.log("SAMI LIVE GAMES running on port " + PORT);
});
