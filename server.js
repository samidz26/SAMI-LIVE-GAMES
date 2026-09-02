import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

app.get("/", (req, res) => {
res.sendFile(process.cwd() + "/index.html");
});

app.listen(PORT, "0.0.0.0", () => {
console.log("SAMI LIVE GAMES running on port ${PORT}");
});
