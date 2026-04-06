const DEFAULT_JSON_UPSTREAMS = ["http://46.183.116.172:3000/compile"];
const LATEX_ONLINE_URL = "https://latexonline.cc/compile";

function getJsonUpstreams() {
  const raw = process.env.LATEXIFY_UPSTREAM_COMPILER_URLS || process.env.LATEXIFY_UPSTREAM_COMPILER_URL || "";
  if (!raw.trim()) {
    return DEFAULT_JSON_UPSTREAMS;
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

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

async function requestJsonCompiler(url, code) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (_error) {
    payload = { error: "Respuesta no JSON del compilador remoto" };
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Compilador remoto respondio ${response.status}`);
  }

  if (!payload || typeof payload.pdf !== "string") {
    throw new Error(payload?.error || "El compilador remoto no devolvio PDF");
  }

  return payload;
}

async function requestLatexOnline(code) {
  const query = encodeURIComponent(code);
  const response = await fetch(`${LATEX_ONLINE_URL}?text=${query}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`latexonline.cc respondio ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
  if (!pdfBase64) {
    throw new Error("latexonline.cc no devolvio PDF");
  }
  return { pdf: pdfBase64 };
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

  const errors = [];

  for (const upstreamUrl of getJsonUpstreams()) {
    try {
      const payload = await requestJsonCompiler(upstreamUrl, code);
      return res.status(200).json(payload);
    } catch (error) {
      errors.push(`upstream:${upstreamUrl} -> ${error?.message || "error desconocido"}`);
    }
  }

  try {
    const latexOnlinePayload = await requestLatexOnline(code);
    return res.status(200).json(latexOnlinePayload);
  } catch (error) {
    errors.push(`fallback:latexonline -> ${error?.message || "error desconocido"}`);
  }

  return res.status(502).json({
    error: "No fue posible compilar el documento en este momento",
    details: errors.slice(0, 3).join(" | ")
  });
};
