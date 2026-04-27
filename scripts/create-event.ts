
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

async function run() {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  const app = initializeApp(config);
  const db = getFirestore(app);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(20, 30, 0, 0);

  const eventData = {
    title: 'Reunião Geral',
    type: 'Culto',
    startDate: tomorrow.toISOString(),
    endDate: tomorrowEnd.toISOString(),
    location: 'Templo Principal',
    description: 'Reunião geral com toda a comunidade.',
    price: 0,
    publicId: 'reuniao-geral-' + Math.random().toString(36).substring(2, 7)
  };

  console.log('Criando evento:', eventData);

  try {
    const docRef = await addDoc(collection(db, 'events'), eventData);
    console.log('Evento criado com ID:', docRef.id);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    process.exit(1);
  }
}

run();
