import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { ensureIndexes, getDb } from './db.js';

const sessionCookie = process.env.SESSION_COOKIE || 'charynn_session';
const sessionDays = 30;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/[^a-z0-9가-힣_.-]/gi, '').slice(0, 24);
}

function hashPassword(password, salt = randomBytes(16).toString('base64url')) {
  const derived = scryptSync(String(password), salt, 64).toString('base64url');
  return `${salt}.${derived}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split('.');
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt).split('.')[1];
  const a = Buffer.from(hash);
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('base64url');
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    username: user.username,
    nickname: user.nickname || user.username,
    createdAt: user.createdAt
  };
}

export function getSessionCookieName() {
  return sessionCookie;
}

export async function signup({ username, password, nickname }) {
  await ensureIndexes();
  const db = await getDb();
  const clean = normalizeUsername(username);
  if (clean.length < 2) throw new Error('username_too_short');
  if (String(password || '').length < 4) throw new Error('password_too_short');
  const now = new Date();
  const user = {
    username: clean,
    nickname: String(nickname || clean).trim().slice(0, 24) || clean,
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    stats: { games: 0, wins: 0, losses: 0 }
  };
  const result = await db.collection('users').insertOne(user);
  user._id = result.insertedId;
  return { user: publicUser(user), token: await createSession(result.insertedId) };
}

export async function login({ username, password }) {
  await ensureIndexes();
  const db = await getDb();
  const user = await db.collection('users').findOne({ username: normalizeUsername(username) });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('invalid_login');
  return { user: publicUser(user), token: await createSession(user._id) };
}

export async function createSession(userId) {
  const db = await getDb();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await db.collection('sessions').insertOne({
    userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
    tokenHash: hashToken(token),
    createdAt: new Date(),
    expiresAt
  });
  return token;
}

export async function getUserByToken(token) {
  if (!token) return null;
  await ensureIndexes();
  const db = await getDb();
  const session = await db.collection('sessions').findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.collection('users').findOne({ _id: session.userId });
  return publicUser(user);
}

export async function logout(token) {
  if (!token) return;
  const db = await getDb();
  await db.collection('sessions').deleteOne({ tokenHash: hashToken(token) });
}

export function setSessionCookie(cookies, token) {
  cookies.set(sessionCookie, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !!process.env.VERCEL,
    maxAge: sessionDays * 24 * 60 * 60
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(sessionCookie, { path: '/' });
}
