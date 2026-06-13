import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  teams: [],        // flat array of team objects
  standings: [],    // array of group objects
  todayMatches: [], // today's WC matches
  teamIndex: {},    // abbr → team with standing info
};

// ── Data loading ───────────────────────────────────────────────────────────
async function loadData() {
  setLoadText('加载赛程数据...', 20);
  const [todayRes, standingsRes, teamsRes] = await Promise.allSettled([
    fetch('data/today.json').then(r => r.json()),
    fetch('data/standings.json').then(r => r.json()),
    fetch('data/teams.json').then(r => r.json()),
  ]);

  setLoadText('处理数据...', 70);

  if (standingsRes.status === 'fulfilled') {
    state.standings = standingsRes.value?.data?.standings ?? [];
    // Build team index with group info
    state.standings.forEach(group => {
      group.entries.forEach(entry => {
        const abbr = entry.team.abbreviation;
        state.teamIndex[abbr] = { ...entry.team, group: group.name, standing: entry };
      });
    });
  }

  if (teamsRes.status === 'fulfilled') {
    state.teams = teamsRes.value?.data?.teams ?? [];
    // Merge crest into teamIndex
    state.teams.forEach(t => {
      if (state.teamIndex[t.abbreviation]) {
        state.teamIndex[t.abbreviation].crest = t.crest;
      }
    });
  }

  if (todayRes.status === 'fulfilled') {
    state.todayMatches = todayRes.value?.events ?? [];
    const updatedAt = todayRes.value?.updated_at;
    if (updatedAt) {
      document.getElementById('updated-at').textContent =
        '更新: ' + new Date(updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
    }
  }

  setLoadText('渲染3D地球...', 90);
}

function setLoadText(msg, pct) {
  document.getElementById('load-text').textContent = msg;
  document.getElementById('load-fill').style.width = pct + '%';
}

// ── Globe ──────────────────────────────────────────────────────────────────
function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  const wrap = document.getElementById('canvas-wrap');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);

  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  camera.position.z = 2.8;

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.6;
  controls.maxDistance = 5;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;

  // Ambient + directional light
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  // Globe sphere
  const geo = new THREE.SphereGeometry(1, 64, 64);

  // Earth texture from a public CDN
  const loader = new THREE.TextureLoader();
  const earthTex = loader.load(
    'https://cdn.jsdelivr.net/gh/turban/Leaflet.Graticule@master/TileLayer.GraticuleCanvas.js',
    undefined, undefined,
    () => {} // fallback on error — we use a procedural texture instead
  );

  // Procedural dark ocean material as base
  const mat = new THREE.MeshPhongMaterial({
    color: 0x0a2140,
    emissive: 0x030d1a,
    specular: 0x224466,
    shininess: 30,
  });

  const globe = new THREE.Mesh(geo, mat);
  scene.add(globe);

  // Atmosphere glow
  const atmGeo = new THREE.SphereGeometry(1.025, 64, 64);
  const atmMat = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide,
  });
  scene.add(new THREE.Mesh(atmGeo, atmMat));

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 4000; i++) {
    const r = 30 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starVerts.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));

  // Country markers
  const markers = [];
  const markerGroup = new THREE.Group();
  scene.add(markerGroup);

  // World Cup 2026 teams with approximate lat/lon
  const teamCoords = getTeamCoords();
  const groupColors = [
    '#00d4ff','#ff6b35','#00ff9d','#ff3d8a','#a78bfa','#fbbf24',
    '#34d399','#f87171','#60a5fa','#fb923c','#e879f9','#4ade80'
  ];

  state.standings.forEach((group, gi) => {
    const color = new THREE.Color(groupColors[gi % groupColors.length]);
    group.entries.forEach(entry => {
      const abbr = entry.team.abbreviation;
      const coords = teamCoords[abbr];
      if (!coords) return;

      const [lat, lon] = coords;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const r = 1.02;

      const markerGeo = new THREE.SphereGeometry(0.022, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.setFromSphericalCoords(r, phi, theta);
      marker.userData = { abbr, team: entry.team, group: group.name, standing: entry };

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(0.028, 0.036, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(marker.position);
      ring.lookAt(0, 0, 0);
      ring.userData.pulse = true;

      markerGroup.add(marker);
      markerGroup.add(ring);
      markers.push({ mesh: marker, ring });
    });
  });

  // Raycaster for click
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const meshes = markers.map(m => m.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const data = hits[0].object.userData;
      controls.autoRotate = false;
      showTeamCard(data);
      setTimeout(() => { controls.autoRotate = true; }, 4000);
    }
  });

  // Hover cursor
  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(markers.map(m => m.mesh));
    renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  });

  // Resize
  window.addEventListener('resize', () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animate
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.02;
    markers.forEach(({ ring }) => {
      const s = 1 + 0.15 * Math.sin(t + ring.position.x);
      ring.scale.setScalar(s);
      ring.material.opacity = 0.3 + 0.2 * Math.sin(t + ring.position.z);
    });
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function showTeamCard(data) {
  const team = state.teamIndex[data.abbr] || data.team;
  const standing = data.standing;

  document.getElementById('tc-flag').src = team.crest || '';
  document.getElementById('tc-flag').alt = team.name;
  document.getElementById('tc-name').textContent = team.name;
  document.getElementById('tc-abbr').textContent = team.abbreviation;
  document.getElementById('tc-group').textContent = data.group + ' — 位次 #' + (standing?.position ?? '?');

  if (standing) {
    document.getElementById('tc-row').innerHTML = `
      <div class="tc-stat"><div class="tc-stat-val">${standing.points}</div><div class="tc-stat-lbl">积分</div></div>
      <div class="tc-stat"><div class="tc-stat-val">${standing.won}</div><div class="tc-stat-lbl">胜</div></div>
      <div class="tc-stat"><div class="tc-stat-val">${standing.drawn}</div><div class="tc-stat-lbl">平</div></div>
      <div class="tc-stat"><div class="tc-stat-val">${standing.lost}</div><div class="tc-stat-lbl">负</div></div>
      <div class="tc-stat"><div class="tc-stat-val">${standing.goals_for}:${standing.goals_against}</div><div class="tc-stat-lbl">进/失球</div></div>
    `;
  }

  const card = document.getElementById('team-card');
  card.classList.add('show');
}

// ── Render today's matches ─────────────────────────────────────────────────
function renderToday() {
  const container = document.getElementById('today-list');
  if (!state.todayMatches.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">暂无今日赛程数据</p>';
    return;
  }

  container.innerHTML = state.todayMatches.map(match => {
    const home = match.competitors.find(c => c.qualifier === 'home');
    const away = match.competitors.find(c => c.qualifier === 'away');
    const homeTeam = state.teamIndex[home?.team?.abbreviation] || home?.team;
    const awayTeam = state.teamIndex[away?.team?.abbreviation] || away?.team;
    const kickoff = new Date(match.start_time);
    const timeStr = kickoff.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
    const isLive = match.status === 'in_progress';
    const isDone = match.status === 'closed' || match.status === 'complete';
    const statusLabel = isLive ? '进行中' : isDone ? '已结束' : timeStr + ' 开球';
    const venue = match.venue?.city ?? '';
    const odds = match.odds?.moneyline;

    return `
      <div class="match-card">
        <div class="meta">
          <span>${venue}</span>
          <span style="color:${isLive ? '#ff4444' : 'var(--muted)'}">${isLive ? '🔴 ' : ''}${statusLabel}</span>
        </div>
        <div class="teams">
          <div class="team-info">
            <img class="team-flag" src="${homeTeam?.crest || ''}" alt="${home?.team?.name}" onerror="this.style.display='none'">
            <div class="team-name">${home?.team?.name ?? '—'}</div>
          </div>
          <div class="score-box">
            <div class="score">${isDone || isLive ? (match.scores?.home ?? 0) + ' : ' + (match.scores?.away ?? 0) : 'vs'}</div>
            <div class="score-status${isLive ? ' live' : ''}">${isDone ? 'FT' : isLive ? 'LIVE' : ''}</div>
          </div>
          <div class="team-info away">
            <img class="team-flag" src="${awayTeam?.crest || ''}" alt="${away?.team?.name}" onerror="this.style.display='none'">
            <div class="team-name">${away?.team?.name ?? '—'}</div>
          </div>
        </div>
        ${odds ? `
        <div class="odds-row">
          <div class="odd-chip">主胜<span>${odds.home}</span></div>
          <div class="odd-chip">平局<span>${odds.draw}</span></div>
          <div class="odd-chip">客胜<span>${odds.away}</span></div>
        </div>` : ''}
      </div>`;
  }).join('');
}

// ── Render standings ───────────────────────────────────────────────────────
function renderStandings() {
  const groupColors = [
    '#00d4ff','#ff6b35','#00ff9d','#ff3d8a','#a78bfa','#fbbf24',
    '#34d399','#f87171','#60a5fa','#fb923c','#e879f9','#4ade80'
  ];
  const container = document.getElementById('standings-list');
  if (!state.standings.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">积分榜暂未生成</p>';
    return;
  }

  container.innerHTML = state.standings.map((group, gi) => {
    const color = groupColors[gi % groupColors.length];
    const rows = group.entries
      .sort((a, b) => a.position - b.position)
      .map((e, idx) => {
        const teamData = state.teamIndex[e.team.abbreviation] || e.team;
        const qualified = idx < 2 ? 'qualified' : '';
        return `
          <tr class="${qualified}">
            <td class="pos">${e.position}</td>
            <td><div class="team-cell">
              <img src="${teamData.crest || e.team.crest || ''}" alt="${e.team.name}" onerror="this.style.display='none'">
              ${e.team.abbreviation}
            </div></td>
            <td>${e.played}</td>
            <td>${e.won}</td>
            <td>${e.drawn}</td>
            <td>${e.lost}</td>
            <td>${e.goals_for}:${e.goals_against}</td>
            <td class="pts">${e.points}</td>
          </tr>`;
      }).join('');

    return `
      <div class="group-block">
        <div class="group-name">
          <span class="group-dot" style="background:${color}"></span>
          ${group.name}
        </div>
        <table class="standings-table">
          <thead><tr>
            <th>#</th><th style="text-align:left">球队</th>
            <th title="场次">场</th><th title="胜">胜</th>
            <th title="平">平</th><th title="负">负</th>
            <th title="进/失球">进失</th><th title="积分">分</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

// ── Nav routing ────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.getElementById('view-' + view)?.classList.add('active');
    });
  });
}

// ── Team coordinates (lat, lon) ────────────────────────────────────────────
function getTeamCoords() {
  return {
    // Group A
    MEX: [23.6, -102.5], KOR: [35.9, 127.8], RSA: [-30.6, 22.9], CZE: [49.8, 15.5],
    // Group B
    BRA: [-14.2, -51.9], MAR: [31.8, -7.1], SCO: [56.5, -4.2], HAI: [18.9, -72.3],
    // Group C
    ARG: [-38.4, -63.6], CRO: [45.1, 15.2], EGY: [26.8, 30.8], DOM: [18.7, -70.2],
    // Group D
    FRA: [46.2, 2.2], NGA: [9.1, 8.7], JPN: [36.2, 138.3], ECU: [-1.8, -78.2],
    // Group E
    ESP: [40.5, -3.7], SEN: [14.5, -14.5], AUS: [-25.3, 133.8], VEN: [6.4, -66.6],
    // Group F
    GER: [51.2, 10.5], BEL: [50.5, 4.5], CHI: [-35.7, -71.5], ELS: [13.8, -88.9],
    // Group G
    POR: [39.4, -8.2], USA: [37.1, -95.7], URU: [-32.5, -55.8], ALG: [28.0, 1.7],
    // Group H
    NED: [52.1, 5.3], NZL: [-40.9, 174.9], CMR: [3.9, 11.5], CHN: [35.9, 104.2],
    // Group I
    ENG: [52.4, -1.9], IRN: [32.4, 53.7], PAN: [8.5, -80.8], TUN: [33.9, 9.6],
    // Group J
    COL: [4.6, -74.1], DEN: [56.3, 9.5], KSA: [23.9, 45.1], TRI: [10.7, -61.5],
    // Group K
    SUI: [46.8, 8.2], QAT: [25.4, 51.2], HND: [15.2, -86.2], WAL: [52.1, -3.8],
    // Group L
    BEL: [50.5, 4.5], UKR: [48.4, 31.2], CMR: [3.9, 11.5], NOR: [60.5, 8.5],
  };
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function main() {
  await loadData();
  renderToday();
  renderStandings();
  initNav();
  setLoadText('完成!', 100);
  initGlobe();

  setTimeout(() => {
    document.getElementById('loading').classList.add('hidden');
    setTimeout(() => { document.getElementById('loading').remove(); }, 600);
  }, 400);
}

main();
