import { ObjectId } from 'mongodb';
import { ensureIndexes, getDb } from './db.js';

function cleanNickname(value) {
  return String(value || '').trim().slice(0, 24);
}

async function findUserByNickname(nickname) {
  const clean = cleanNickname(nickname);
  if (!clean) return null;
  const db = await getDb();
  return db.collection('users').findOne({
    nickname: clean,
    isGuest: { $ne: true }
  });
}

async function findUserById(userId) {
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return db.collection('users').findOne({ _id: id, isGuest: { $ne: true } });
}

export async function listFriends(userId) {
  await ensureIndexes();
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const docs = await db.collection('friends').find({
    $or: [{ userId: id }, { friendUserId: id }],
    status: 'accepted'
  }).toArray();

  const friends = [];
  for (const doc of docs) {
    const otherId = String(doc.userId) === String(id) ? doc.friendUserId : doc.userId;
    const otherNick = String(doc.userId) === String(id) ? doc.friendNickname : doc.userNickname;
    friends.push({
      nickname: otherNick,
      userId: String(otherId),
      since: doc.acceptedAt || doc.createdAt
    });
  }
  friends.sort((a, b) => String(a.nickname).localeCompare(String(b.nickname), 'ko'));
  return friends;
}

export async function listFriendRequests(userId) {
  await ensureIndexes();
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const incoming = await db.collection('friend_requests').find({
    toUserId: id,
    status: 'pending'
  }).sort({ createdAt: -1 }).toArray();
  const outgoing = await db.collection('friend_requests').find({
    fromUserId: id,
    status: 'pending'
  }).sort({ createdAt: -1 }).toArray();

  return {
    incoming: incoming.map((row) => ({
      nickname: row.fromNickname,
      userId: String(row.fromUserId),
      at: row.createdAt
    })),
    outgoing: outgoing.map((row) => ({
      nickname: row.toNickname,
      userId: String(row.toUserId),
      at: row.createdAt
    }))
  };
}

export async function sendFriendRequest({ fromUserId, fromNickname, toNickname }) {
  await ensureIndexes();
  const targetNick = cleanNickname(toNickname);
  if (!targetNick) throw new Error('invalid_nickname');
  if (targetNick === cleanNickname(fromNickname)) throw new Error('cannot_friend_self');

  const target = await findUserByNickname(targetNick);
  if (!target) throw new Error('user_not_found');

  const fromId = typeof fromUserId === 'string' ? new ObjectId(fromUserId) : fromUserId;
  if (String(target._id) === String(fromId)) throw new Error('cannot_friend_self');

  const db = await getDb();
  const existingFriend = await db.collection('friends').findOne({
    $or: [
      { userId: fromId, friendUserId: target._id, status: 'accepted' },
      { userId: target._id, friendUserId: fromId, status: 'accepted' }
    ]
  });
  if (existingFriend) throw new Error('already_friends');

  const pending = await db.collection('friend_requests').findOne({
    $or: [
      { fromUserId: fromId, toUserId: target._id, status: 'pending' },
      { fromUserId: target._id, toUserId: fromId, status: 'pending' }
    ]
  });
  if (pending) {
    if (String(pending.fromUserId) === String(target._id)) {
      return acceptFriendRequest({ userId: fromId, nickname: fromNickname, fromNickname: targetNick });
    }
    throw new Error('request_pending');
  }

  const now = new Date();
  await db.collection('friend_requests').insertOne({
    fromUserId: fromId,
    toUserId: target._id,
    fromNickname: cleanNickname(fromNickname),
    toNickname: target.nickname,
    status: 'pending',
    createdAt: now
  });
  return { ok: true, autoAccepted: false };
}

export async function acceptFriendRequest({ userId, nickname, fromNickname }) {
  await ensureIndexes();
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const from = await findUserByNickname(fromNickname);
  if (!from) throw new Error('user_not_found');

  const request = await db.collection('friend_requests').findOne({
    fromUserId: from._id,
    toUserId: id,
    status: 'pending'
  });
  if (!request) throw new Error('request_not_found');

  const now = new Date();
  await db.collection('friend_requests').updateOne(
    { _id: request._id },
    { $set: { status: 'accepted', acceptedAt: now } }
  );

  await db.collection('friends').insertOne({
    userId: from._id,
    friendUserId: id,
    userNickname: request.fromNickname,
    friendNickname: request.toNickname || cleanNickname(nickname),
    status: 'accepted',
    createdAt: now,
    acceptedAt: now
  });

  return { ok: true, nickname: request.fromNickname };
}

export async function removeFriend({ userId, friendNickname }) {
  await ensureIndexes();
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const friend = await findUserByNickname(friendNickname);
  if (!friend) throw new Error('user_not_found');

  await db.collection('friends').deleteMany({
    $or: [
      { userId: id, friendUserId: friend._id },
      { userId: friend._id, friendUserId: id }
    ]
  });
  await db.collection('friend_requests').deleteMany({
    $or: [
      { fromUserId: id, toUserId: friend._id },
      { fromUserId: friend._id, toUserId: id }
    ]
  });
  return { ok: true };
}

export async function rejectFriendRequest({ userId, fromNickname }) {
  await ensureIndexes();
  const db = await getDb();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const from = await findUserByNickname(fromNickname);
  if (!from) throw new Error('user_not_found');
  await db.collection('friend_requests').deleteOne({
    fromUserId: from._id,
    toUserId: id,
    status: 'pending'
  });
  return { ok: true };
}

export async function ensureFriendIndexes() {
  await ensureIndexes();
  const db = await getDb();
  await Promise.all([
    db.collection('friend_requests').createIndex({ fromUserId: 1, toUserId: 1 }, { unique: true }),
    db.collection('friend_requests').createIndex({ toUserId: 1, status: 1 }),
    db.collection('friends').createIndex({ userId: 1, friendUserId: 1 }, { unique: true }),
    db.collection('friends').createIndex({ friendUserId: 1 })
  ]);
}
