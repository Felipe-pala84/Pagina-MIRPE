/**
 * storage.js
 * Capa de persistencia sobre Firestore, con la misma API asíncrona que
 * tenía la versión local (get/set/list/delete/addToLog). Los módulos
 * (m8.js, chat.js, agenda.js, etc.) no necesitan saber que están
 * hablando con Firestore — solo usan `collection` + `id`.
 *
 * Multi-tenencia por VIP: cualquier módulo que trabaje sobre datos de
 * un protegido específico debe pasar una colección con el patrón
 * `vips/{vipId}/loQueSea` (ej. "vips/AB12/reports"). Firestore trata
 * eso como una subcolección real, así que los datos de un VIP viven
 * completamente separados de los de otro — un error o borrado en uno
 * no toca al otro.
 */

const Storage = {
  db() { return window.fb.db; },

  async set(collection, id, value) {
    try {
      await this.db().collection(collection).doc(id).set({
        value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error("Storage.set error", collection, id, e);
      return false;
    }
  },

  async get(collection, id) {
    try {
      const snap = await this.db().collection(collection).doc(id).get();
      if (!snap.exists) return null;
      return snap.data().value;
    } catch (e) {
      console.error("Storage.get error", collection, id, e);
      return null;
    }
  },

  async delete(collection, id) {
    try {
      await this.db().collection(collection).doc(id).delete();
      return true;
    } catch (e) {
      console.error("Storage.delete error", collection, id, e);
      return false;
    }
  },

  async list(collection, max = 200) {
    try {
      const snap = await this.db().collection(collection).orderBy("updatedAt", "desc").limit(max).get();
      return snap.docs.map((d) => ({
        id: d.id,
        value: d.data().value,
        updatedAt: d.data().updatedAt ? d.data().updatedAt.toMillis() : 0
      }));
    } catch (e) {
      console.error("Storage.list error", collection, e);
      return [];
    }
  },

  async addToLog(collection, entry) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.set(collection, id, entry);
    return id;
  },

  /** Suscripción en tiempo real — usada por el chat para recibir mensajes al instante. */
  onSnapshot(collection, max, callback) {
    return this.db().collection(collection).orderBy("updatedAt", "desc").limit(max)
      .onSnapshot((snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          value: d.data().value,
          updatedAt: d.data().updatedAt ? d.data().updatedAt.toMillis() : 0
        }));
        callback(rows);
      });
  },

  /** Suscripción en tiempo real a UN documento — usada por M8 para que el
   * estado (y las alertas de pánico) se sincronicen al instante entre
   * todos los dispositivos que están viendo el mismo VIP. */
  onDocSnapshot(collection, id, callback) {
    return this.db().collection(collection).doc(id).onSnapshot((snap) => {
      callback(snap.exists ? snap.data().value : null);
    }, (e) => console.error("Storage.onDocSnapshot error", collection, id, e));
  }
};

window.MierpeStorage = Storage;
