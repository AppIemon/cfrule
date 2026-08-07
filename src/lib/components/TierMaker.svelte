<script>
  import { browser } from '$app/environment';
  import { TIER_MAKER_JOBS, jobImageSrc } from '$lib/jobImages';

  const TIERS = ['OP', 'S', 'A', 'B', 'C', 'F'];
  const STORAGE_KEY = 'charynn-tierlist-v1';

  /** @typedef {{ name: string }} TierCard */

  /** @type {TierCard[]} */
  let pool = $state([]);
  /** @type {TierCard[][]} */
  let zones = $state(TIERS.map(() => []));
  /** @type {TierCard | null} */
  let dragging = $state(null);
  /** @type {'pool' | number | null} */
  let dragSource = $state(null);
  let overTarget = $state(/** @type {'pool' | number | null} */ (null));
  let savedHint = $state('');
  let ready = $state(false);

  function snapshot(cards) {
    return cards.map((card) => card.name);
  }

  function save() {
    if (!browser) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pool: snapshot(pool), zones: zones.map(snapshot) })
      );
      savedHint = `· 저장됨 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      savedHint = '· 저장 실패(용량 초과)';
    }
  }

  function populate() {
    pool = TIER_MAKER_JOBS.map((name) => ({ name }));
    zones = TIERS.map(() => []);
  }

  function load() {
    if (!browser) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.pool) || !Array.isArray(data.zones)) return false;
      pool = data.pool.map((name) => ({ name }));
      zones = TIERS.map((_, index) => (data.zones[index] || []).map((name) => ({ name })));
      const placed = new Set([...pool, ...zones.flat()].map((card) => card.name));
      const added = TIER_MAKER_JOBS.filter((name) => !placed.has(name));
      if (added.length) {
        pool = [...pool, ...added.map((name) => ({ name }))];
        save();
      }
      savedHint = added.length ? `· 새 직업 ${added.length}개 추가됨` : '· 불러옴';
      return true;
    } catch {
      return false;
    }
  }

  function removeCard(name) {
    pool = pool.filter((card) => card.name !== name);
    zones = zones.map((zone) => zone.filter((card) => card.name !== name));
  }

  function insertAt(target, index, name) {
    if (target === 'pool') {
      const next = [...pool];
      next.splice(index, 0, { name });
      pool = next;
      return;
    }
    zones = zones.map((zone, zoneIndex) => {
      if (zoneIndex !== target) return zone;
      const next = [...zone];
      next.splice(index, 0, { name });
      return next;
    });
  }

  function dropIndex(container, clientX) {
    const cards = container.querySelectorAll('.tm-card');
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) {
        return Number(card.dataset.index);
      }
    }
    return cards.length;
  }

  function onDragStart(card, source, event) {
    dragging = card;
    dragSource = source;
    event.dataTransfer?.setData('text/plain', card.name);
    event.dataTransfer?.setDragImage(event.currentTarget, 44, 44);
    requestAnimationFrame(() => event.currentTarget?.classList.add('tm-dragging'));
  }

  function onDragEnd(event) {
    event.currentTarget?.classList.remove('tm-dragging');
    dragging = null;
    dragSource = null;
    overTarget = null;
  }

  function onDragOver(target, event) {
    event.preventDefault();
    overTarget = target;
    if (!dragging) return;
    const container = event.currentTarget;
    const index = dropIndex(container, event.clientX);
    const name = dragging.name;
    if (dragSource === target) {
      const list = target === 'pool' ? pool : zones[target];
      const currentIndex = list.findIndex((card) => card.name === name);
      if (currentIndex < 0 || currentIndex === index || currentIndex + 1 === index) return;
      removeCard(name);
      const adjusted = currentIndex < index ? index - 1 : index;
      insertAt(target, adjusted, name);
      return;
    }
    removeCard(name);
    insertAt(target, index, name);
  }

  function onDrop(target, event) {
    event.preventDefault();
    overTarget = null;
    save();
  }

  function resetBoard() {
    if (!confirm('모든 배치를 초기화할까요? 추가한 이미지도 사라집니다.')) return;
    if (browser) localStorage.removeItem(STORAGE_KEY);
    populate();
    save();
  }

  function shufflePool() {
    pool = [...pool].sort(() => Math.random() - 0.5);
    save();
  }

  async function onUpload(event) {
    const files = [...(event.currentTarget.files || [])];
    event.currentTarget.value = '';
    for (const file of files) {
      const src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (!src) continue;
      const name = file.name.replace(/\.[^.]+$/, '');
      removeCard(name);
      pool = [...pool, { name, src }];
    }
    save();
  }

  function cardImage(card) {
    return card.src || jobImageSrc(card.name);
  }

  $effect(() => {
    if (!browser || ready) return;
    if (!load()) {
      populate();
      save();
    }
    ready = true;
  });
</script>

<section class="tier-maker" aria-label="직업 티어 메이커">
  <header class="tm-header">
    <div>
      <span class="tm-kicker">TIER MAKER</span>
      <h3>직업 <span>티어</span> 메이커</h3>
      <p class="tm-sub">카드를 끌어다 원하는 티어에 놓으세요.</p>
    </div>
    <div class="tm-controls">
      <label class="tm-btn tm-file">
        이미지 추가
        <input type="file" accept="image/*" multiple onchange={onUpload} />
      </label>
      <button type="button" class="tm-btn" onclick={shufflePool}>섞기</button>
      <button type="button" class="tm-btn tm-primary" onclick={resetBoard}>초기화</button>
    </div>
  </header>

  <div class="tm-board">
    {#each TIERS as tier, zoneIndex}
      <div class="tm-tier">
        <div class="tm-label tm-label-{tier}">{tier}</div>
        <div
          class="tm-dropzone"
          class:tm-over={overTarget === zoneIndex}
          role="list"
          ondragover={(event) => onDragOver(zoneIndex, event)}
          ondragleave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) overTarget = null;
          }}
          ondrop={(event) => onDrop(zoneIndex, event)}
        >
          {#each zones[zoneIndex] as card, index (card.name)}
            <div
              class="tm-card"
              class:tm-dragging={dragging?.name === card.name}
              draggable="true"
              data-index={index}
              role="listitem"
              ondragstart={(event) => onDragStart(card, zoneIndex, event)}
              ondragend={onDragEnd}
            >
              <img src={cardImage(card)} alt={card.name} />
              <span>{card.name}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="tm-pool-wrap">
    <div class="tm-pool-head">
      <h4>대기 중인 카드</h4>
      <span class="tm-counter">{pool.length}개 남음 <span class="tm-saved">{savedHint}</span></span>
    </div>
    <div
      class="tm-pool"
      class:tm-over={overTarget === 'pool'}
      role="list"
      ondragover={(event) => onDragOver('pool', event)}
      ondragleave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) overTarget = null;
      }}
      ondrop={(event) => onDrop('pool', event)}
    >
      {#each pool as card, index (card.name)}
        <div
          class="tm-card"
          class:tm-dragging={dragging?.name === card.name}
          draggable="true"
          data-index={index}
          role="listitem"
          ondragstart={(event) => onDragStart(card, 'pool', event)}
          ondragend={onDragEnd}
        >
          <img src={cardImage(card)} alt={card.name} />
          <span>{card.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <p class="tm-hint">팁: 카드 순서도 드래그로 바꿀 수 있습니다. 이미지를 추가하면 새 카드가 대기 목록에 들어갑니다.</p>
</section>

<style>
  .tier-maker {
    margin-top: 18px;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: linear-gradient(135deg, rgba(111, 92, 255, 0.08) 0%, var(--bg2) 45%, rgba(111, 92, 255, 0.04) 100%);
  }

  .tm-header {
    display: flex;
    gap: 18px;
    justify-content: space-between;
    align-items: end;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .tm-kicker {
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: var(--text3);
    margin-bottom: 4px;
  }

  .tm-header h3 {
    margin: 0;
    font-size: clamp(1.4rem, 4vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .tm-header h3 span { color: #8f7dff; }

  .tm-sub {
    margin: 8px 0 0;
    color: var(--text3);
    font-size: 13px;
    font-weight: 700;
  }

  .tm-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tm-btn {
    font: inherit;
    font-weight: 800;
    padding: 10px 12px;
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg3);
    color: var(--text);
    cursor: pointer;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.18);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .tm-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
  }

  .tm-btn.tm-primary {
    background: #6f5cff;
    color: #fff;
    border-color: #6f5cff;
  }

  .tm-file input { display: none; }

  .tm-board {
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg3);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.12);
  }

  .tm-tier {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    min-height: 104px;
    border-bottom: 2px solid var(--border);
  }

  .tm-tier:last-child { border-bottom: 0; }

  .tm-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.7rem;
    font-weight: 1000;
    letter-spacing: -0.05em;
    border-right: 2px solid var(--border);
    color: #17171c;
  }

  .tm-label-OP { background: #ff6978; }
  .tm-label-S { background: #ffb15b; }
  .tm-label-A { background: #fff16b; }
  .tm-label-B { background: #8fe58a; }
  .tm-label-C { background: #6cc9ff; }
  .tm-label-F { background: #c69cf4; }

  .tm-dropzone,
  .tm-pool {
    display: flex;
    align-content: flex-start;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px;
    min-height: 100px;
  }

  .tm-dropzone.tm-over,
  .tm-pool.tm-over {
    background: rgba(111, 92, 255, 0.12);
    outline: 2px dashed #6f5cff;
    outline-offset: -6px;
  }

  .tm-pool-wrap { margin-top: 18px; }

  .tm-pool-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .tm-pool-head h4 {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.08em;
    font-weight: 900;
  }

  .tm-counter {
    color: var(--text3);
    font-size: 12px;
    font-weight: 700;
  }

  .tm-saved { color: #8f7dff; }

  .tm-pool {
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg3);
    min-height: 130px;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .tm-card {
    width: 76px;
    position: relative;
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  .tm-card:active { cursor: grabbing; }

  .tm-card img {
    width: 76px;
    height: 76px;
    display: block;
    object-fit: cover;
    border: 2px solid var(--border);
    border-radius: 6px;
    background: var(--bg2);
    pointer-events: none;
  }

  .tm-card span {
    display: block;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
    font-weight: 800;
    padding-top: 4px;
  }

  .tm-card.tm-dragging { opacity: 0.35; }

  .tm-hint {
    margin: 14px 0 0;
    color: var(--text3);
    font-size: 12px;
  }

  @media (max-width: 640px) {
    .tm-tier {
      grid-template-columns: 58px minmax(0, 1fr);
      min-height: 86px;
    }

    .tm-label { font-size: 1.2rem; }

    .tm-card,
    .tm-card img {
      width: 58px;
    }

    .tm-card img { height: 58px; }

    .tm-card span { font-size: 10px; }
  }
</style>
