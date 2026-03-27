const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
}

function requireAdmin(request) {
  requireAuth(request);
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Solo administradores.');
  }
}

exports.bootstrapUser = onDocumentCreated('users/{userId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data() || {};
  await snap.ref.set({
    role: data.role || 'user',
    premium: Boolean(data.premium),
    compilationsToday: data.compilationsToday || 0,
    compilationsDate: data.compilationsDate || '',
    createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
});

exports.listUsers = onCall(async (request) => {
  requireAdmin(request);
  const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(500).get();
  return {
    users: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  };
});

exports.setPremiumStatus = onCall(async (request) => {
  requireAdmin(request);
  const { uid, active, months = 1 } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID inválido.');
  }

  let expiry = null;
  if (active) {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(months || 1));
    expiry = d.toISOString();
  }

  await db.collection('users').doc(uid).set({
    premium: Boolean(active),
    premiumActivated: active ? admin.firestore.FieldValue.serverTimestamp() : null,
    premiumExpiry: expiry,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok: true, premium: Boolean(active), premiumExpiry: expiry };
});

exports.setAdminRole = onCall(async (request) => {
  requireAdmin(request);
  const { uid, admin: makeAdmin } = request.data || {};
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'UID inválido.');
  }
  await admin.auth().setCustomUserClaims(uid, { admin: Boolean(makeAdmin) });
  await db.collection('users').doc(uid).set({
    role: makeAdmin ? 'admin' : 'user',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

exports.createProject = onCall(async (request) => {
  requireAuth(request);
  const uid = request.auth.uid;
  const title = String(request.data?.title || 'Proyecto LaTeX').trim().slice(0, 80);
  const template = String(request.data?.template || 'article').trim();
  const code = String(request.data?.code || '');
  const ref = db.collection('users').doc(uid).collection('projects').doc();
  await ref.set({
    title,
    template,
    code,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('users').doc(uid).set({
    lastProjectId: ref.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id: ref.id };
});

exports.healthcheck = onCall(async () => ({ ok: true, timestamp: Date.now() }));
