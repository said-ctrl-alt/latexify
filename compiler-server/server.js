const express = require("express");

const handler = require("../latexify/api/compile.js");

const app = express();
const port = Number(process.env.PORT || 3000);
const bodyLimit = process.env.LATEXIFY_BODY_SIZE_LIMIT || "50mb";

app.use(express.json({ limit: bodyLimit }));
app.use(express.text({ limit: bodyLimit, type: ["text/plain", "application/json"] }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "latexify-compiler" });
});

app.all("/compile", async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Fallo interno del compilador",
      details: error?.message || "error desconocido",
    });
  }
});

app.listen(port, () => {
  console.log(`latexify-compiler escuchando en http://0.0.0.0:${port}`);
});
