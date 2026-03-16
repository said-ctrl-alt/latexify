// =====================================================
// LATEXIFY — Configuración de Firebase
// =====================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto llamado "latexify"
// 3. Activa Authentication → Email/Password
// 4. Activa Firestore Database
// 5. En Configuración del proyecto → tus apps → Web
//    copia los valores y pégalos aquí abajo
// =====================================================

const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

// =====================================================
// REGLAS DE FIRESTORE — pega esto en Firebase Console
// =====================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
*/

// =====================================================
// LÍMITES DEL PLAN GRATUITO
// =====================================================
const PLAN_LIMITS = {
  free: {
    compilationsPerDay: 5,
    templates: ['article', 'lab'],
    maxLines: 300
  },
  premium: {
    compilationsPerDay: Infinity,
    templates: ['article', 'lab', 'thesis', 'beamer', 'ieee', 'apa'],
    maxLines: Infinity
  }
};

// =====================================================
// CONFIGURACIÓN DE PAGOS (Nequi / Daviplata)
// =====================================================
const PAYMENT_CONFIG = {
  nequi:     "TU_NUMERO_NEQUI",       // ej: 3001234567
  daviplata: "TU_NUMERO_DAVIPLATA",   // ej: 3001234567
  precio_mensual_cop: 8000,
  precio_semestral_cop: 40000,
  nombre_titular: "TU NOMBRE",
  instrucciones_email: "latexify@tudominio.com"  // donde reciben comprobantes
};
