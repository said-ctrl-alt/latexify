// Shared client-side configuration for LaTeXify.
// Update these values if you move the app to another Firebase project.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAaezwe-pPDi1rsS3uFopk9JMY199LLoqk",
  authDomain: "latexify-4bfc9.firebaseapp.com",
  projectId: "latexify-4bfc9",
  storageBucket: "latexify-4bfc9.firebasestorage.app",
  messagingSenderId: "292044762895",
  appId: "1:292044762895:web:a7a0ed9489331e2e88d87a"
};

// Emails allowed to access the admin panel.
window.LATEXIFY_ADMIN_EMAILS = ["latexstudio23@gmail.com"];

// Compiler endpoint used by the editor when generating PDF.
// In production under HTTPS, point this to a secure URL or a same-origin proxy like "/api/compile".
window.LATEXIFY_COMPILER_ENDPOINT = "/api/compile";

// Optional allowlist for a self-hosted compiler on another origin.
// Example:
// window.LATEXIFY_COMPILER_ENDPOINT = "https://latexify-co.duckdns.org/compile";
// window.LATEXIFY_TRUSTED_COMPILER_ORIGINS = ["https://latexify-co.duckdns.org"];
window.LATEXIFY_TRUSTED_COMPILER_ORIGINS = [];
