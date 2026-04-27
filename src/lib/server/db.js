import { MongoClient } from 'mongodb';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { rootDir } from './runtime.js';

function envValue(key, fallback = '') {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(rootDir, '.env');
  if (!existsSync(envPath)) return fallback;
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf('=') + 1).trim() : fallback;
}

const uri = envValue('MONGODB_URI');
const dbName = envValue('MONGODB_DB', 'charynn_rule');

let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    if (!uri) throw new Error('MONGODB_URI is not configured.');
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(dbName);
}

export async function ensureIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection('users').createIndex({ username: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('rating').createIndex({ name: 1 }, { unique: true }),
    db.collection('rooms').createIndex({ room: 1 }, { unique: true }),
    db.collection('rooms').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 6 })
  ]);
}

// charynn_rule/rating — each player is one document keyed by name
export async function loadRatings() {
  const db = await getDb();
  const docs = await db.collection('rating').find({}).toArray();
  const out = {};
  for (const { _id, name, ...rest } of docs) {
    if (name) out[name] = rest;
  }
  return out;
}

export async function saveRatings(data) {
  if (!data || !Object.keys(data).length) return;
  const db = await getDb();
  const col = db.collection('rating');
  const ops = Object.entries(data).map(([name, player]) => ({
    updateOne: {
      filter: { name },
      update: { $set: { name, ...player, updatedAt: new Date() } },
      upsert: true
    }
  }));
  await col.bulkWrite(ops, { ordered: false });
}

export async function getRatingRanking(limit = 100) {
  const db = await getDb();
  return db.collection('rating')
    .find({}, { projection: { _id: 0 } })
    .sort({ rating: -1 })
    .limit(limit)
    .toArray();
}

export async function saveRoomSnapshot(room, data) {
  if (!room || !data) return;
  const db = await getDb();
  await db.collection('rooms').updateOne(
    { room },
    { $set: { room, ...data, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function loadRoomSnapshot(room) {
  if (!room) return null;
  const db = await getDb();
  const doc = await db.collection('rooms').findOne({ room }, { projection: { _id: 0 } });
  return doc || null;
}
