import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = path.join(__dirname, '../../database');

export const readDB = (filename) => {
  try {
    const data = fs.readFileSync(path.join(DB_PATH, filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
};

export const writeDB = (filename, data) => {
  try {
    fs.writeFileSync(path.join(DB_PATH, filename), JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    return false;
  }
};

export const getAllFromDB = (filename, arrayKey) => {
  const db = readDB(filename);
  return db ? db[arrayKey] : [];
};

export const getByIdFromDB = (filename, arrayKey, id) => {
  const items = getAllFromDB(filename, arrayKey);
  return items.find(item => item.id === parseInt(id));
};

export const addToDB = (filename, arrayKey, newItem) => {
  const db = readDB(filename);
  if (!db) return null;

  const items = db[arrayKey];
  const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const item = { id: newId, ...newItem, createdAt: new Date().toISOString() };

  items.push(item);
  writeDB(filename, db);
  return item;
};

export const updateInDB = (filename, arrayKey, id, updates) => {
  const db = readDB(filename);
  if (!db) return null;

  const index = db[arrayKey].findIndex(item => item.id === parseInt(id));
  if (index === -1) return null;

  db[arrayKey][index] = { ...db[arrayKey][index], ...updates };
  writeDB(filename, db);
  return db[arrayKey][index];
};

export const deleteFromDB = (filename, arrayKey, id) => {
  const db = readDB(filename);
  if (!db) return false;

  const initialLength = db[arrayKey].length;
  db[arrayKey] = db[arrayKey].filter(item => item.id !== parseInt(id));

  if (db[arrayKey].length < initialLength) {
    writeDB(filename, db);
    return true;
  }
  return false;
};
