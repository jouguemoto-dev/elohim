import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Member, ChurchEvent, Registration, ChurchSettings, EventType, EventTemplate } from '../types';

export const churchService = {
  // Members
  async getMembers(): Promise<Member[]> {
    try {
      const q = query(collection(db, 'members'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
    } catch (e) { handleFirestoreError(e, 'list', 'members'); }
  },

  async addMember(member: Omit<Member, 'id'>) {
    try {
      return await addDoc(collection(db, 'members'), member);
    } catch (e) { handleFirestoreError(e, 'create', 'members'); }
  },

  async updateMember(id: string, member: Partial<Member>) {
    try {
      const docRef = doc(db, 'members', id);
      await updateDoc(docRef, member);
    } catch (e) { handleFirestoreError(e, 'update', `members/${id}`); }
  },

  async deleteMember(id: string) {
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (e) { handleFirestoreError(e, 'delete', `members/${id}`); }
  },

  // Events
  async getEvents(): Promise<ChurchEvent[]> {
    try {
      const q = query(collection(db, 'events'));
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChurchEvent));
      // Sort on client side to avoid index requirement
      return events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } catch (e) { handleFirestoreError(e, 'list', 'events'); }
  },

  async getEventByPublicId(publicId: string): Promise<ChurchEvent | null> {
    try {
      const q = query(collection(db, 'events'), where('publicId', '==', publicId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ChurchEvent;
    } catch (e) { handleFirestoreError(e, 'get', `events/publicId/${publicId}`); }
  },

  async addEvent(event: Omit<ChurchEvent, 'id'>) {
    try {
      return await addDoc(collection(db, 'events'), event);
    } catch (e) { handleFirestoreError(e, 'create', 'events'); }
  },

  async updateEvent(id: string, event: Partial<ChurchEvent>) {
    try {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, event);
    } catch (e) { handleFirestoreError(e, 'update', `events/${id}`); }
  },

  async deleteEvent(id: string) {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (e) { handleFirestoreError(e, 'delete', `events/${id}`); }
  },

  // Registrations
  async getRegistrations(eventId: string): Promise<Registration[]> {
    try {
      const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      const regs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
      // Sort on client side
      return regs.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
    } catch (e) { handleFirestoreError(e, 'list', 'registrations'); }
  },

  async getAllRegistrations(): Promise<Registration[]> {
    try {
      const q = query(collection(db, 'registrations'));
      const snapshot = await getDocs(q);
      const regs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
      return regs.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
    } catch (e) { handleFirestoreError(e, 'list', 'registrations'); }
  },

  async addRegistration(reg: Omit<Registration, 'id'>) {
    try {
      return await addDoc(collection(db, 'registrations'), {
        ...reg,
        registeredAt: new Date().toISOString()
      });
    } catch (e) { handleFirestoreError(e, 'create', 'registrations'); }
  },

  async updateRegistration(id: string, reg: Partial<Registration>) {
    try {
      const docRef = doc(db, 'registrations', id);
      await updateDoc(docRef, reg);
    } catch (e) { handleFirestoreError(e, 'update', `registrations/${id}`); }
  },

  async deleteRegistration(id: string) {
    try {
      await deleteDoc(doc(db, 'registrations', id));
    } catch (e) { handleFirestoreError(e, 'delete', `registrations/${id}`); }
  },

  // Settings
  async getSettings(): Promise<ChurchSettings> {
    try {
      const docRef = doc(db, 'config', 'church');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as ChurchSettings;
      }
      return { name: 'Eclésia Manager' }; // Default
    } catch (e) { handleFirestoreError(e, 'get', 'config/church'); }
  },

  async updateSettings(settings: ChurchSettings) {
    try {
      const docRef = doc(db, 'config', 'church');
      await setDoc(docRef, settings, { merge: true });
    } catch (e) { handleFirestoreError(e, 'update', 'config/church'); }
  },

  // Event Types
  async getEventTypes(): Promise<EventType[]> {
    try {
      const q = query(collection(db, 'eventTypes'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventType));
    } catch (e) { handleFirestoreError(e, 'list', 'eventTypes'); }
  },

  async addEventType(name: string) {
    try {
      return await addDoc(collection(db, 'eventTypes'), { name });
    } catch (e) { handleFirestoreError(e, 'create', 'eventTypes'); }
  },

  async deleteEventType(id: string) {
    try {
      await deleteDoc(doc(db, 'eventTypes', id));
    } catch (e) { handleFirestoreError(e, 'delete', `eventTypes/${id}`); }
  },

  // Event Templates
  async getEventTemplates(): Promise<EventTemplate[]> {
    try {
      const q = query(collection(db, 'eventTemplates'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventTemplate));
    } catch (e) { handleFirestoreError(e, 'list', 'eventTemplates'); }
  },

  async addEventTemplate(template: Omit<EventTemplate, 'id'>) {
    try {
      return await addDoc(collection(db, 'eventTemplates'), {
        ...template,
        createdAt: new Date().toISOString()
      });
    } catch (e) { handleFirestoreError(e, 'create', 'eventTemplates'); }
  },

  async deleteEventTemplate(id: string) {
    try {
      await deleteDoc(doc(db, 'eventTemplates', id));
    } catch (e) { handleFirestoreError(e, 'delete', `eventTemplates/${id}`); }
  }
};
