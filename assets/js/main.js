import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── i18n ───────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    nav_globe: '🌍 地球仪', nav_matches: '📅 赛程', nav_standings: '🏆 积分榜',
    nav_predict: '🔮 预测', nav_skill: '🛠 Skill',
    globe_hint: '🖱 拖拽旋转 · 滚轮缩放 · 点击查看球队',
    globe_title: '🌍 2026 FIFA 世界杯',
    globe_info: `📍 举办地：美国、加拿大、墨西哥\n📅 赛期：2026年6月11日 — 7月19日\n🏟 场馆：16个城市\n⚽ 参赛队：48支\n🎯 赛制：12小组 × 4队，前两名+8支最佳第三名晋级32强\n\n点击地球仪上的彩色标记查看球队信息`,
    matches_title: '📅 近期赛事', standings_title: '🏆 小组积分榜',
    predict_title: '🔮 今日赛事预测', skill_title: '🛠 Skill 使用指南',
    modal_recent: '本届赛事记录',
    status_live: '进行中', status_done: '已结束', status_pre: '未开始',
    col_pos: '#', col_team: '球队', col_p: '场', col_w: '胜', col_d: '平', col_l: '负', col_gd: '净球', col_pts: '分',
    click_detail: '点击球队行查看详情',
    no_matches: '暂无赛事数据',
    predict_source: '预测基于积分榜形势、赔率数据及历史战绩综合分析。仅供参考，不构成投注建议。',
    predict_odds_from: '赔率来源：DraftKings',
    predict_home_win: '主队胜', predict_draw: '平局', predict_away_win: '客队胜',
    lang_switch: 'EN',
  },
  en: {
    nav_globe: '🌍 Globe', nav_matches: '📅 Matches', nav_standings: '🏆 Standings',
    nav_predict: '🔮 Predict', nav_skill: '🛠 Skill',
    globe_hint: '🖱 Drag to rotate · Scroll to zoom · Click a team',
    globe_title: '🌍 FIFA World Cup 2026',
    globe_info: `📍 Hosts: USA, Canada, Mexico\n📅 Dates: Jun 11 – Jul 19, 2026\n🏟 Venues: 16 cities\n⚽ Teams: 48\n🎯 Format: 12 groups × 4 teams, top 2 + 8 best 3rd-place advance\n\nClick the colored markers on the globe to view team info`,
    matches_title: '📅 Recent Matches', standings_title: '🏆 Group Standings',
    predict_title: '🔮 Today\'s Predictions', skill_title: '🛠 Skill Guide',
    modal_recent: 'Tournament Record',
    status_live: 'LIVE', status_done: 'FT', status_pre: 'Upcoming',
    col_pos: '#', col_team: 'Team', col_p: 'P', col_w: 'W', col_d: 'D', col_l: 'L', col_gd: 'GD', col_pts: 'Pts',
    click_detail: 'Click a row to view team details',
    no_matches: 'No match data available',
    predict_source: 'Predictions based on standings, odds, and match history. For reference only.',
    predict_odds_from: 'Odds: DraftKings',
    predict_home_win: 'Home Win', predict_draw: 'Draw', predict_away_win: 'Away Win',
    lang_switch: '中',
  }
};

let lang = 'zh';
function t(key) { return I18N[lang][key] || key; }

function applyI18n() {
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.dataset.i18nKey;
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  document.getElementById('lang-btn').textContent = t('lang_switch');
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  teams: [], standings: [], recentMatches: [],
  teamIndex: {},   // abbr → enriched team obj
  teamMatches: {}, // abbr → matches involving that team
};

// ── Data ───────────────────────────────────────────────────────────────────
async function loadData() {
  progress(20, '加载数据...');
  const [standingsRes, teamsRes, recentRes] = await Promise.allSettled([
    fetch('data/standings.json').then(r => r.json()),
    fetch('data/teams.json').then(r => r.json()),
    fetch('data/recent.json').then(r => r.json()),
  ]);

  progress(65, '处理中...');

  if (standingsRes.status === 'fulfilled') {
    state.standings = standingsRes.value?.data?.standings ?? [];
    state.standings.forEach(group => {
      group.entries.forEach(entry => {
        state.teamIndex[entry.team.abbreviation] = {
          ...entry.team, group: group.name, standing: entry
        };
      });
    });
  }

  if (teamsRes.status === 'fulfilled') {
    state.teams = teamsRes.value?.data?.teams ?? [];
    state.teams.forEach(t => {
      if (state.teamIndex[t.abbreviation]) state.teamIndex[t.abbreviation].crest = t.crest;
    });
    // Also fill teams not in index
    state.teams.forEach(t => {
      if (!state.teamIndex[t.abbreviation]) state.teamIndex[t.abbreviation] = t;
    });
  }

  if (recentRes.status === 'fulfilled') {
    state.recentMatches = recentRes.value?.events ?? [];
    const updatedAt = recentRes.value?.updated_at;
    if (updatedAt) {
      document.getElementById('updated-at').textContent =
        (lang === 'zh' ? '更新: ' : 'Updated: ') +
        new Date(updatedAt + 'T00:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US');
    }
    // Index matches by team abbr
    state.recentMatches.forEach(match => {
      match.competitors.forEach(c => {
        const abbr = c.team.abbreviation;
        if (!state.teamMatches[abbr]) state.teamMatches[abbr] = [];
        state.teamMatches[abbr].push(match);
      });
    });
  }
}

function progress(pct, msg) {
  document.getElementById('load-fill').style.width = pct + '%';
  document.getElementById('load-text').textContent = msg;
}

// ── Globe ──────────────────────────────────────────────────────────────────
const GROUP_COLORS = [
  '#00d4ff','#ff6b35','#00ff9d','#ff3d8a','#a78bfa','#fbbf24',
  '#34d399','#f87171','#60a5fa','#fb923c','#e879f9','#4ade80'
];

function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  const wrap = document.getElementById('canvas-wrap');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  camera.position.z = 2.7;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.6;
  controls.maxDistance = 5;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // Lights
  scene.add(new THREE.AmbientLight(0x8899bb, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(5, 3, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x3366aa, 0.4);
  fill.position.set(-3, -2, -3);
  scene.add(fill);

  // Earth with texture
  const texLoader = new THREE.TextureLoader();
  const earthGeo = new THREE.SphereGeometry(1, 64, 64);

  // Use a reliable public earth texture
  const earthMat = new THREE.MeshPhongMaterial({
    color: 0x1a3a5c,
    emissive: 0x061224,
    specular: 0x2255aa,
    shininess: 25,
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  scene.add(earth);

  // Try to load earth texture (night lights style)
  texLoader.load(
    'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
    (tex) => { earthMat.map = tex; earthMat.needsUpdate = true; },
    undefined,
    () => {
      // fallback: try another CDN
      texLoader.load(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_2048.jpg/2048px-Land_ocean_ice_2048.jpg',
        (tex) => { earthMat.map = tex; earthMat.needsUpdate = true; }
      );
    }
  );

  // Country border lines (simplified GeoJSON-style lat/lon rings)
  // We draw a subtle graticule grid instead
  addGraticule(scene);

  // Atmosphere
  const atmMat = new THREE.MeshPhongMaterial({ color: 0x0088ff, transparent: true, opacity: 0.07, side: THREE.FrontSide });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 64), atmMat));

  // Stars
  const starVerts = [];
  for (let i = 0; i < 5000; i++) {
    const r = 35 + Math.random() * 15;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starVerts.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.055 })));

  // Team markers
  const markers = [];
  const markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const teamCoords = getTeamCoords();

  state.standings.forEach((group, gi) => {
    const color = new THREE.Color(GROUP_COLORS[gi % GROUP_COLORS.length]);
    group.entries.forEach(entry => {
      const abbr = entry.team.abbreviation;
      const coords = teamCoords[abbr];
      if (!coords) return;

      const [lat, lon] = coords;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      // Marker dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      dot.position.setFromSphericalCoords(1.02, phi, theta);
      dot.userData = { abbr, team: entry.team, group: group.name, standing: entry, groupIdx: gi };

      // Outer ring (pulse)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.025, 0.033, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      ring.position.copy(dot.position);
      ring.lookAt(0, 0, 0);
      ring.userData.isRing = true;

      // Spike line from surface
      const spikeGeo = new THREE.BufferGeometry().setFromPoints([
        dot.position.clone().multiplyScalar(0.99),
        dot.position.clone().multiplyScalar(1.04)
      ]);
      const spike = new THREE.Line(spikeGeo, new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true }));

      markerGroup.add(dot);
      markerGroup.add(ring);
      markerGroup.add(spike);
      markers.push({ dot, ring });
    });
  });

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const dotMeshes = markers.map(m => m.dot);

  canvas.addEventListener('click', e => {
    setMouse(e, canvas, mouse);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dotMeshes);
    if (hits.length) {
      controls.autoRotate = false;
      showTeamCard(hits[0].object.userData);
      setTimeout(() => { controls.autoRotate = true; }, 5000);
    } else {
      document.getElementById('team-card').classList.remove('show');
    }
  });

  canvas.addEventListener('mousemove', e => {
    setMouse(e, canvas, mouse);
    raycaster.setFromCamera(mouse, camera);
    canvas.style.cursor = raycaster.intersectObjects(dotMeshes).length ? 'pointer' : 'grab';
  });

  window.addEventListener('resize', () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  let tick = 0;
  function animate() {
    requestAnimationFrame(animate);
    tick += 0.025;
    markers.forEach(({ ring }, i) => {
      const s = 1 + 0.18 * Math.sin(tick + i * 0.5);
      ring.scale.setScalar(s);
      ring.material.opacity = 0.25 + 0.2 * Math.sin(tick + i * 0.5);
    });
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function setMouse(e, canvas, mouse) {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function addGraticule(scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0x1a3d66, opacity: 0.35, transparent: true });
  const r = 1.001;
  // Latitude lines every 30°
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    const phi = (90 - lat) * Math.PI / 180;
    for (let lon = 0; lon <= 360; lon += 4) {
      const theta = lon * Math.PI / 180;
      pts.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  // Longitude lines every 30°
  for (let lon = 0; lon < 360; lon += 30) {
    const pts = [];
    const theta = lon * Math.PI / 180;
    for (let lat = -90; lat <= 90; lat += 3) {
      const phi = (90 - lat) * Math.PI / 180;
      pts.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
}

function showTeamCard(data) {
  const team = state.teamIndex[data.abbr] || {};
  const s = data.standing;
  const crest = team.crest || data.team?.crest || '';

  document.getElementById('tc-flag').src = crest;
  document.getElementById('tc-name').textContent = data.team?.name || data.abbr;
  document.getElementById('tc-sub').textContent = data.group + (s ? ` · #${s.position}` : '');
  document.getElementById('tc-stats').innerHTML = s ? `
    <div><div class="tc-stat-val">${s.points}</div><div class="tc-stat-lbl">${lang==='zh'?'积分':'Pts'}</div></div>
    <div><div class="tc-stat-val">${s.won}</div><div class="tc-stat-lbl">${lang==='zh'?'胜':'W'}</div></div>
    <div><div class="tc-stat-val">${s.drawn}</div><div class="tc-stat-lbl">${lang==='zh'?'平':'D'}</div></div>
    <div><div class="tc-stat-val">${s.goals_for}:${s.goals_against}</div><div class="tc-stat-lbl">${lang==='zh'?'进失球':'GF:GA'}</div></div>
  ` : '';

  document.getElementById('team-card').classList.add('show');
}

// ── Matches render ─────────────────────────────────────────────────────────
function renderMatches() {
  const container = document.getElementById('matches-list');
  const matches = [...state.recentMatches].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  if (!matches.length) {
    container.innerHTML = `<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">${t('no_matches')}</p>`;
    return;
  }

  container.innerHTML = matches.map(match => matchCardHTML(match)).join('');

  container.querySelectorAll('.match-card').forEach((card, i) => {
    card.addEventListener('click', () => showMatchDetail(matches[i]));
  });
}

function matchCardHTML(match) {
  const home = match.competitors.find(c => c.qualifier === 'home');
  const away = match.competitors.find(c => c.qualifier === 'away');
  const homeT = state.teamIndex[home?.team?.abbreviation] || home?.team || {};
  const awayT = state.teamIndex[away?.team?.abbreviation] || away?.team || {};
  const kickoff = new Date(match.start_time);
  const dateStr = kickoff.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai' });
  const timeStr = kickoff.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' });
  const isLive = match.status === 'in_progress';
  const isDone = match.status === 'closed' || match.status === 'complete';
  const statusLabel = isLive ? t('status_live') : isDone ? t('status_done') : timeStr;
  const statusClass = isLive ? ' live' : isDone ? ' done' : '';
  const venue = match.venue?.city || '';
  const odds = match.odds?.moneyline;
  const scoreDisplay = (isDone || isLive) ? `${match.scores?.home ?? 0} : ${match.scores?.away ?? 0}` : 'vs';

  return `<div class="match-card">
    <div class="match-meta">
      <span>${venue}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="match-date-badge">${dateStr}</span>
        <span style="color:${isLive?'var(--red)':'var(--muted)'}">${isLive?'🔴 ':''}${statusLabel}</span>
      </div>
    </div>
    <div class="match-teams">
      <div class="team-info">
        <img class="team-flag" src="${homeT.crest||''}" alt="" onerror="this.style.display='none'">
        <div class="team-name">${home?.team?.name||'—'}</div>
      </div>
      <div class="score-box">
        <div class="score">${scoreDisplay}</div>
        <div class="score-sub${statusClass}">${isDone?'FT':isLive?'LIVE':''}</div>
      </div>
      <div class="team-info away">
        <img class="team-flag" src="${awayT.crest||''}" alt="" onerror="this.style.display='none'">
        <div class="team-name">${away?.team?.name||'—'}</div>
      </div>
    </div>
    ${odds ? `<div class="odds-row">
      <div class="odd-chip">${t('predict_home_win')}<span>${odds.home}</span></div>
      <div class="odd-chip">${t('predict_draw')}<span>${odds.draw}</span></div>
      <div class="odd-chip">${t('predict_away_win')}<span>${odds.away}</span></div>
    </div>` : ''}
  </div>`;
}

// ── Standings render ───────────────────────────────────────────────────────
function renderStandings() {
  const container = document.getElementById('standings-list');
  if (!state.standings.length) return;

  container.innerHTML = state.standings.map((group, gi) => {
    const color = GROUP_COLORS[gi % GROUP_COLORS.length];
    const rows = [...group.entries]
      .sort((a, b) => a.position - b.position)
      .map((e, idx) => {
        const teamData = state.teamIndex[e.team.abbreviation] || e.team;
        const cls = idx === 0 ? 'qualified' : idx === 1 ? 'qualified' : idx === 2 ? 'third' : '';
        const gdClass = e.goal_difference > 0 ? 'gd-pos' : e.goal_difference < 0 ? 'gd-neg' : '';
        const gdStr = e.goal_difference > 0 ? '+' + e.goal_difference : String(e.goal_difference);
        return `<tr class="${cls}" data-abbr="${e.team.abbreviation}" style="cursor:pointer">
          <td class="pos">${e.position}</td>
          <td><div class="team-cell">
            <img src="${teamData.crest||e.team.crest||''}" alt="" onerror="this.style.display='none'">
            ${lang==='zh' ? e.team.name : e.team.abbreviation}
          </div></td>
          <td>${e.played}</td>
          <td>${e.won}</td><td>${e.drawn}</td><td>${e.lost}</td>
          <td class="${gdClass}">${gdStr}</td>
          <td class="pts">${e.points}</td>
        </tr>`;
      }).join('');

    return `<div class="group-block" data-group="${gi}">
      <div class="group-header" onclick="toggleGroup(${gi})">
        <span class="group-dot" style="background:${color}"></span>
        <span class="group-name-text">${group.name}</span>
        <span class="group-chevron">▼</span>
      </div>
      <div class="group-body">
        <table class="standings-table">
          <thead><tr>
            <th>${t('col_pos')}</th><th>${t('col_team')}</th>
            <th>${t('col_p')}</th><th>${t('col_w')}</th>
            <th>${t('col_d')}</th><th>${t('col_l')}</th>
            <th>${t('col_gd')}</th><th>${t('col_pts')}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="font-size:10px;color:var(--muted);padding:6px 8px">${t('click_detail')}</div>
      </div>
    </div>`;
  }).join('');

  // Row click → team modal
  container.querySelectorAll('[data-abbr]').forEach(row => {
    row.addEventListener('click', () => openTeamModal(row.dataset.abbr));
  });
}

window.toggleGroup = function(gi) {
  const block = document.querySelector(`.group-block[data-group="${gi}"]`);
  if (block) block.classList.toggle('collapsed');
};

// ── Team modal ─────────────────────────────────────────────────────────────
function openTeamModal(abbr) {
  const team = state.teamIndex[abbr];
  if (!team) return;
  const s = team.standing;
  const matches = state.teamMatches[abbr] || [];

  document.getElementById('modal-flag').src = team.crest || '';
  document.getElementById('modal-name').textContent = team.name;
  document.getElementById('modal-sub').textContent = `${team.group || ''} · ${abbr}`;

  if (s) {
    const gdStr = s.goal_difference > 0 ? '+' + s.goal_difference : String(s.goal_difference);
    document.getElementById('modal-stats').innerHTML = [
      [s.points, lang==='zh'?'积分':'Pts'],
      [s.won, lang==='zh'?'胜':'W'],
      [s.drawn, lang==='zh'?'平':'D'],
      [s.lost, lang==='zh'?'负':'L'],
      [s.goals_for, lang==='zh'?'进球':'GF'],
      [s.goals_against, lang==='zh'?'失球':'GA'],
      [gdStr, lang==='zh'?'净球':'GD'],
      [s.position, lang==='zh'?'位次':'Pos'],
    ].map(([v,l]) => `<div class="modal-stat"><div class="modal-stat-val">${v}</div><div class="modal-stat-lbl">${l}</div></div>`).join('');
  }

  const matchRows = matches.slice(0,5).map(m => {
    const isHome = m.competitors.find(c=>c.qualifier==='home')?.team?.abbreviation === abbr;
    const myCmp = m.competitors.find(c=>c.team.abbreviation===abbr);
    const oppCmp = m.competitors.find(c=>c.team.abbreviation!==abbr);
    const myScore = myCmp?.score ?? 0;
    const oppScore = oppCmp?.score ?? 0;
    const isDone = m.status === 'closed' || m.status === 'complete';
    let result = '', badge = '';
    if (isDone) {
      result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';
      badge = `<span class="modal-result-badge result-${result}">${result}</span>`;
    }
    const kickoff = new Date(m.start_time);
    const dateStr = kickoff.toLocaleDateString(lang==='zh'?'zh-CN':'en-US', {month:'numeric',day:'numeric',timeZone:'Asia/Shanghai'});
    return `<div class="modal-match-row">
      <span>${dateStr}</span>
      <span style="font-weight:600">${oppCmp?.team?.name||'?'}</span>
      <span>${isDone ? myScore+':'+oppScore : (lang==='zh'?'未开始':'TBD')}</span>
      ${badge}
    </div>`;
  }).join('') || `<div style="font-size:11px;color:var(--muted);padding:10px 0">${t('no_matches')}</div>`;

  document.getElementById('modal-matches').innerHTML = matchRows;

  const modal = document.getElementById('team-modal');
  modal.classList.add('show');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('team-modal').classList.remove('show');
});
document.getElementById('team-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('team-modal')) {
    document.getElementById('team-modal').classList.remove('show');
  }
});

// ── Predictions ────────────────────────────────────────────────────────────
function renderPredictions() {
  const container = document.getElementById('predict-list');
  const upcoming = state.recentMatches.filter(m => m.status === 'not_started' || m.status === 'scheduled');

  if (!upcoming.length) {
    // Show historical predictions for closed matches as demo
    const closed = state.recentMatches.filter(m => m.status === 'closed' || m.status === 'complete').slice(0,3);
    if (!closed.length) {
      container.innerHTML = `<p style="color:var(--muted);font-size:12px;padding:16px;text-align:center">${t('no_matches')}</p>`;
      return;
    }
    container.innerHTML = closed.map(m => predictionCardHTML(m, true)).join('') +
      `<div class="predict-source-note">${t('predict_source')}</div>`;
    return;
  }

  container.innerHTML = upcoming.slice(0, 6).map(m => predictionCardHTML(m, false)).join('') +
    `<div class="predict-source-note">${t('predict_source')}</div>`;
}

function predictionCardHTML(match, isResult) {
  const home = match.competitors.find(c=>c.qualifier==='home');
  const away = match.competitors.find(c=>c.qualifier==='away');
  const homeT = state.teamIndex[home?.team?.abbreviation] || home?.team || {};
  const awayT = state.teamIndex[away?.team?.abbreviation] || away?.team || {};
  const homeS = homeT.standing;
  const awayS = awayT.standing;
  const odds = match.odds?.moneyline;
  const kickoff = new Date(match.start_time);
  const timeStr = kickoff.toLocaleString(lang==='zh'?'zh-CN':'en-US', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'});

  // Convert American odds to probability
  function oddsToPct(american) {
    if (!american) return null;
    const n = parseInt(american);
    if (isNaN(n)) return null;
    return n < 0 ? (-n / (-n + 100)) : (100 / (n + 100));
  }

  let homeWinPct, drawPct, awayWinPct;
  if (odds) {
    const raw = {
      h: oddsToPct(odds.home) || 0.33,
      d: oddsToPct(odds.draw) || 0.27,
      a: oddsToPct(odds.away) || 0.40,
    };
    const sum = raw.h + raw.d + raw.a;
    homeWinPct = Math.round(raw.h / sum * 100);
    drawPct = Math.round(raw.d / sum * 100);
    awayWinPct = 100 - homeWinPct - drawPct;
  } else {
    // Fallback: use standings form
    const hPts = homeS?.points ?? 1, aPts = awayS?.points ?? 1;
    const total = hPts + aPts + 2;
    homeWinPct = Math.round(hPts / total * 100);
    awayWinPct = Math.round(aPts / total * 100);
    drawPct = 100 - homeWinPct - awayWinPct;
  }

  const favourite = homeWinPct > awayWinPct
    ? (home?.team?.name || '?') + (lang==='zh'?' 胜算更大':' more likely to win')
    : (away?.team?.name || '?') + (lang==='zh'?' 胜算更大':' more likely to win');

  const resultNote = isResult
    ? (lang==='zh'?`实际结果：${match.scores?.home??0}:${match.scores?.away??0}`:`Result: ${match.scores?.home??0}:${match.scores?.away??0}`)
    : '';

  return `<div class="predict-card">
    <div class="predict-match-header">
      <div class="predict-teams">
        <img src="${homeT.crest||''}" style="width:18px;height:13px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">
        ${home?.team?.name||'?'}
        <span style="color:var(--muted);margin:0 6px">vs</span>
        ${away?.team?.name||'?'}
        <img src="${awayT.crest||''}" style="width:18px;height:13px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-left:4px" onerror="this.style.display='none'">
      </div>
      <div class="predict-time">${timeStr}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px">
      <span style="color:var(--accent)">${homeWinPct}%</span>
      <span>${drawPct}%</span>
      <span style="color:var(--accent2)">${awayWinPct}%</span>
    </div>
    <div class="predict-bars">
      <div class="bar-home" style="width:${homeWinPct}%"></div>
      <div class="bar-draw" style="width:${drawPct}%"></div>
      <div class="bar-away" style="width:${awayWinPct}%"></div>
    </div>
    <div class="predict-labels">
      <span>${t('predict_home_win')}</span>
      <span>${t('predict_draw')}</span>
      <span>${t('predict_away_win')}</span>
    </div>
    <div class="predict-verdict">
      ${favourite}${resultNote ? ` · <strong style="color:var(--gold)">${resultNote}</strong>` : ''}
      ${odds ? `<br><span style="font-size:9px;color:var(--muted)">${t('predict_odds_from')}</span>` : ''}
    </div>
    <div class="predict-disclaimer">${lang==='zh'?'⚠ AI预测，仅供参考':'⚠ AI prediction, for reference only'}</div>
  </div>`;
}

// ── Skill guide ────────────────────────────────────────────────────────────
function renderSkillGuide() {
  const el = document.getElementById('skill-guide-content');
  if (lang === 'zh') {
    el.innerHTML = `
<h3>什么是 World Cup Skill？</h3>
<p>这是一个 <strong>Claude Code Skill</strong>，让 Claude 可以直接查询世界杯实时数据、提供分析预测，并打开这个3D可视化页面。</p>

<h3>方式一：通过 Claude Code 对话</h3>
<p>在 Claude Code 终端里直接用自然语言提问：</p>
<pre>你：今天世界杯有哪些比赛？
你：巴西队的积分榜情况怎么样？
你：帮我预测巴西 vs 摩洛哥的比赛结果
你：打开世界杯可视化页面</pre>

<h3>方式二：通过 /world-cup 指令</h3>
<pre>/world-cup 今天的赛程
/world-cup 积分榜
/world-cup 预测今晚比赛</pre>

<h3>数据更新频率</h3>
<div class="tip">GitHub Actions 每 30 分钟自动抓取最新数据，页面刷新即可获取最新积分和比分。</div>

<h3>数据来源</h3>
<p>• 赛程/积分榜：<code>sports-skills</code> CLI（ESPN数据）<br>
• 实时比分：WebSearch 补充<br>
• 赔率：DraftKings<br>
• 预测：Claude 基于赔率 + 积分数据推理</p>

<h3>部署地址</h3>
<pre>https://skyseraph.github.io/world-cup-2026</pre>`;
  } else {
    el.innerHTML = `
<h3>What is the World Cup Skill?</h3>
<p>A <strong>Claude Code Skill</strong> that lets Claude query live World Cup data, provide predictions, and open this 3D visualization.</p>

<h3>Option 1: Chat in Claude Code</h3>
<pre>You: What matches are today?
You: Show me Brazil's standing
You: Predict Brazil vs Morocco
You: Open the World Cup dashboard</pre>

<h3>Option 2: /world-cup command</h3>
<pre>/world-cup today's schedule
/world-cup standings
/world-cup predict tonight's matches</pre>

<h3>Data refresh</h3>
<div class="tip">GitHub Actions fetches fresh data every 30 minutes. Reload the page to get the latest scores.</div>

<h3>Data sources</h3>
<p>• Schedule/Standings: <code>sports-skills</code> CLI (ESPN)<br>
• Live scores: WebSearch fallback<br>
• Odds: DraftKings<br>
• Predictions: Claude reasoning on odds + form</p>

<h3>Live URL</h3>
<pre>https://skyseraph.github.io/world-cup-2026</pre>`;
  }
}

// ── Globe info panel ───────────────────────────────────────────────────────
function renderGlobeInfo() {
  document.getElementById('globe-info').innerHTML =
    t('globe_info').split('\n').map(line => `<p>${line}</p>`).join('');
}

// ── Nav ────────────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.view)?.classList.add('active');
    });
  });
}

// ── Language toggle ────────────────────────────────────────────────────────
document.getElementById('lang-btn').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  applyI18n();
  renderGlobeInfo();
  renderMatches();
  renderStandings();
  renderPredictions();
  renderSkillGuide();
});

// ── Team coordinates (lat, lon) ────────────────────────────────────────────
function getTeamCoords() {
  return {
    // Group A
    MEX:[23.6,-102.5], KOR:[35.9,127.8], RSA:[-29.0,25.0], CZE:[49.8,15.5],
    // Group B
    BRA:[-14.2,-51.9], MAR:[31.8,-7.1], SCO:[56.5,-4.2], HAI:[18.9,-72.3],
    // Group C
    ARG:[-38.4,-63.6], CRO:[45.1,15.2], EGY:[26.8,30.8], DOM:[18.7,-70.2],
    // Group D
    FRA:[46.2,2.2], NGA:[9.1,8.7], JPN:[36.2,138.3], ECU:[-1.8,-78.2],
    // Group E
    ESP:[40.5,-3.7], SEN:[14.5,-14.5], AUS:[-25.3,133.8], VEN:[6.4,-66.6],
    // Group F
    GER:[51.2,10.5], BEL:[50.5,4.5], CHI:[-35.7,-71.5], ELS:[13.8,-88.9],
    // Group G
    POR:[39.4,-8.2], USA:[37.1,-95.7], URU:[-32.5,-55.8], ALG:[28.0,1.7],
    // Group H
    NED:[52.1,5.3], NZL:[-40.9,174.9], CMR:[3.9,11.5], CHN:[35.9,104.2],
    // Group I
    ENG:[52.4,-1.9], IRN:[32.4,53.7], PAN:[8.5,-80.8], TUN:[33.9,9.6],
    // Group J
    COL:[4.6,-74.1], DEN:[56.3,9.5], KSA:[23.9,45.1], TRI:[10.7,-61.5],
    // Group K
    SUI:[46.8,8.2], QAT:[25.4,51.2], HND:[15.2,-86.2], WAL:[52.1,-3.8],
    // Group L
    UKR:[48.4,31.2], NOR:[60.5,8.5], CAN:[56.1,-106.3], BIH:[44.0,17.7],
    PAR:[-23.4,-58.4], PRY:[-23.4,-58.4],
    // extras
    PER:[-9.2,-75.0], BOL:[-16.3,-63.6], CRC:[9.7,-83.8], GUA:[15.8,-90.2],
    JAM:[17.9,-77.3], HON:[15.2,-86.2], SLV:[13.8,-88.9],
    GAB:[-0.8,11.6], GHA:[7.9,-1.0], CIV:[7.5,-5.5], TGO:[8.6,0.8],
    GNB:[11.8,-15.2], CMV:[15.0,-24.0], SSD:[6.9,31.3],
    IND:[20.6,79.0], UZB:[41.3,64.6], PHI:[13.0,122.5], THA:[15.9,100.9],
    IDN:[-0.8,113.9], VIE:[14.1,108.3],
    CUW:[12.2,-69.0], ANT:[12.5,-70.0],
    // common abbrs fallback
    RSA:[-29.0,25.0], ZIM:[-20.0,30.0], MOZ:[-18.7,35.5],
  };
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function main() {
  await loadData();
  progress(90, '渲染界面...');
  applyI18n();
  renderGlobeInfo();
  renderMatches();
  renderStandings();
  renderPredictions();
  renderSkillGuide();
  initNav();
  progress(100, '完成!');
  initGlobe();

  setTimeout(() => {
    const l = document.getElementById('loading');
    l.classList.add('hidden');
    setTimeout(() => l.remove(), 600);
  }, 300);
}

main();
