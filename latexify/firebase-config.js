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
window.LATEXIFY_ADMIN_EMAILS = ["tu@correo.com"];

// Compiler endpoint used by the editor when generating PDF.
// In production under HTTPS, point this to a secure URL or a same-origin proxy like "/api/compile".
window.LATEXIFY_COMPILER_ENDPOINT = "/api/compile";
