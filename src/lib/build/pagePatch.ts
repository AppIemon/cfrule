export function patchPageSvelte(code: string): string {
  if (!code.includes("let rankLoading")) {
    code = code.replace(
      "let rankMode = $state('overall');\n  let rankJob = $state('');",
      "let rankMode = $state('overall');\n  let rankJob = $state('');\n  let rankLoading = $state(false);\n  const abilityNeedsTarget = new Set(['조작','복제','초토화','포획','사구아','2음절','시적 허용','삼키기','브레스','사형 선고','DNA파괴','쪼개기','체크메이트','교환','울음','거짓 보도','거짓 뉴스','찌르기','가르기','수리','핵분열','무량공처','조개','깨부수기','Backspace','Tab']);"
    );
  }

  if (!code.includes("const myRankWindow")) {
    code = code.replace(
      "const jobRankingList = $derived(\n    Object.entries(jobRanking)\n      .sort((a, b) => (b[1][0]?.wins || 0) - (a[1][0]?.wins || 0))\n  );",
      `const jobRankingList = $derived(
    Object.entries(jobRanking)
      .sort((a, b) => (b[1][0]?.wins || 0) - (a[1][0]?.wins || 0))
  );

  const overallRankingRows = $derived.by(() => {
    const rows = (ranking?.ranking || []).map((player, index) => ({ ...player, rank: index + 1 }));
    const keep = new Map();
    for (const row of rows.slice(0, 10)) keep.set(row.rank, row);
    const meIndex = rows.findIndex((row) => row.name === nickname);
    if (meIndex !== -1) {
      for (const idx of [meIndex - 1, meIndex, meIndex + 1]) {
        if (rows[idx]) keep.set(rows[idx].rank, rows[idx]);
      }
    }
    return Array.from(keep.values()).sort((a, b) => a.rank - b.rank);
  });

  const myRankWindow = $derived.by(() => {
    const rows = ranking?.ranking || [];
    const idx = rows.findIndex((row) => row.name === nickname);
    if (idx === -1) return [];
    return [rows[idx - 1], rows[idx], rows[idx + 1]].filter(Boolean).map((row) => ({ ...row, rank: rows.indexOf(row) + 1 }));
  });`
    );
  }

  code = code.replace(
    /async function loadRanking\(\) \{\n\s*ranking = await request\('\/api\/ranking'\);\n\s*\}/,
    `async function loadRanking() {
    rankLoading = true;
    try {
      ranking = await request('/api/ranking');
    } finally {
      rankLoading = false;
    }
  }`
  );

  code = code.replace(
    /const cpuThinkLog = \$derived\([\s\S]*?\n  \);\n  const isBanPhase/,
    "const cpuThinkLog = $derived([]);\n  const isBanPhase"
  );

  code = code.replace(
    /\{#if !cpuThinking && cpuThinkLog\.length\}[\s\S]*?\{\/if\}\n\s*<\/main>/,
    "</main>"
  );

  code = code.replace(/\{#if cpuThinking\}[\s\S]*?\{\/if\}\n\s*<\/div>\n\s*\{#if !cpuThinking && cpuThinkLog\.length\}/, "</div>\n            {#if false && cpuThinkLog.length}");

  if (!code.includes("function abilityRequiresTarget")) {
    code = code.replace(
      "async function useAbility(name) {\n    await send(`2${name}${ability.trim() && !ability.trim().startsWith(name) ? ` ${ability.trim()}` : ''}`);\n    ability = '';\n  }",
      `function abilityRequiresTarget(name) {
    return abilityNeedsTarget.has(name);
  }

  async function useAbility(name) {
    const target = ability.trim();
    if (abilityRequiresTarget(name) && !target) {
      error = name + ' 능력은 대상이 필요합니다.';
      return;
    }
    await send(\`2\${name}\${target && !target.startsWith(name) ? \` \${target}\` : ''}\`);
    ability = '';
  }`
    );
  }

  code = code.replace(
    /<input class="ability-input"[^>]*>/,
    `{#if abilityButtons.some((name) => abilityRequiresTarget(name))}
                <input class="ability-input" bind:value={ability} placeholder="능력 대상 / 값" />
              {/if}`
  );

  code = code.replace(/생각 과정 보기/g, '');

  // Rank tab content patch: append a native Svelte rank panel near existing ranking area if absent.
  if (!code.includes('rank-slim-panel')) {
    code = code.replace(
      "{:else if tab === 'analysis'}",
      `{#if tab === 'rank'}
    <section class="rank-slim-panel">
      <div class="rank-slim-head">
        <h2>랭킹</h2>
        <button class="accent-btn" onclick={loadRanking}>새로고침</button>
      </div>
      {#if rankLoading}
        <div class="rank-loading">랭킹을 불러오는 중입니다...</div>
      {:else if !ranking?.ranking?.length}
        <div class="rank-loading">랭킹 데이터가 아직 없습니다.</div>
      {:else}
        <div class="rank-tabs">
          <button class:active={rankMode === 'overall'} onclick={() => (rankMode = 'overall')}>전체 TOP 10 + 내 순위</button>
          <button class:active={rankMode === 'job'} onclick={() => (rankMode = 'job')}>직업별</button>
        </div>
        {#if rankMode === 'overall'}
          <div class="rank-list compact-rank">
            {#each overallRankingRows as player, idx (player.name + player.rank)}
              {#if idx > 0 && player.rank > overallRankingRows[idx - 1].rank + 1}
                <div class="rank-gap">···</div>
              {/if}
              {@const tier = getTierInfo(player.rating)}
              <div class="rank-card" class:my-rank={player.name === nickname}>
                <div class="rank-num">#{player.rank}</div>
                <div class="rank-main">
                  <div class="rank-name">{player.name}{#if player.equippedTitle}<span class="rank-title">[{player.equippedTitle}]</span>{/if}</div>
                  <div class="rank-meta">{player.wins || 0}승 {player.losses || 0}패 · 달성률 {player.achievementRate || 0}%</div>
                </div>
                <div class="rank-tier-badge" style="--tier-color:{tier.color}">{tier.name}</div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="job-rank-layout">
            <select bind:value={rankJob}>
              <option value="">직업 선택</option>
              {#each Object.keys(ranking.jobRanking || jobRanking).sort() as job}<option value={job}>{job}</option>{/each}
            </select>
            {#if rankJob}
              <div class="rank-list compact-rank">
                {#each ((ranking.jobRanking?.[rankJob] || jobRanking[rankJob] || [])).slice(0, 10) as row, i}
                  <div class="rank-card">
                    <div class="rank-num">#{i + 1}</div>
                    <div class="rank-main">
                      <div class="rank-name">{row.name}{#if row.equippedTitle}<span class="rank-title">[{row.equippedTitle}]</span>{/if}</div>
                      <div class="rank-meta">{row.wins || 0}승 {row.losses || 0}패 · 승률 {row.winRate || 0}%</div>
                    </div>
                    <div class="rank-tier-badge">{row.rating || 0}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </section>
  {/if}

    {:else if tab === 'analysis'}`
    );
  }

  if (!code.includes('.rank-slim-panel')) {
    code = code.replace(
      "</style>",
      `.rank-slim-panel { max-width: 920px; margin: 28px auto; padding: 22px; border-radius: 24px; background: rgba(255,255,255,.92); border: 1px solid rgba(34,197,94,.18); box-shadow: 0 18px 55px rgba(22,101,52,.10); }
  .rank-slim-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .rank-loading { padding: 28px; text-align: center; color: #15803d; font-weight: 900; }
  .rank-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
  .rank-tabs button { padding: 9px 12px; border-radius: 999px; border: 1px solid rgba(34,197,94,.2); background: #f0fdf4; color: #166534; font-weight: 800; cursor: pointer; }
  .rank-tabs button.active { background: #16a34a; color: white; }
  .compact-rank { display: flex; flex-direction: column; gap: 8px; }
  .rank-gap { text-align: center; color: #16a34a; font-weight: 900; padding: 4px; }
  .rank-card.my-rank { outline: 2px solid rgba(34,197,94,.42); background: #f0fdf4; }
  .rank-title { margin-left: 6px; color: #a16207; font-size: 11px; }
  .job-rank-layout select { width: 100%; padding: 10px 12px; border-radius: 14px; border: 1px solid rgba(34,197,94,.24); margin-bottom: 14px; }
</style>`
    );
  }

  return code;
}
