import { EventEmitter } from 'node:events';

export const realtime = new EventEmitter();
realtime.setMaxListeners(500);

export function publishRoom(room, payload) {
  realtime.emit(`room:${room}`, payload);
  realtime.emit('any', { room, payload });
}
