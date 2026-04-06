const path = require("path");

const DEFAULT_JSON_UPSTREAMS = ["http://46.183.116.172:3000/compile"];
const LATEX_ONLINE_TEXT_URL = "https://latexonline.cc/compile";
const LATEX_ONLINE_DATA_URL = "https://latexonline.cc/data";

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

function readPayload(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (_error) {
      return {};
    }
  }
  return typeof body === "object" ? body : {};
}

function sanitizePath(filePath) {
  const normalized = String(filePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .join("/");
  return normalized;
}

function splitTarPath(filePath) {
  const safePath = sanitizePath(filePath);
  if (!safePath) {
    throw new Error("Archivo con ruta invalida");
  }
  if (Buffer.byteLength(safePath) <= 100) {
    return { name: safePath, prefix: "" };
  }
  const parts = safePath.split("/");
  const fileName = parts.pop() || "";
  const prefix = parts.join("/");
  if (!fileName || Buffer.byteLength(fileName) > 100 || Buffer.byteLength(prefix) > 155) {
    throw new Error(`Ruta demasiado larga para TAR: ${safePath}`);
  }
  return { name: fileName, prefix };
}

function writeTarString(buffer, offset, value, length) {
  const stringBuffer = Buffer.from(String(value || ""), "utf8");
  stringBuffer.copy(buffer, offset, 0, Math.min(stringBuffer.length, length));
}

function writeTarOctal(buffer, offset, value, length) {
  const octal = value.toString(8).padStart(length - 1, "0");
  writeTarString(buffer, offset, `${octal}\0`, length);
}

function buildTarEntry(filePath, contentBuffer) {
  const header = Buffer.alloc(512, 0);
  const { name, prefix } = splitTarPath(filePath);
  writeTarString(header, 0, name, 100);
  writeTarOctal(header, 100, 0o644, 8);
  writeTarOctal(header, 108, 0, 8);
  writeTarOctal(header, 116, 0, 8);
  writeTarOctal(header, 124, contentBuffer.length, 12);
  writeTarOctal(header, 136, Math.floor(Date.now() / 1000), 12);
  header.fill(0x20, 148, 156);
  writeTarString(header, 156, "0", 1);
  writeTarString(header, 257, "ustar", 6);
  writeTarString(header, 263, "00", 2);
  writeTarString(header, 345, prefix, 155);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeTarOctal(header, 148, checksum, 8);

  const remainder = contentBuffer.length % 512;
  const padding = remainder === 0 ? 0 : 512 - remainder;
  return [header, contentBuffer, Buffer.alloc(padding, 0)];
}

function decodeProjectFiles(projectFiles) {
  if (!Array.isArray(projectFiles)) {
    return [];
  }
  return projectFiles
    .map((file) => {
      const safePath = sanitizePath(file?.path);
      if (!safePath) return null;
      if (file?.type === "binary" && file?.encoding === "base64" && typeof file?.content === "string") {
        return { path: safePath, content: Buffer.from(file.content, "base64") };
      }
      return { path: safePath, content: Buffer.from(typeof file?.content === "string" ? file.content : "", "utf8") };
    })
    .filter(Boolean);
}

function buildTarArchive(projectFiles) {
  const entries = decodeProjectFiles(projectFiles);
  if (!entries.length) {
    throw new Error("No se recibieron archivos para compilar");
  }
  const buffers = [];
  for (const entry of entries) {
    buffers.push(...buildTarEntry(entry.path, entry.content));
  }
  buffers.push(Buffer.alloc(1024, 0));
  return Buffer.concat(buffers);
}

function buildMultipartBody(fileBuffer, fileName) {
  const boundary = `----latexify-${Date.now().toString(16)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: application/x-tar\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    boundary,
    body: Buffer.concat([head, fileBuffer, tail])
  };
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

async function requestLatexOnlineText(code) {
  const query = encodeURIComponent(code);
  const response = await fetch(`${LATEX_ONLINE_TEXT_URL}?text=${query}`, { method: "GET" });
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

async function requestLatexOnlineTarball(projectFiles, target) {
  const safeTarget = sanitizePath(target) || "main.tex";
  const tarBuffer = buildTarArchive(projectFiles);
  const { boundary, body } = buildMultipartBody(tarBuffer, "project.tar");
  const response = await fetch(`${LATEX_ONLINE_DATA_URL}?target=${encodeURIComponent(safeTarget)}`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `latexonline.cc respondio ${response.status}`);
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

  const payload = readPayload(req.body);
  const code = typeof payload.code === "string" ? payload.code : "";
  const target = typeof payload.target === "string" ? payload.target : "main.tex";
  const projectFiles = Array.isArray(payload.projectFiles) ? payload.projectFiles : [];

  if (!code.trim() && !projectFiles.length) {
    return res.status(400).json({ error: "El cuerpo debe incluir 'code' o 'projectFiles'" });
  }

  const errors = [];

  if (projectFiles.length) {
    try {
      const tarPayload = await requestLatexOnlineTarball(projectFiles, target);
      return res.status(200).json(tarPayload);
    } catch (error) {
      errors.push(`tarball:${error?.message || "error desconocido"}`);
    }
  }

  if (code.trim()) {
    for (const upstreamUrl of getJsonUpstreams()) {
      try {
        const payloadResult = await requestJsonCompiler(upstreamUrl, code);
        return res.status(200).json(payloadResult);
      } catch (error) {
        errors.push(`upstream:${upstreamUrl} -> ${error?.message || "error desconocido"}`);
      }
    }

    try {
      const textPayload = await requestLatexOnlineText(code);
      return res.status(200).json(textPayload);
    } catch (error) {
      errors.push(`text:${error?.message || "error desconocido"}`);
    }
  }

  return res.status(502).json({
    error: "No fue posible compilar el documento en este momento",
    details: errors.slice(0, 4).join(" | ")
  });
};
