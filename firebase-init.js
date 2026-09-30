/**
 * firebase-init.js
 * Inicializa Firebase (SDK "compat", vía CDN — sin build/bundler) para
 * el proyecto dedicado de MIERPE: sigpe-app-01.
 * Expone window.fb = { auth, db, storage } para el resto de la app.
 */

const firebaseConfig = {
  apiKey: "AIzaSyBNiZt_ubNfnwr7Ehwn-eewS-yeOGQmdT4",
  authDomain: "sigpe-app-01.firebaseapp.com",
  projectId: "sigpe-app-01",
  storageBucket: "sigpe-app-01.firebasestorage.app",
  messagingSenderId: "700020828320",
  appId: "1:700020828320:web:85812c2a1036ebd7f201c5"
};

firebase.initializeApp(firebaseConfig);

window.fb = {
  _config: firebaseConfig,
  auth: firebase.auth(),
  db: firebase.firestore(),
  storage: firebase.storage()
};
