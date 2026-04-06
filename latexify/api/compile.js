const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// Vercel: aumenta el límite del body para proyectos con imágenes y .cls pesados.
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

// ─────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────

// Carpeta donde guardas tus .cls y .sty personalizados (junto a compile.js).
// Ejemplo: classes/replab.cls, classes/revtex4.cls, etc.
const CLASSES_DIR = path.join(__dirname, "classes");

// Tiempo máximo de compilación local en ms (30 segundos).
const LOCAL_COMPILE_TIMEOUT_MS = 30_000;

// Compilador LaTeX a usar. Cambia a "xelatex" o "lualatex" si lo necesitas.
const LATEX_BIN = process.env.LATEXIFY_LATEX_BIN || "pdflatex";

const DEFAULT_JSON_UPSTREAMS = ["http://46.183.116.172:3000/compile"];
const LATEX_ONLINE_TEXT_URL = "https://latexonline.cc/compile";
const LATEX_ONLINE_DATA_URL = "https://latexonline.cc/data";

// ─────────────────────────────────────────────
// Utilidades de configuración
// ─────────────────────────────────────────────

function getJsonUpstreams() {
  const raw =
    process.env.LATEXIFY_UPSTREAM_COMPILER_URLS ||
    process.env.LATEXIFY_UPSTREAM_COMPILER_URL ||
    "";
  if (!raw.trim()) return DEFAULT_JSON_UPSTREAMS;
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function readPayload(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return typeof body === "object" ? body : {};
}

function sanitizePath(filePath) {
  return String(filePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "." && s !== "..")
    .join("/");
}

// ─────────────────────────────────────────────
// Compilación LOCAL con pdflatex
// ─────────────────────────────────────────────

/**
 * Carga los archivos de la carpeta `classes/` del servidor.
 * Devuelve un array de { path, content (Buffer) }.
 * Si la carpeta no existe, devuelve [].
 */
function loadBundledClasses() {
  if (!fs.existsSync(CLASSES_DIR)) return [];

  const bundled = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        bundled.push({ path: relPath, content: fs.readFileSync(fullPath) });
      }
    }
  };
  walk(CLASSES_DIR, "");
  return bundled;
}

/**
 * Decodifica los archivos recibidos del cliente.
 */
function decodeProjectFiles(projectFiles) {
  if (!Array.isArray(projectFiles)) return [];
  return projectFiles
    .map((file) => {
      const safePath = sanitizePath(file?.path);
      if (!safePath) return null;
      if (
        file?.type === "binary" &&
        file?.encoding === "base64" &&
        typeof file?.content === "string"
      ) {
        return { path: safePath, content: Buffer.from(file.content, "base64") };
      }
      return {
        path: safePath,
        content: Buffer.from(
          typeof file?.content === "string" ? file.content : "",
          "utf8"
        ),
      };
    })
    .filter(Boolean);
}

/**
 * Escribe un archivo respetando subdirectorios dentro de baseDir.
 */
function writeFileSafe(baseDir, relPath, content) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

/**
 * Compila localmente usando el LaTeX instalado en el servidor.
 * Retorna { pdf: <base64> } o lanza un Error con el log de LaTeX.
 */
async function compileLocally(projectFiles, code, target) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "latexify-"));

  try {
    // 1. Inyectar clases empaquetadas del servidor (solo si el proyecto no
    //    las trae ya — el archivo del usuario tiene prioridad).
    const bundled = loadBundledClasses();
    const projectPaths = new Set(
      (Array.isArray(projectFiles) ? projectFiles : [])
        .map((f) => sanitizePath(f?.path))
        .filter(Boolean)
    );
    for (const cls of bundled) {
      if (!projectPaths.has(cls.path)) {
        writeFileSafe(tmpDir, cls.path, cls.content);
      }
    }

    // 2. Escribir los archivos del proyecto.
    const decoded = decodeProjectFiles(projectFiles);
    if (decoded.length) {
      for (const file of decoded) {
        writeFileSafe(tmpDir, file.path, file.content);
      }
    } else if (code?.trim()) {
      // Modo simple: solo hay código sin archivos adjuntos.
      fs.writeFileSync(path.join(tmpDir, "main.tex"), code, "utf8");
    }

    // 3. Determinar el archivo .tex a compilar.
    const safeTarget = sanitizePath(target) || "main.tex";
    const mainTex = path.join(tmpDir, safeTarget);
    if (!fs.existsSync(mainTex)) {
      throw new Error(`Archivo objetivo no encontrado en el proyecto: ${safeTarget}`);
    }

    // 4. Ejecutar pdflatex (dos pasadas para referencias cruzadas).
    const latexArgs = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory", tmpDir,
      mainTex,
    ];

    for (let pass = 1; pass <= 2; pass++) {
      try {
        await execFileAsync(LATEX_BIN, latexArgs, {
          cwd: tmpDir,
          timeout: LOCAL_COMPILE_TIMEOUT_MS,
          env: {
            ...process.env,
            // Asegura que pdflatex encuentre los archivos del proyecto.
            TEXINPUTS: `${tmpDir}:${CLASSES_DIR}:`,
          },
        });
      } catch (execError) {
        // pdflatex sale con código != 0 cuando hay errores LaTeX.
        // Intentamos extraer el log para devolverlo al usuario.
        const logPath = path.join(
          tmpDir,
          safeTarget.replace(/\.tex$/i, ".log")
        );
        const logContent = fs.existsSync(logPath)
          ? fs.readFileSync(logPath, "utf8").slice(-3000) // últimas 3000 chars
          : execError.message;

        // Si es la primera pasada y hay un PDF parcial, continuamos.
        // Si es la segunda, fallamos con el log.
        if (pass === 2) {
          throw new Error(extractLatexError(logContent));
        }
      }
    }

    // 5. Leer el PDF generado.
    const pdfPath = path.join(tmpDir, safeTarget.replace(/\.tex$/i, ".pdf"));
    if (!fs.existsSync(pdfPath)) {
      throw new Error("pdflatex terminó sin generar un PDF.");
    }
    const pdfBase64 = fs.readFileSync(pdfPath).toString("base64");
    return { pdf: pdfBase64 };

  } finally {
    // 6. Limpiar el directorio temporal.
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { /* ignorar errores de limpieza */ }
  }
}

/**
 * Extrae el mensaje de error más relevante del log de LaTeX.
 */
function extractLatexError(log) {
  const lines = log.split("\n");
  const errorLines = lines.filter(
    (l) => l.startsWith("!") || l.includes("Error") || l.includes("not found")
  );
  if (errorLines.length) {
    return errorLines.slice(0, 6).join("\n").trim();
  }
  return log.slice(-800).trim() || "Error desconocido de compilación.";
}

// ─────────────────────────────────────────────
// Compiladores REMOTOS (fallback)
// ─────────────────────────────────────────────

function splitTarPath(filePath) {
  const safePath = sanitizePath(filePath);
  if (!safePath) throw new Error("Archivo con ruta invalida");
  if (Buffer.byteLength(safePath) <= 100) return { name: safePath, prefix: "" };
  const parts = safePath.split("/");
  const fileName = parts.pop() || "";
  const prefix = parts.join("/");
  if (!fileName || Buffer.byteLength(fileName) > 100 || Buffer.byteLength(prefix) > 155) {
    throw new Error(`Ruta demasiado larga para TAR: ${safePath}`);
  }
  return { name: fileName, prefix };
}

function writeTarString(buffer, offset, value, length) {
  const b = Buffer.from(String(value || ""), "utf8");
  b.copy(buffer, offset, 0, Math.min(b.length, length));
}
function writeTarOctal(buffer, offset, value, length) {
  writeTarString(buffer, offset, `${value.toString(8).padStart(length - 1, "0")}\0`, length);
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
  const padding = contentBuffer.length % 512 === 0 ? 0 : 512 - (contentBuffer.length % 512);
  return [header, contentBuffer, Buffer.alloc(padding, 0)];
}

function buildTarArchive(projectFiles) {
  const entries = decodeProjectFiles(projectFiles);
  if (!entries.length) throw new Error("No se recibieron archivos para compilar");
  const buffers = [];
  for (const entry of entries) buffers.push(...buildTarEntry(entry.path, entry.content));
  buffers.push(Buffer.alloc(1024, 0));
  return Buffer.concat(buffers);
}

function buildMultipartBody(fileBuffer, fileName) {
  const boundary = `----latexify-${Date.now().toString(16)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/x-tar\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return { boundary, body: Buffer.concat([head, fileBuffer, tail]) };
}

async function requestJsonCompiler(url, code) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { error: "Respuesta no JSON del compilador remoto" }; }
  if (!response.ok) throw new Error(payload?.error || `Compilador remoto respondio ${response.status}`);
  if (!payload?.pdf) throw new Error(payload?.error || "El compilador remoto no devolvio PDF");
  return payload;
}

async function requestLatexOnlineText(code) {
  const response = await fetch(`${LATEX_ONLINE_TEXT_URL}?text=${encodeURIComponent(code)}`, { method: "GET" });
  if (!response.ok) throw new Error(`latexonline.cc respondio ${response.status}`);
  const pdfBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  if (!pdfBase64) throw new Error("latexonline.cc no devolvio PDF");
  return { pdf: pdfBase64 };
}

async function requestLatexOnlineTarball(projectFiles, target) {
  const safeTarget = sanitizePath(target) || "main.tex";
  const tarBuffer = buildTarArchive(projectFiles);
  const { boundary, body } = buildMultipartBody(tarBuffer, "project.tar");
  const response = await fetch(`${LATEX_ONLINE_DATA_URL}?target=${encodeURIComponent(safeTarget)}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error((await response.text()) || `latexonline.cc respondio ${response.status}`);
  const pdfBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  if (!pdfBase64) throw new Error("latexonline.cc no devolvio PDF");
  return { pdf: pdfBase64 };
}

// ─────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido" });

  const payload = readPayload(req.body);
  const code = typeof payload.code === "string" ? payload.code : "";
  const target = typeof payload.target === "string" ? payload.target : "main.tex";
  const projectFiles = Array.isArray(payload.projectFiles) ? payload.projectFiles : [];

  if (!code.trim() && !projectFiles.length) {
    return res.status(400).json({ error: "El cuerpo debe incluir 'code' o 'projectFiles'" });
  }

  const errors = [];

  // ── 1. Compilación local (primera prioridad) ──────────────────────────────
  try {
    const result = await compileLocally(projectFiles, code, target);
    return res.status(200).json(result);
  } catch (error) {
    errors.push(`local:${error?.message || "error desconocido"}`);
  }

  // ── 2. Tarball a latexonline.cc (fallback con archivos adjuntos) ──────────
  if (projectFiles.length) {
    try {
      const result = await requestLatexOnlineTarball(projectFiles, target);
      return res.status(200).json(result);
    } catch (error) {
      errors.push(`tarball:${error?.message || "error desconocido"}`);
    }
  }

  // ── 3. Upstreams JSON configurados ────────────────────────────────────────
  if (code.trim()) {
    for (const upstreamUrl of getJsonUpstreams()) {
      try {
        const result = await requestJsonCompiler(upstreamUrl, code);
        return res.status(200).json(result);
      } catch (error) {
        errors.push(`upstream:${upstreamUrl} -> ${error?.message || "error desconocido"}`);
      }
    }

    // ── 4. latexonline.cc texto plano (último recurso) ──────────────────────
    try {
      const result = await requestLatexOnlineText(code);
      return res.status(200).json(result);
    } catch (error) {
      errors.push(`text:${error?.message || "error desconocido"}`);
    }
  }

  return res.status(502).json({
    error: "No fue posible compilar el documento en este momento",
    details: errors.slice(0, 4).join(" | "),
  });
};
