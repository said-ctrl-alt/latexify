const UPSTREAM_COMPILER_URL = "http://46.183.116.172:3000/compile";

function readCodeFromBody(body) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed?.code === "string" ? parsed.code : "";
    } catch (_error) {
      return "";
    }
  }
  return typeof body.code === "string" ? body.code : "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const code = readCodeFromBody(req.body);
  if (!code.trim()) {
    return res.status(400).json({ error: "El cuerpo debe incluir 'code' en texto" });
  }

  try {
    const upstream = await fetch(UPSTREAM_COMPILER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const text = await upstream.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { error: "Respuesta no JSON del compilador remoto" };
    }

    if (!upstream.ok) {
      const errorMessage = payload?.error || `Compilador remoto respondio ${upstream.status}`;
      return res.status(502).json({ error: errorMessage });
    }

    if (!payload || typeof payload.pdf !== "string") {
      return res.status(502).json({ error: payload?.error || "El compilador remoto no devolvio PDF" });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({
      error: "No fue posible conectar con el compilador remoto",
      details: error?.message || "Error desconocido"
    });
  }
};
