import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SAMI LIVE</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
          color: white;
          font-family: Arial, sans-serif;
          text-align: center;
        }

        .box {
          padding: 40px;
          border: 1px solid #444;
          border-radius: 20px;
        }

        h1 {
          margin: 0 0 15px;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🎮 SAMI LIVE</h1>
        <p>السيرفر يعمل بنجاح ✅</p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SAMI LIVE running on port ${PORT}`);
});
