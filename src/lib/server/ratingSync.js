const pendingRatingSyncs = new Set();

export function looksLikeRatingData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (!entries.length) return false;
  return entries.some(([, player]) => {
    if (!player || typeof player !== 'object' || Array.isArray(player)) return false;
    return (
      'rating' in player ||
      'wins' in player ||
      'losses' in player ||
      'jobStats' in player ||
      'achievements' in player ||
      'equippedTitle' in player
    );
  });
}

export function isRatingJsonPath(inputPath) {
  const value = String(inputPath || '').toLowerCase();
  return (
    value.includes('tier') ||
    value.includes('rating') ||
    value.includes('rank') ||
    value.includes('player') ||
    value.includes('tierbot_data') ||
    value.includes('tier_player') ||
    value.includes('tier_players')
  ) && value.endsWith('.json');
}

export function queueRatingSync(data) {
  if (!looksLikeRatingData(data)) return;
  const task = import('./db.js')
    .then(({ saveRatings }) => saveRatings(data))
    .catch((e) => { console.warn('[ratingSync] DB 동기화 실패:', e?.message); })
    .finally(() => pendingRatingSyncs.delete(task));
  pendingRatingSyncs.add(task);
}

export async function flushRatingSyncs() {
  if (!pendingRatingSyncs.size) return;
  await Promise.allSettled(Array.from(pendingRatingSyncs));
}
