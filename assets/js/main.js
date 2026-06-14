import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── i18n ───────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    nav_globe:'🌍 地球仪', nav_matches:'📅 赛程', nav_standings:'🏆 积分榜',
    nav_predict:'🔮 预测', nav_skill:'🤖 AI问答', nav_live:'📺 直播', nav_comments:'💬 留言',
    globe_intro:'旋转地球查看 48 支参赛队分布\n彩色标记 = 小组颜色\n点击标记 → 右侧显示球队详情',
    peers_title:'同组球队', matches_title_glob:'本届赛事',
    matches_title:'📅 近期赛事', standings_title:'🏆 小组积分榜',
    predict_title:'🔮 赛事预测分析',
    predict_intro:'预测基于赔率（DraftKings）和积分形势。点击任意比赛展开详细分析。',
    skill_title:'🤖 AI 世界杯助手',
    live_title:'📺 直播入口',
    mf_all:'全部', mf_today:'今日', mf_live:'进行中', mf_upcoming:'未开始', mf_done:'已结束',
    col_pos:'#', col_team:'球队', col_p:'场', col_w:'胜', col_d:'平', col_l:'负', col_gd:'净', col_pts:'分',
    click_detail:'点击球队查看详情',
    no_matches:'暂无赛事数据',
    status_live:'进行中', status_done:'已结束', status_pre:'未开始',
    odds_h:'主胜', odds_d:'平局', odds_a:'客胜',
    tl_goal:'进球', tl_yellow:'黄牌', tl_red:'红牌', tl_yr:'黄红牌', tl_sub:'换人',
    tl_title:'比赛事件',
    no_events:'暂无事件数据',
    analysis_odds:'赔率分析', analysis_form:'近期状态', analysis_context:'背景分析',
    key_note:'Key 仅保存在您本地浏览器，不上传任何服务器。',
    key_ready:'已配置，可以提问', key_missing:'请输入 API Key 开始对话',
    send_btn:'发送', chat_placeholder:'问我任何世界杯问题...',
    quick_qs:['今天有哪些比赛？','最新积分榜','帮我预测今晚比赛','2026世界杯赛制介绍','球星梅西/姆巴佩状态'],
    ai_intro:'你好！我是 FIFA World Cup 2026 AI 助手。\n你可以问我关于赛程、比分、积分榜、球队分析和比赛预测等任何问题。',
    lang_switch:'EN',
  },
  en: {
    nav_globe:'🌍 Globe', nav_matches:'📅 Matches', nav_standings:'🏆 Standings',
    nav_predict:'🔮 Predict', nav_skill:'🤖 AI Chat', nav_live:'📺 Live', nav_comments:'💬 Comments',
    globe_intro:"Rotate the globe to see all 48 teams\nColored markers = group color\nClick a marker → view team details",
    peers_title:'Group rivals', matches_title_glob:'Tournament record',
    matches_title:'📅 Recent Matches', standings_title:'🏆 Group Standings',
    predict_title:'🔮 Match Predictions',
    predict_intro:'Predictions based on DraftKings odds and standings form. Click any match to expand the analysis.',
    skill_title:'🤖 AI World Cup Assistant',
    live_title:'📺 Live Streams',
    mf_all:'All', mf_today:'Today', mf_live:'Live', mf_upcoming:'Upcoming', mf_done:'Finished',
    col_pos:'#', col_team:'Team', col_p:'P', col_w:'W', col_d:'D', col_l:'L', col_gd:'GD', col_pts:'Pts',
    click_detail:'Click a team row to view details',
    no_matches:'No match data',
    status_live:'LIVE', status_done:'FT', status_pre:'Upcoming',
    odds_h:'Home Win', odds_d:'Draw', odds_a:'Away Win',
    tl_goal:'Goal', tl_yellow:'Yellow Card', tl_red:'Red Card', tl_yr:'Yellow-Red', tl_sub:'Substitution',
    tl_title:'Match Events',
    no_events:'No events data',
    analysis_odds:'Odds Analysis', analysis_form:'Recent Form', analysis_context:'Context',
    key_note:'Key is stored only in your browser localStorage — never transmitted.',
    key_ready:'Ready — ask anything', key_missing:'Enter API Key to start chatting',
    send_btn:'Send', chat_placeholder:'Ask anything about World Cup 2026...',
    quick_qs:["Today's matches?",'Latest standings','Predict tonight\'s match','2026 format explained','Messi / Mbappe form'],
    ai_intro:'Hello! I\'m your FIFA World Cup 2026 AI assistant.\nAsk me about schedules, scores, standings, team analysis or match predictions.',
    lang_switch:'中',
  }
};

let lang = 'zh';
const t = k => I18N[lang][k] ?? k;

// ── Fav Teams ──────────────────────────────────────────────────────────────
let favTeams = new Set(JSON.parse(localStorage.getItem('wc2026_favs') || '[]'));
function saveFavs() { localStorage.setItem('wc2026_favs', JSON.stringify([...favTeams])); }
function toggleFav(abbr) {
  if (favTeams.has(abbr)) favTeams.delete(abbr); else favTeams.add(abbr);
  saveFavs();
  renderFavBar();
  // update all fav buttons on page
  document.querySelectorAll(`.fav-btn[data-abbr="${abbr}"]`).forEach(b => {
    b.classList.toggle('active', favTeams.has(abbr));
    b.title = favTeams.has(abbr) ? (lang==='zh'?'取消关注':'Unfollow') : (lang==='zh'?'关注':'Follow');
  });
}
function favBtnHTML(abbr) {
  const active = favTeams.has(abbr);
  return `<button class="fav-btn${active?' active':''}" data-abbr="${abbr}" title="${active?(lang==='zh'?'取消关注':'Unfollow'):(lang==='zh'?'关注':'Follow')}" onclick="toggleFav('${abbr}')">★</button>`;
}
function renderFavBar() {
  const bar = document.getElementById('fav-bar');
  const chips = document.getElementById('fav-chips');
  if (!bar || !chips) return;
  if (favTeams.size === 0) { bar.classList.remove('show'); return; }
  bar.classList.add('show');
  document.getElementById('fav-bar-title').textContent = lang==='zh' ? '★ 关注球队赛程' : '★ Followed Teams';
  chips.innerHTML = [...favTeams].map(abbr => {
    const team = S.teamIndex[abbr] || {};
    return `<div class="fav-chip" onclick="filterByFavTeam('${abbr}')">
      <img src="${team.crest||''}" onerror="this.style.display='none'" alt="">
      <span>${abbr}</span>
    </div>`;
  }).join('');
}
window.filterByFavTeam = function(abbr) {
  currentMatchFilter = 'fav';
  renderMatches();
  // highlight the selected team
};

function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.getElementById('lang-btn').textContent = t('lang_switch');
  document.getElementById('canvas-hint').textContent = lang === 'zh'
    ? '🖱 拖拽旋转 · 滚轮缩放 · 点击球队 · 金线=今日赛事' : '🖱 Drag · Scroll zoom · Click team · Gold arc = today\'s match';
}

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  teams: [], standings: [], recentMatches: [],
  teamIndex: {},   // abbr → enriched
  teamMatches: {}, // abbr → match[]
  matchTimelines: {}, // eventId → timeline[]
};

const GROUP_COLORS = [
  '#00d4ff','#ff6b35','#00ff9d','#ff3d8a','#a78bfa','#fbbf24',
  '#34d399','#f87171','#60a5fa','#fb923c','#e879f9','#4ade80'
];

// ── Data ───────────────────────────────────────────────────────────────────
async function loadData() {
  prog(20, '加载数据...');
  const [stRes, tmRes, rcRes] = await Promise.allSettled([
    fetch('data/standings.json').then(r=>r.json()),
    fetch('data/teams.json').then(r=>r.json()),
    fetch('data/recent.json').then(r=>r.json()),
  ]);
  prog(65, '处理数据...');

  if (stRes.status==='fulfilled') {
    S.standings = stRes.value?.data?.standings ?? [];
    S.standings.forEach((grp,gi) => {
      grp.entries.forEach(e => {
        S.teamIndex[e.team.abbreviation] = { ...e.team, group: grp.name, groupIdx: gi, standing: e };
      });
    });
  }
  if (tmRes.status==='fulfilled') {
    S.teams = tmRes.value?.data?.teams ?? [];
    S.teams.forEach(t => {
      if (!S.teamIndex[t.abbreviation]) S.teamIndex[t.abbreviation] = t;
      else S.teamIndex[t.abbreviation].crest = t.crest;
    });
  }
  if (rcRes.status==='fulfilled') {
    S.recentMatches = rcRes.value?.events ?? [];
    const ua = rcRes.value?.updated_at;
    if (ua) {
      const d = new Date(ua);
      document.getElementById('updated-at').textContent =
        (lang==='zh'?'更新 ':'Updated ')
        + d.toLocaleString(lang==='zh'?'zh-CN':'en-US',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'});
    }
    S.recentMatches.forEach(m => {
      m.competitors.forEach(c => {
        const ab = c.team.abbreviation;
        if (!S.teamMatches[ab]) S.teamMatches[ab] = [];
        S.teamMatches[ab].push(m);
      });
    });
  }
}
function prog(pct, msg) {
  document.getElementById('load-fill').style.width = pct+'%';
  document.getElementById('load-text').textContent = msg;
}

// ── Countdown ──────────────────────────────────────────────────────────────
let _countdownTimer = null;
function startCountdown() {
  if (_countdownTimer) clearInterval(_countdownTimer);
  function tick() {
    const next = S.recentMatches
      .filter(m => m.status === 'not_started' || m.status === 'scheduled')
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
    const wrap = document.getElementById('countdown-wrap');
    if (!next || !wrap) return;
    const diff = new Date(next.start_time) - Date.now();
    if (diff <= 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('countdown-timer').textContent = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    document.getElementById('cd-label').textContent = lang === 'zh' ? '距下场' : 'Next in';
    const hCmp = next.competitors.find(c => c.qualifier === 'home');
    const aCmp = next.competitors.find(c => c.qualifier === 'away');
    document.getElementById('countdown-match').textContent =
      `${hCmp?.team?.abbreviation || '?'} vs ${aCmp?.team?.abbreviation || '?'}`;
  }
  tick();
  _countdownTimer = setInterval(tick, 1000);
}
function flagImg(team, cls='') {
  const src = team?.crest || S.teamIndex[team?.abbreviation]?.crest || '';
  return `<img src="${src}" alt="" class="${cls}" onerror="this.style.display='none'">`;
}
function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleString(lang==='zh'?'zh-CN':'en-US',
    {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'});
}
function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString(lang==='zh'?'zh-CN':'en-US',
    {month:'numeric',day:'numeric',timeZone:'Asia/Shanghai'});
}
function matchResult(match, abbr) {
  const isDone = match.status==='closed'||match.status==='complete';
  if (!isDone) return '';
  const myCmp = match.competitors.find(c=>c.team.abbreviation===abbr);
  const oppCmp = match.competitors.find(c=>c.team.abbreviation!==abbr);
  if (!myCmp||!oppCmp) return '';
  const ms = myCmp.score??0, os = oppCmp.score??0;
  return ms>os?'W':ms<os?'L':'D';
}
function oddsToPct(american) {
  const n = parseInt(american);
  if (isNaN(n)) return null;
  return n<0 ? (-n/(-n+100)) : (100/(n+100));
}
function calcPcts(odds) {
  if (!odds) return {h:35,d:27,a:38};
  const raw = {
    h: oddsToPct(odds.home)||0.33,
    d: oddsToPct(odds.draw)||0.27,
    a: oddsToPct(odds.away)||0.40,
  };
  const sum = raw.h+raw.d+raw.a;
  const h = Math.round(raw.h/sum*100);
  const d = Math.round(raw.d/sum*100);
  return {h, d, a: 100-h-d};
}

// ── Globe ──────────────────────────────────────────────────────────────────
function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  const wrap = document.getElementById('canvas-wrap');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth/wrap.clientHeight, 0.1, 100);
  camera.position.z = 2.7;

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {enableDamping:true,dampingFactor:0.07,minDistance:1.6,maxDistance:5,autoRotate:true,autoRotateSpeed:0.35});

  scene.add(new THREE.AmbientLight(0x8899bb, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff,1.3); sun.position.set(5,3,5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x3366aa,0.4); fill.position.set(-3,-2,-3); scene.add(fill);

  // Globe
  const earthMat = new THREE.MeshPhongMaterial({color:0x1a3a5c,emissive:0x061224,specular:0x2255aa,shininess:25});
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,64), earthMat));
  // Atmosphere
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.03,64,64),
    new THREE.MeshPhongMaterial({color:0x0088ff,transparent:true,opacity:0.07})));

  // Load earth texture — try multiple CDNs
  const tl = new THREE.TextureLoader();
  const earthTexUrls = [
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_2048.jpg/2048px-Land_ocean_ice_2048.jpg',
  ];
  function tryLoadTex(urls, idx=0){
    if(idx>=urls.length) return;
    tl.load(urls[idx], tex=>{earthMat.map=tex;earthMat.color.set(0xffffff);earthMat.needsUpdate=true;},
      undefined, ()=>tryLoadTex(urls, idx+1));
  }
  tryLoadTex(earthTexUrls);

  // Graticule
  const gMat = new THREE.LineBasicMaterial({color:0x1a3d66,opacity:0.3,transparent:true});
  for (let lat=-60;lat<=60;lat+=30) {
    const pts=[];const phi=(90-lat)*Math.PI/180;
    for(let lon=0;lon<=360;lon+=4){const th=lon*Math.PI/180;pts.push(new THREE.Vector3(Math.sin(phi)*Math.cos(th),Math.cos(phi),Math.sin(phi)*Math.sin(th)));}
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gMat));
  }
  for(let lon=0;lon<360;lon+=30){
    const pts=[];const th=lon*Math.PI/180;
    for(let lat=-90;lat<=90;lat+=3){const phi=(90-lat)*Math.PI/180;pts.push(new THREE.Vector3(Math.sin(phi)*Math.cos(th),Math.cos(phi),Math.sin(phi)*Math.sin(th)));}
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gMat));
  }

  // Stars
  const sv=[];for(let i=0;i<4000;i++){const r=35+Math.random()*15,th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);sv.push(r*Math.sin(ph)*Math.cos(th),r*Math.cos(ph),r*Math.sin(ph)*Math.sin(th));}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.05})));

  // Markers
  const markers=[], markerMeshes=[];
  const coords=getTeamCoords();
  S.standings.forEach((grp,gi)=>{
    const color=new THREE.Color(GROUP_COLORS[gi%GROUP_COLORS.length]);
    grp.entries.forEach(entry=>{
      const ab=entry.team.abbreviation, pos=coords[ab];
      if(!pos) return;
      const [lat,lon]=pos;
      const phi=(90-lat)*Math.PI/180, theta=Math.PI/2+lon*Math.PI/180;

      const dot=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,8),new THREE.MeshBasicMaterial({color}));
      dot.position.setFromSphericalCoords(1.02,phi,theta);
      dot.userData={abbr:ab,team:entry.team,group:grp.name,standing:entry,gi,lat,lon};

      const ring=new THREE.Mesh(new THREE.RingGeometry(0.023,0.031,16),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4,side:THREE.DoubleSide}));
      ring.position.copy(dot.position); ring.lookAt(0,0,0);

      // Spike
      const spGeo=new THREE.BufferGeometry().setFromPoints([dot.position.clone().multiplyScalar(0.99),dot.position.clone().multiplyScalar(1.05)]);
      scene.add(new THREE.Line(spGeo,new THREE.LineBasicMaterial({color,opacity:0.45,transparent:true})));

      // Label (canvas texture)
      const lc=document.createElement('canvas'); lc.width=128; lc.height=32;
      const lctx=lc.getContext('2d');
      lctx.font='bold 18px Arial'; lctx.fillStyle='rgba(0,0,0,0.55)';
      lctx.fillText(ab,3,22); lctx.fillStyle='#ffffff';
      lctx.fillText(ab,2,21);
      const ltex=new THREE.CanvasTexture(lc);
      const lmat=new THREE.SpriteMaterial({map:ltex,transparent:true,depthTest:false});
      const lsp=new THREE.Sprite(lmat);
      lsp.scale.set(0.18,0.045,1);
      lsp.position.copy(dot.position).multiplyScalar(1.08);
      scene.add(lsp);

      scene.add(dot); scene.add(ring);
      markers.push({dot,ring,label:lsp}); markerMeshes.push(dot);
    });
  });

  // ── Today's match arcs ────────────────────────────────────────────────────
  const todayArcs = [];
  const todayMatchIds = [];
  const now = new Date();
  const todayStr = now.toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');

  function latLonToVec(lat, lon, r=1.02){
    const phi=(90-lat)*Math.PI/180, theta=Math.PI/2+lon*Math.PI/180;
    return new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*r, Math.cos(phi)*r, Math.sin(phi)*Math.sin(theta)*r);
  }
  function makeArc(p1, p2, color){
    const mid=p1.clone().add(p2).multiplyScalar(0.5);
    const lift=1+0.35*(1-mid.length());
    mid.normalize().multiplyScalar(lift+0.2);
    const pts=[];
    for(let t=0;t<=1;t+=0.02){
      const a=p1.clone().multiplyScalar((1-t)*(1-t));
      const b=mid.clone().multiplyScalar(2*t*(1-t));
      const c=p2.clone().multiplyScalar(t*t);
      pts.push(a.add(b).add(c));
    }
    // Use TubeCurve for thick arc
    class PolylineCurve extends THREE.Curve {
      constructor(pts){ super(); this.pts=pts; }
      getPoint(t){
        const i=Math.min(Math.floor(t*(this.pts.length-1)),this.pts.length-2);
        const f=t*(this.pts.length-1)-i;
        return this.pts[i].clone().lerp(this.pts[i+1],f);
      }
    }
    const curve=new PolylineCurve(pts);
    const geo=new THREE.TubeGeometry(curve,50,0.006,6,false);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.75});
    return new THREE.Mesh(geo,mat);
  }

  S.recentMatches.forEach(m=>{
    const mDate=new Date(m.start_time).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');
    if(mDate!==todayStr) return;
    const hCmp=m.competitors.find(c=>c.qualifier==='home');
    const aCmp=m.competitors.find(c=>c.qualifier==='away');
    if(!hCmp||!aCmp) return;
    const hPos=coords[hCmp.team.abbreviation];
    const aPos=coords[aCmp.team.abbreviation];
    if(!hPos||!aPos) return;
    const arc=makeArc(latLonToVec(...hPos), latLonToVec(...aPos), 0xffd700);
    // Store midpoint for camera rotation
    const midVec=latLonToVec(...hPos).add(latLonToVec(...aPos)).normalize().multiplyScalar(1.5);
    arc.userData={matchId:m.id,isArc:true,midVec};
    scene.add(arc);
    todayArcs.push(arc);
    todayMatchIds.push(m.id);
  });

  // Smoothly rotate globe so target point faces the camera
  function rotateTo(targetVec, duration=1200){
    controls.autoRotate=false;
    const startQ=camera.quaternion.clone();
    // We want camera to look from the direction of targetVec
    const targetPos=targetVec.clone().normalize().multiplyScalar(camera.position.length());
    const endQ=new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(targetPos, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0))
    );
    // Rotate the scene (globe) instead — adjust controls target indirectly
    // Simpler: animate camera position to orbit around to face the point
    const startPos=camera.position.clone();
    const dist=startPos.length();
    const endPos=targetVec.clone().normalize().multiplyScalar(dist);
    const t0=performance.now();
    function step(){
      const t=Math.min((performance.now()-t0)/duration,1);
      const ease=t<0.5?2*t*t:(4-2*t)*t-1; // ease in-out quad
      camera.position.lerpVectors(startPos,endPos,ease);
      camera.lookAt(0,0,0);
      if(t<1) requestAnimationFrame(step);
      else setTimeout(()=>{controls.autoRotate=true;},4000);
    }
    step();
  }

  // Expose so today match cards can call it
  window._globeRotateTo = rotateTo;
  window._globeTodayArcs = todayArcs;

  // Interaction
  const ray=new THREE.Raycaster(), mouse=new THREE.Vector2();
  let hoveredAbbr=null;
  let pinnedAbbr=null; // locked after click — hover card stays until another click

  canvas.addEventListener('mousemove',e=>{
    setMouse(e,canvas,mouse); ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects(markerMeshes);
    const arcHits=ray.intersectObjects(todayArcs,false);
    if(hits.length){
      const d=hits[0].object.userData;
      canvas.style.cursor='pointer';
      if(d.abbr!==hoveredAbbr){
        hoveredAbbr=d.abbr;
        if(!pinnedAbbr || d.abbr===pinnedAbbr) showHoverCard(d);
      }
    } else if(arcHits.length){
      canvas.style.cursor='pointer';
      hoveredAbbr=null;
    } else {
      canvas.style.cursor='grab';
      hoveredAbbr=null;
      if(!pinnedAbbr){
        document.getElementById('globe-hover-card').classList.remove('show');
      }
    }
  });

  canvas.addEventListener('click',e=>{
    setMouse(e,canvas,mouse); ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects(markerMeshes);
    if(hits.length){
      const d=hits[0].object.userData;
      pinnedAbbr=d.abbr;
      controls.autoRotate=false;
      showHoverCard(d);
      showGlobeTeamDetail(d);
      activateView('globe');
      setTimeout(()=>{controls.autoRotate=true;},6000);
      return;
    }
    // Click on arc → jump to matches tab
    const arcHits=ray.intersectObjects(todayArcs,false);
    if(arcHits.length){
      const mid=arcHits[0].object;
      if(mid.userData.matchId){
        activateView('matches');
        setTimeout(()=>openMatchModal(mid.userData.matchId),150);
      } else {
        activateView('matches');
      }
    }
  });

  window.addEventListener('resize',()=>{
    const w=wrap.clientWidth,h=wrap.clientHeight;
    camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
  });

  let tick=0;
  (function animate(){
    requestAnimationFrame(animate);
    tick+=0.025;
    markers.forEach(({ring},i)=>{
      const s=1+0.2*Math.sin(tick+i*0.6);
      ring.scale.setScalar(s);
      ring.material.opacity=0.2+0.22*Math.sin(tick+i*0.6);
    });
    todayArcs.forEach((arc,i)=>{
      arc.material.opacity=0.45+0.3*Math.sin(tick*1.5+i*1.1);
    });
    controls.update();
    renderer.render(scene,camera);
  })();
}

function setMouse(e,canvas,mouse){
  const r=canvas.getBoundingClientRect();
  mouse.x=((e.clientX-r.left)/r.width)*2-1;
  mouse.y=-((e.clientY-r.top)/r.height)*2+1;
}

function showHoverCard(data){
  const team=S.teamIndex[data.abbr]||{};
  document.getElementById('ghc-flag').src=team.crest||'';
  document.getElementById('ghc-name').textContent=data.team?.name||data.abbr;
  document.getElementById('ghc-sub').textContent=data.group;
  document.getElementById('globe-hover-card').classList.add('show');
}

function showGlobeTeamDetail(data){
  const team=S.teamIndex[data.abbr]||data.team||{};
  const s=data.standing;
  const grp=S.standings[data.gi||0];

  document.getElementById('gtd-flag').src=team.crest||'';
  document.getElementById('gtd-name').textContent=team.name||data.abbr;
  const subEl=document.getElementById('gtd-sub');
  subEl.innerHTML=`${data.group}${s?` · #${s.position}`:''} ${favBtnHTML(data.abbr)}`;

  // Stats
  if(s){
    const gd=s.goal_difference;
    const gdStr=(gd>0?'+':'')+gd;
    document.getElementById('gtd-stats').innerHTML=[
      [s.points,lang==='zh'?'积分':'Pts'],
      [s.won,lang==='zh'?'胜':'W'],
      [s.drawn,lang==='zh'?'平':'D'],
      [s.lost,lang==='zh'?'负':'L'],
      [s.goals_for,lang==='zh'?'进球':'GF'],
      [s.goals_against,lang==='zh'?'失球':'GA'],
      [gdStr,lang==='zh'?'净球':'GD'],
      [s.played,lang==='zh'?'场次':'P'],
    ].map(([v,l])=>`<div class="stat-box"><div class="stat-val">${v}</div><div class="stat-lbl">${l}</div></div>`).join('');
  }

  // Group peers
  document.getElementById('gtd-peers-title').textContent=t('peers_title');
  if(grp){
    document.getElementById('gtd-peers').innerHTML=grp.entries
      .filter(e=>e.team.abbreviation!==data.abbr)
      .map(e=>{
        const pt=S.teamIndex[e.team.abbreviation]||e.team;
        return `<div class="peer-chip" onclick="showGlobeTeamDetailByAbbr('${e.team.abbreviation}')">
          ${flagImg(pt,'')}<span>${e.team.abbreviation}</span>
          <span style="color:var(--gold);font-size:10px">${e.standing?.points??e.points??0}pt</span>
          <button class="compare-btn" style="padding:1px 5px;font-size:9px" onclick="event.stopPropagation();openTeamCompare('${data.abbr}','${e.team.abbreviation}')">${lang==='zh'?'对比':'vs'}</button>
        </div>`;
      }).join('');
  }

  // Matches
  document.getElementById('gtd-matches-title').textContent=t('matches_title_glob');
  const matches=S.teamMatches[data.abbr]||[];
  document.getElementById('gtd-matches').innerHTML = matches.length
    ? matches.slice(0,5).map(m=>{
        const oppCmp=m.competitors.find(c=>c.team.abbreviation!==data.abbr);
        const myCmp=m.competitors.find(c=>c.team.abbreviation===data.abbr);
        const isDone=m.status==='closed'||m.status==='complete';
        const res=matchResult(m,data.abbr);
        const score=isDone?`${myCmp?.score??0}:${oppCmp?.score??0}`:(lang==='zh'?'未开始':'TBD');
        const badge=res?`<span class="result-badge r-${res}">${res}</span>`:'';
        return `<div class="team-match-row" onclick="openMatchModal('${m.id}')">
          <span style="color:var(--muted)">${fmtDate(m.start_time)}</span>
          <span style="font-weight:600">vs ${oppCmp?.team?.name||'?'}</span>
          <span>${score}</span>${badge}
        </div>`;
      }).join('')
    : `<div style="font-size:11px;color:var(--muted);padding:10px 0">${t('no_matches')}</div>`;

  document.getElementById('globe-intro-text').style.display='none';
  document.getElementById('globe-team-detail').classList.add('show');
}

window.showGlobeIntro = function(){
  document.getElementById('globe-intro-text').style.display='block';
  document.getElementById('globe-team-detail').classList.remove('show');
  document.getElementById('globe-hover-card').classList.remove('show');
};

window.showGlobeTeamDetailByAbbr = function(abbr){
  const team=S.teamIndex[abbr];
  if(!team) return;
  const grpIdx=team.groupIdx??0;
  const grp=S.standings[grpIdx];
  const entry=grp?.entries.find(e=>e.team.abbreviation===abbr);
  showGlobeTeamDetail({abbr,team,group:team.group||'',standing:entry,gi:grpIdx});
};

// ── Matches ────────────────────────────────────────────────────────────────
let currentMatchFilter = 'all';

function renderMatches(){
  const container=document.getElementById('matches-list');
  document.getElementById('matches-title-txt').textContent=t('matches_title');
  updateMatchFilterLabels();
  renderFavBar();

  const todayStr=new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');

  const filtered=[...S.recentMatches].filter(m=>{
    if(currentMatchFilter==='all') return true;
    const isLive=m.status==='in_progress';
    const isDone=m.status==='closed'||m.status==='complete';
    const isUpcoming=!isLive&&!isDone;
    const mDate=new Date(m.start_time).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');
    if(currentMatchFilter==='live') return isLive;
    if(currentMatchFilter==='done') return isDone;
    if(currentMatchFilter==='upcoming') return isUpcoming;
    if(currentMatchFilter==='today') return mDate===todayStr;
    if(currentMatchFilter==='fav') return m.competitors.some(c=>favTeams.has(c.team.abbreviation));
    return true;
  }).sort((a,b)=>{
    if(currentMatchFilter==='done') return new Date(b.start_time)-new Date(a.start_time);
    return new Date(a.start_time)-new Date(b.start_time);
  });

  if(!filtered.length){container.innerHTML=`<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">${t('no_matches')}</p>`;return;}
  container.innerHTML=filtered.map(m=>matchCardHTML(m)).join('');
  container.querySelectorAll('.match-card').forEach((card,i)=>{
    card.addEventListener('click',e=>{
      if(e.target.closest('.ics-btn')||e.target.closest('.fav-btn')) return;
      openMatchModal(filtered[i].id);
    });
  });
}

function updateMatchFilterLabels(){
  const bar=document.getElementById('match-filter-bar');
  if(!bar) return;
  const labels={all:t('mf_all'),fav:'★ '+(lang==='zh'?'关注':'Fav'),today:t('mf_today'),live:t('mf_live'),upcoming:t('mf_upcoming'),done:t('mf_done')};
  bar.querySelectorAll('.mf-btn').forEach(btn=>{
    btn.textContent=labels[btn.dataset.filter]||btn.textContent;
    btn.classList.toggle('active',btn.dataset.filter===currentMatchFilter);
  });
}

function initMatchFilter(){
  const bar=document.getElementById('match-filter-bar');
  if(!bar) return;
  bar.addEventListener('click',e=>{
    const btn=e.target.closest('.mf-btn');
    if(!btn) return;
    currentMatchFilter=btn.dataset.filter;
    renderMatches();
  });
  const icsBtn=document.getElementById('ics-export-btn');
  if(icsBtn) icsBtn.addEventListener('click',()=>downloadICS(S.recentMatches));
}

function matchCardHTML(m){
  const hCmp=m.competitors.find(c=>c.qualifier==='home');
  const aCmp=m.competitors.find(c=>c.qualifier==='away');
  const hT=S.teamIndex[hCmp?.team?.abbreviation]||hCmp?.team||{};
  const aT=S.teamIndex[aCmp?.team?.abbreviation]||aCmp?.team||{};
  const isLive=m.status==='in_progress';
  const isDone=m.status==='closed'||m.status==='complete';
  const tagCls=isLive?' live':isDone?' done':'';
  const tagTxt=isLive?t('status_live'):isDone?t('status_done'):'';
  const score=(isDone||isLive)?`${m.scores?.home??0} : ${m.scores?.away??0}`:'vs';
  const odds=m.odds?.moneyline;
  const hAbbr=hCmp?.team?.abbreviation||'';
  const aAbbr=aCmp?.team?.abbreviation||'';
  return `<div class="match-card">
    <div class="match-meta">
      <span>${m.venue?.city||''}</span>
      <div style="display:flex;align-items:center;gap:5px">
        <span class="date-badge">${fmtDate(m.start_time)}</span>
        <span style="color:${isLive?'var(--red)':'var(--muted)'}">${isLive?'🔴 ':''}${tagTxt||fmtTime(m.start_time)}</span>
      </div>
    </div>
    <div class="match-teams">
      <div class="team-side">
        ${flagImg(hT,'team-flag-sm')}
        <span class="team-nm">${hCmp?.team?.name||'—'}</span>
        ${favBtnHTML(hAbbr)}
      </div>
      <div class="score-box">
        <div class="score-main">${score}</div>
        <div class="score-tag${tagCls}">${tagTxt}</div>
      </div>
      <div class="team-side away">
        ${favBtnHTML(aAbbr)}
        ${flagImg(aT,'team-flag-sm')}
        <span class="team-nm">${aCmp?.team?.name||'—'}</span>
      </div>
    </div>
    ${odds?`<div class="odds-strip">
      <div class="odd-chip">${t('odds_h')}<b>${odds.home}</b></div>
      <div class="odd-chip">${t('odds_d')}<b>${odds.draw}</b></div>
      <div class="odd-chip">${t('odds_a')}<b>${odds.away}</b></div>
    </div>`:''}
    <div class="match-card-actions">
      <button class="ics-btn" onclick="downloadICS([${JSON.stringify(m).replace(/"/g,'&quot;')}])" title="${lang==='zh'?'加入日历':'Add to calendar'}">📅</button>
    </div>
  </div>`;
}

// ── Match detail modal ─────────────────────────────────────────────────────
window.openMatchModal = async function(eventId){
  const m=S.recentMatches.find(e=>e.id===eventId);
  if(!m) return;
  const hCmp=m.competitors.find(c=>c.qualifier==='home');
  const aCmp=m.competitors.find(c=>c.qualifier==='away');
  const hT=S.teamIndex[hCmp?.team?.abbreviation]||hCmp?.team||{};
  const aT=S.teamIndex[aCmp?.team?.abbreviation]||aCmp?.team||{};
  const isDone=m.status==='closed'||m.status==='complete';

  document.getElementById('mmodal-flag-h').src=hT.crest||'';
  document.getElementById('mmodal-flag-a').src=aT.crest||'';
  document.getElementById('mmodal-name-h').textContent=hCmp?.team?.name||'—';
  document.getElementById('mmodal-name-a').textContent=aCmp?.team?.name||'—';
  document.getElementById('mmodal-score').textContent=
    isDone?`${m.scores?.home??0} – ${m.scores?.away??0}`:'vs';
  document.getElementById('mmodal-meta').textContent=
    `${fmtTime(m.start_time)}  ·  ${m.venue?.city||''}`;
  document.getElementById('mmodal-title').textContent=
    `${hCmp?.team?.abbreviation||'?'} vs ${aCmp?.team?.abbreviation||'?'}`;
  document.getElementById('mmodal-tl-title').textContent=t('tl_title');
  document.getElementById('mmodal-timeline').innerHTML=
    `<div style="font-size:11px;color:var(--muted);padding:10px 0">加载中...</div>`;

  document.getElementById('match-modal').classList.add('show');

  // Stream links + vote panel
  renderStreamLinks(m);
  renderVotePanel(m);

  // Fetch timeline if not cached
  if(!S.matchTimelines[eventId]&&isDone){
    try{
      const r=await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://raw.githubusercontent.com/skyseraph/world-cup-2026/main/data/timeline_${eventId}.json`
      )}`);
      // Fallback: render from local data only
    }catch(e){}
    // Use sports-skills data embedded at build time if available
    S.matchTimelines[eventId] = await fetchTimeline(eventId);
  }

  renderTimeline(eventId, hCmp?.team, aCmp?.team);
};

async function fetchTimeline(eventId){
  // Try pre-fetched file in data/
  try{
    const r=await fetch(`data/timeline_${eventId}.json`);
    if(r.ok){const d=await r.json();return d.timeline||[];}
  }catch(e){}
  return [];
}

function renderTimeline(eventId, homeTeam, awayTeam){
  const events=S.matchTimelines[eventId]||[];
  const key={'score_change':'⚽','yellow_card':'🟨','red_card':'🟥','yellow_red_card':'🟨🟥','substitution':'🔄'};
  const labelKey={'score_change':t('tl_goal'),'yellow_card':t('tl_yellow'),'red_card':t('tl_red'),'yellow_red_card':t('tl_yr'),'substitution':t('tl_sub')};
  const interesting=events.filter(e=>key[e.type]);

  if(!interesting.length){
    document.getElementById('mmodal-timeline').innerHTML=
      `<div class="no-events">${t('no_events')}</div>`;
    return;
  }

  document.getElementById('mmodal-timeline').innerHTML=interesting.map(e=>{
    const icon=key[e.type]||'•';
    const teamName=e.team?.name||'';
    const isHome=homeTeam&&e.team?.id===homeTeam.id;
    let desc='';
    if(e.type==='substitution'){
      desc=`${e.player_in?.name||e.player?.name||'?'} ↑ / ${e.player_out?.name||'?'} ↓`;
    } else {
      desc=e.player?.name||labelKey[e.type]||e.type;
    }
    const scoreNote=e.type==='score_change'&&e.score_home!=null
      ? ` <span style="color:var(--gold);font-weight:700">${e.score_home}–${e.score_away}</span>` : '';
    return `<div class="timeline-line" style="${isHome?'':'flex-direction:row-reverse;text-align:right'}">
      <div class="tl-min">${e.minute}'</div>
      <div class="tl-icon">${icon}</div>
      <div class="tl-text">
        <div>${desc}${scoreNote}</div>
        <div class="tl-team">${teamName}</div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('mmodal-close').addEventListener('click',closeMatchModal);
document.getElementById('match-modal').addEventListener('click',e=>{if(e.target===document.getElementById('match-modal'))closeMatchModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMatchModal();});
function closeMatchModal(){document.getElementById('match-modal').classList.remove('show');}

// ── Stream Links ────────────────────────────────────────────────────────────
const STREAM_PLATFORMS = [
  {name:'CCTV5+',  url:'https://tv.cctv.com/live/cctv5p/',      cn:true},
  {name:'咪咕视频', url:'https://www.miguvideo.com/',             cn:true},
  {name:'优酷体育', url:'https://sports.youku.com/',              cn:true},
  {name:'FIFA+',   url:'https://www.fifa.com/fifaplus/en/live',  cn:false},
  {name:'FOX Sports',url:'https://www.foxsports.com/',           cn:false},
];

function renderStreamLinks(m) {
  const el = document.getElementById('mmodal-stream-links');
  if (!el) return;
  const isLive = m.status === 'in_progress';
  const isDone = m.status === 'closed' || m.status === 'complete';
  const isUpcoming = !isLive && !isDone;

  if (isUpcoming) { el.innerHTML = ''; return; }

  const hCmp = m.competitors.find(c=>c.qualifier==='home');
  const aCmp = m.competitors.find(c=>c.qualifier==='away');
  const searchQ = encodeURIComponent(`世界杯 ${hCmp?.team?.name||''} ${aCmp?.team?.name||''}`);
  const searchQEn = encodeURIComponent(`World Cup ${hCmp?.team?.name||''} ${aCmp?.team?.name||''}`);

  const platforms = isLive
    ? STREAM_PLATFORMS
    : [
        {name:'咪咕回放', url:`https://www.miguvideo.com/mgs/search/v3/search?keyword=${searchQ}`, cn:true},
        {name:'优酷回放',  url:`https://so.youku.com/search_video/q_${searchQ}`, cn:true},
        {name:'FIFA+ Replay', url:`https://www.fifa.com/fifaplus/en/search?q=${searchQEn}`, cn:false},
        {name:'YouTube',  url:`https://www.youtube.com/results?search_query=${searchQEn}+highlight`, cn:false},
      ];

  const sectionLabel = lang==='zh'
    ? (isLive ? '🔴 立即观看' : '📺 回放')
    : (isLive ? '🔴 Watch Live' : '📺 Replay');

  el.innerHTML = `
    <div style="font-size:10px;font-weight:700;color:${isLive?'var(--red)':'var(--muted)'};margin-bottom:6px;letter-spacing:0.5px">${sectionLabel}</div>
    <div class="stream-links-bar">
      ${platforms.map(p=>`
        <a href="${p.url}" target="_blank" rel="noopener nofollow"
           class="stream-link-btn ${isLive?'live':'replay'}"
           title="${p.cn?(lang==='zh'?'中国区':'CN'):'INTL'}">
          ${p.name}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>`).join('')}
    </div>`;
}

// ── Vote / Predict ──────────────────────────────────────────────────────────
// GitHub OAuth Device Flow
// TODO: Replace with your GitHub OAuth App Client ID
const GH_CLIENT_ID = 'TODO_REPLACE_GITHUB_CLIENT_ID';
const GH_SCOPE = 'public_repo';
const GH_DISCUSS_REPO = 'skyseraph/world-cup-2026';

let ghToken = localStorage.getItem('wc2026_gh_token') || null;
let ghUser = JSON.parse(localStorage.getItem('wc2026_gh_user') || 'null');
let _devicePollTimer = null;

async function ghFetch(query, variables={}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${ghToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function ghRest(path, opts={}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: { Authorization: `token ${ghToken}`, 'Content-Type': 'application/json', ...(opts.headers||{}) },
  });
  return res.json();
}

async function fetchGhUser() {
  const u = await ghRest('/user');
  if (u.login) { ghUser = {login:u.login, avatar:u.avatar_url}; localStorage.setItem('wc2026_gh_user', JSON.stringify(ghUser)); }
}

// Get or create a Discussion for this match, return discussion number
async function getOrCreateDiscussion(matchId, matchLabel) {
  // Search existing discussions by title
  const owner = GH_DISCUSS_REPO.split('/')[0];
  const repo  = GH_DISCUSS_REPO.split('/')[1];
  const searchRes = await ghFetch(`
    query($q:String!) { search(query:$q, type:DISCUSSION, first:5) {
      nodes { ... on Discussion { number title } }
    }}
  `, { q: `repo:${GH_DISCUSS_REPO} [WC2026-VOTE-${matchId}] in:title` });

  const existing = searchRes?.data?.search?.nodes?.find(n => n.title?.includes(`[WC2026-VOTE-${matchId}]`));
  if (existing) return existing.number;

  // Create new discussion via REST (Discussions API v2)
  // Need category ID — use the one already configured for Giscus (General)
  const catRes = await ghFetch(`
    query($owner:String!,$repo:String!){ repository(owner:$owner,name:$repo){
      discussionCategories(first:10){ nodes{ id name } }
    }}
  `, {owner, repo});
  const cats = catRes?.data?.repository?.discussionCategories?.nodes || [];
  const cat = cats.find(c=>c.name==='General') || cats[0];
  if (!cat) return null;

  // Get repo node id
  const repoRes = await ghFetch(`query($owner:String!,$repo:String!){ repository(owner:$owner,name:$repo){ id }}`, {owner,repo});
  const repoId = repoRes?.data?.repository?.id;
  if (!repoId) return null;

  const createRes = await ghFetch(`
    mutation($repoId:ID!,$catId:ID!,$title:String!,$body:String!){
      createDiscussion(input:{repositoryId:$repoId,categoryId:$catId,title:$title,body:$body}){
        discussion{ number }
      }
    }
  `, { repoId, catId:cat.id, title:`[WC2026-VOTE-${matchId}] ${matchLabel}`, body:`竞猜：${matchLabel}\n\n请在下方投票回复，格式：主胜/平局/客胜` });
  return createRes?.data?.createDiscussion?.discussion?.number || null;
}

// Fetch votes: comments on the discussion, parse "主胜"|"HOME"|"H", "平局"|"DRAW"|"D", "客胜"|"AWAY"|"A"
async function fetchVotes(discussionNumber) {
  const owner = GH_DISCUSS_REPO.split('/')[0];
  const repo  = GH_DISCUSS_REPO.split('/')[1];
  const res = await ghFetch(`
    query($owner:String!,$repo:String!,$num:Int!){
      repository(owner:$owner,name:$repo){
        discussion(number:$num){
          comments(first:100){ nodes{ author{login avatarUrl} body createdAt } }
        }
      }
    }
  `, {owner,repo,num:discussionNumber});
  const comments = res?.data?.repository?.discussion?.comments?.nodes || [];
  const votes = {home:[], draw:[], away:[]};
  const seen = new Set();
  comments.forEach(c => {
    if (seen.has(c.author?.login)) return; // one vote per user
    seen.add(c.author?.login);
    const b = c.body.trim().toUpperCase();
    if (/^(主胜|HOME|H|WIN|1)/.test(b)) votes.home.push(c.author?.login);
    else if (/^(平局|DRAW|D|X)/.test(b)) votes.draw.push(c.author?.login);
    else if (/^(客胜|AWAY|A|WIN|2)/.test(b)) votes.away.push(c.author?.login);
  });
  return votes;
}

async function postVote(discussionNumber, choice) {
  const owner = GH_DISCUSS_REPO.split('/')[0];
  const repo  = GH_DISCUSS_REPO.split('/')[1];
  // Get discussion node ID
  const res = await ghFetch(`
    query($owner:String!,$repo:String!,$num:Int!){
      repository(owner:$owner,name:$repo){ discussion(number:$num){ id } }
    }
  `, {owner,repo,num:discussionNumber});
  const discId = res?.data?.repository?.discussion?.id;
  if (!discId) return false;
  const body = choice==='home'?'主胜':choice==='draw'?'平局':'客胜';
  await ghFetch(`
    mutation($discId:ID!,$body:String!){ addDiscussionComment(input:{discussionId:$discId,body:$body}){ comment{ id } }}
  `, {discId, body});
  return true;
}

// Start Device Flow login
async function startDeviceFlow(onUpdate) {
  if (GH_CLIENT_ID === 'TODO_REPLACE_GITHUB_CLIENT_ID') {
    onUpdate({state:'no_client_id'});
    return;
  }
  onUpdate({state:'requesting'});
  const res = await fetch('https://github.com/login/device/code', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
    body:`client_id=${GH_CLIENT_ID}&scope=${GH_SCOPE}`,
  });
  const d = await res.json();
  if (!d.device_code) { onUpdate({state:'error'}); return; }
  onUpdate({state:'code', userCode:d.user_code, verificationUri:d.verification_uri});

  if (_devicePollTimer) clearInterval(_devicePollTimer);
  _devicePollTimer = setInterval(async () => {
    const poll = await fetch('https://github.com/login/oauth/access_token', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
      body:`client_id=${GH_CLIENT_ID}&device_code=${d.device_code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
    });
    const pd = await poll.json();
    if (pd.access_token) {
      clearInterval(_devicePollTimer);
      ghToken = pd.access_token;
      localStorage.setItem('wc2026_gh_token', ghToken);
      await fetchGhUser();
      onUpdate({state:'done', user:ghUser});
    } else if (pd.error === 'expired_token' || pd.error === 'access_denied') {
      clearInterval(_devicePollTimer);
      onUpdate({state:'error'});
    }
    // else: authorization_pending or slow_down → keep polling
  }, (d.interval || 5) * 1000);
}

// Render vote panel inside match modal
const _voteState = {}; // matchId -> {discNum, votes, userChoice, loading}

async function renderVotePanel(m) {
  const el = document.getElementById('mmodal-vote-wrap');
  if (!el) return;

  const hCmp = m.competitors.find(c=>c.qualifier==='home');
  const aCmp = m.competitors.find(c=>c.qualifier==='away');
  const hName = hCmp?.team?.name || '?';
  const aName = aCmp?.team?.name || '?';
  const matchLabel = `${hName} vs ${aName}`;

  const isDone = m.status==='closed'||m.status==='complete';
  const titleTxt = lang==='zh' ? (isDone?'本场竞猜结果':'竞猜这场比赛') : (isDone?'Poll Results':'Predict This Match');

  // Login state
  const loginBtn = `<button class="vote-login-btn" onclick="startVoteLogin('${m.id}','${m.id}')">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
    ${lang==='zh'?'GitHub 登录竞猜':'Login with GitHub to vote'}
  </button>`;

  const userInfo = ghUser
    ? `<div class="vote-user"><img src="${ghUser.avatar}" alt=""><span>@${ghUser.login}</span>
       <button style="background:none;border:none;color:var(--muted);font-size:10px;cursor:pointer" onclick="ghLogout()">退出</button></div>`
    : '';

  // Try to load votes
  let st = _voteState[m.id];
  if (!st) {
    _voteState[m.id] = {loading:true, votes:{home:[],draw:[],away:[]}, discNum:null, userChoice:null};
    st = _voteState[m.id];

    if (ghToken) {
      try {
        const discNum = await getOrCreateDiscussion(m.id, matchLabel);
        st.discNum = discNum;
        if (discNum) {
          st.votes = await fetchVotes(discNum);
          if (ghUser) {
            if (st.votes.home.includes(ghUser.login)) st.userChoice='home';
            else if (st.votes.draw.includes(ghUser.login)) st.userChoice='draw';
            else if (st.votes.away.includes(ghUser.login)) st.userChoice='away';
          }
        }
      } catch(e) {}
    }
    st.loading = false;
  }

  if (st.loading) {
    el.innerHTML = `<div class="vote-wrap"><div style="text-align:center;color:var(--muted);font-size:11px;padding:8px">${lang==='zh'?'加载竞猜数据...':'Loading poll...'}</div></div>`;
    return;
  }

  const total = st.votes.home.length + st.votes.draw.length + st.votes.away.length;
  const pct = n => total > 0 ? Math.round(n/total*100) : 0;
  const hp = pct(st.votes.home.length), dp = pct(st.votes.draw.length), ap = pct(st.votes.away.length);

  const optClass = (key) => {
    let cls = 'vote-opt';
    if (st.userChoice === key) cls += key==='home'?' selected':key==='draw'?' selected draw-sel':' selected away-sel';
    return cls;
  };

  const voteAction = (key) => {
    if (!ghToken) return `onclick="startVoteLogin('${m.id}','${key}')"`;
    if (isDone || st.userChoice) return '';
    return `onclick="submitVote('${m.id}','${key}')"`;
  };

  el.innerHTML = `<div class="vote-wrap">
    <div class="vote-title">
      <span>${titleTxt}</span>
      <span style="color:var(--muted)">${total} ${lang==='zh'?'票':'votes'}</span>
    </div>
    <div class="vote-options">
      <div class="${optClass('home')}" ${voteAction('home')}>
        <div class="vote-opt-label">${lang==='zh'?'主胜':'Home Win'}</div>
        <div class="vote-opt-name">${hName}</div>
        <div class="vote-opt-pct" style="color:var(--accent)">${hp}%</div>
      </div>
      <div class="${optClass('draw')}" ${voteAction('draw')}>
        <div class="vote-opt-label">${lang==='zh'?'平局':'Draw'}</div>
        <div class="vote-opt-name">—</div>
        <div class="vote-opt-pct" style="color:var(--gold)">${dp}%</div>
      </div>
      <div class="${optClass('away')}" ${voteAction('away')}>
        <div class="vote-opt-label">${lang==='zh'?'客胜':'Away Win'}</div>
        <div class="vote-opt-name">${aName}</div>
        <div class="vote-opt-pct" style="color:var(--accent2)">${ap}%</div>
      </div>
    </div>
    <div class="vote-bar-wrap">
      <div class="vote-bar-h" style="width:${hp}%"></div>
      <div class="vote-bar-d" style="width:${dp}%"></div>
      <div class="vote-bar-a" style="width:${ap}%"></div>
    </div>
    <div id="vote-device-${m.id}"></div>
    <div class="vote-footer">
      ${ghToken ? userInfo : loginBtn}
      ${st.userChoice ? `<span style="color:var(--green);font-size:10px">✓ ${lang==='zh'?'已投票':'Voted'}</span>` : ''}
      ${isDone&&!st.userChoice&&ghToken ? `<span style="font-size:10px;color:var(--muted)">${lang==='zh'?'比赛已结束':'Match ended'}</span>` : ''}
    </div>
    <div style="font-size:9px;color:var(--muted);margin-top:6px">${lang==='zh'?'数据存储于 GitHub Discussions，需登录 GitHub':'Results stored on GitHub Discussions — login required'}</div>
  </div>`;
}

window.submitVote = async function(matchId, choice) {
  const st = _voteState[matchId];
  if (!st || !ghToken || st.userChoice) return;
  if (!st.discNum) return;
  st.userChoice = choice; // optimistic
  st.votes[choice].push(ghUser?.login || '?');
  // Re-render current modal
  const m = S.recentMatches.find(e=>e.id===matchId);
  if (m) renderVotePanel(m);
  await postVote(st.discNum, choice);
};

window.startVoteLogin = function(matchId, pendingChoice) {
  const deviceEl = document.getElementById(`vote-device-${matchId}`);
  if (!deviceEl) return;

  startDeviceFlow(async (state) => {
    if (state.state === 'no_client_id') {
      deviceEl.innerHTML = `<div class="vote-device-code" style="color:var(--red);font-size:11px">
        ⚠ GitHub OAuth App 未配置。请联系站长设置 Client ID。
      </div>`;
      return;
    }
    if (state.state === 'code') {
      deviceEl.innerHTML = `<div class="vote-device-code">
        <div style="font-size:11px;margin-bottom:4px">${lang==='zh'?'1. 打开':'1. Open'} <a href="${state.verificationUri}" target="_blank" style="color:var(--accent)">${state.verificationUri}</a></div>
        <div style="font-size:11px;margin-bottom:6px">${lang==='zh'?'2. 输入验证码：':'2. Enter code:'}</div>
        <div class="vote-code-big">${state.userCode}</div>
        <div class="vote-status-msg">${lang==='zh'?'等待授权...(有效期15分钟)':'Waiting for authorization... (15 min)'}</div>
      </div>`;
    }
    if (state.state === 'done') {
      deviceEl.innerHTML = '';
      delete _voteState[matchId]; // force reload
      const m = S.recentMatches.find(e=>e.id===matchId);
      if (m) {
        await renderVotePanel(m);
        if (pendingChoice && pendingChoice !== matchId) {
          await window.submitVote(matchId, pendingChoice);
        }
      }
    }
    if (state.state === 'error') {
      deviceEl.innerHTML = `<div style="font-size:10px;color:var(--red);padding:4px 0">${lang==='zh'?'授权失败，请重试':'Auth failed, please retry'}</div>`;
    }
  });
};

window.ghLogout = function() {
  ghToken = null; ghUser = null;
  localStorage.removeItem('wc2026_gh_token');
  localStorage.removeItem('wc2026_gh_user');
  // re-render current open modal if any
  const openMatch = S.recentMatches.find(m => {
    const modal = document.getElementById('match-modal');
    return modal?.classList.contains('show');
  });
};

// ── Standings ──────────────────────────────────────────────────────────────
function renderStandings(){
  const container=document.getElementById('standings-list');
  if(!S.standings.length) return;
  container.innerHTML=S.standings.map((grp,gi)=>{
    const color=GROUP_COLORS[gi%GROUP_COLORS.length];
    const rows=[...grp.entries].sort((a,b)=>a.position-b.position).map((e,idx)=>{
      const td=S.teamIndex[e.team.abbreviation]||e.team;
      const cls=idx<2?`q${idx+1}`:idx===2?'q3':'';
      const gd=e.goal_difference;
      const gdCls=gd>0?'gd-p':gd<0?'gd-n':'';
      const gdStr=(gd>0?'+':'')+gd;
      return `<tr class="${cls} clickable" data-abbr="${e.team.abbreviation}">
        <td class="pos">${e.position}</td>
        <td><div class="tcell">${flagImg(td,'')} ${lang==='zh'?e.team.name:e.team.abbreviation} ${favBtnHTML(e.team.abbreviation)}</div></td>
        <td>${e.played}</td><td>${e.won}</td><td>${e.drawn}</td><td>${e.lost}</td>
        <td class="${gdCls}">${gdStr}</td><td class="pts">${e.points}</td>
      </tr>`;
    }).join('');
    return `<div class="group-block" data-gi="${gi}">
      <div class="group-hdr" onclick="toggleGrp(${gi})">
        <span class="gdot" style="background:${color}"></span>
        <span class="gname">${grp.name}</span>
        <span class="gchev">▼</span>
      </div>
      <div class="group-body">
        <table class="stn-table">
          <thead><tr><th>${t('col_pos')}</th><th>${t('col_team')}</th>
            <th>${t('col_p')}</th><th>${t('col_w')}</th><th>${t('col_d')}</th>
            <th>${t('col_l')}</th><th>${t('col_gd')}</th><th>${t('col_pts')}</th>
          </tr></thead><tbody>${rows}</tbody>
        </table>
        <div class="stn-hint">${t('click_detail')}</div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('[data-abbr]').forEach(row=>{
    row.addEventListener('click',e=>{
      if(e.target.closest('.fav-btn')) return;
      showGlobeTeamDetailByAbbr(row.dataset.abbr);
      activateView('globe');
    });
  });
}
window.toggleGrp=function(gi){document.querySelector(`.group-block[data-gi="${gi}"]`)?.classList.toggle('collapsed');};

// ── Predictions ────────────────────────────────────────────────────────────
function renderPredictions(){
  document.getElementById('predict-title-txt').textContent=t('predict_title');
  document.getElementById('predict-intro-txt').textContent=t('predict_intro');
  const container=document.getElementById('predict-list');
  const matches=[...S.recentMatches].sort((a,b)=>{
    // upcoming first, then recent
    const aUp=a.status==='not_started'||a.status==='scheduled';
    const bUp=b.status==='not_started'||b.status==='scheduled';
    if(aUp&&!bUp) return -1; if(!aUp&&bUp) return 1;
    return new Date(a.start_time)-new Date(b.start_time);
  });
  if(!matches.length){container.innerHTML=`<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">${t('no_matches')}</p>`;return;}
  container.innerHTML=matches.map((m,i)=>predictCardHTML(m,i)).join('');
  container.querySelectorAll('.predict-card').forEach((card,i)=>{
    card.addEventListener('click',()=>togglePredictDetail(card,matches[i]));
  });
}

function predictCardHTML(m,idx){
  const hCmp=m.competitors.find(c=>c.qualifier==='home');
  const aCmp=m.competitors.find(c=>c.qualifier==='away');
  const hT=S.teamIndex[hCmp?.team?.abbreviation]||hCmp?.team||{};
  const aT=S.teamIndex[aCmp?.team?.abbreviation]||aCmp?.team||{};
  const {h,d,a}=calcPcts(m.odds?.moneyline);
  const isDone=m.status==='closed'||m.status==='complete';
  const favour=h>a?(hCmp?.team?.name||'?'):(aCmp?.team?.name||'?');
  const resultNote=isDone?`<span style="color:var(--gold);font-weight:600"> · ${lang==='zh'?'结果':'Result'}: ${m.scores?.home??0}–${m.scores?.away??0}</span>`:'';
  return `<div class="predict-card" data-idx="${idx}">
    <div class="predict-hdr">
      <div class="predict-teams-txt">
        <img src="${hT.crest||''}" style="width:20px;height:14px;object-fit:cover;border-radius:2px;vertical-align:middle;flex-shrink:0" onerror="this.style.display='none'">
        <span style="font-size:12px">${hCmp?.team?.name||'?'}</span>
        <span style="color:var(--muted);font-size:11px;flex-shrink:0">vs</span>
        <span style="font-size:12px">${aCmp?.team?.name||'?'}</span>
        <img src="${aT.crest||''}" style="width:20px;height:14px;object-fit:cover;border-radius:2px;vertical-align:middle;flex-shrink:0" onerror="this.style.display='none'">
      </div>
      <div class="predict-time">${fmtTime(m.start_time)}</div>
    </div>
    <div class="pred-bars">
      <div class="bar-h" style="width:${h}%"></div>
      <div class="bar-d" style="width:${d}%"></div>
      <div class="bar-a" style="width:${a}%"></div>
    </div>
    <div class="pred-pcts">
      <span style="color:var(--accent)">${h}% ${t('odds_h')}</span>
      <span style="color:var(--gold)">${d}% ${t('odds_d')}</span>
      <span style="color:var(--accent2)">${a}% ${t('odds_a')}</span>
    </div>
    <div class="pred-verdict">
      <span>${lang==='zh'?'预测':'Prediction'}: <strong>${favour}</strong>${lang==='zh'?' 胜算更大':' favored'}${resultNote}</span>
      <span class="expand-hint">${lang==='zh'?'展开分析 ▼':'Details ▼'}</span>
    </div>
    <div class="predict-detail" id="pred-detail-${idx}"></div>
  </div>`;
}

function togglePredictDetail(card, m){
  const idx=card.dataset.idx;
  const detail=document.getElementById(`pred-detail-${idx}`);
  if(detail.classList.contains('open')){detail.classList.remove('open');return;}
  detail.classList.add('open');
  if(detail.innerHTML) return; // already built
  detail.innerHTML=buildPredictAnalysis(m);
}

function buildPredictAnalysis(m){
  const hCmp=m.competitors.find(c=>c.qualifier==='home');
  const aCmp=m.competitors.find(c=>c.qualifier==='away');
  const hT=S.teamIndex[hCmp?.team?.abbreviation]||{};
  const aT=S.teamIndex[aCmp?.team?.abbreviation]||{};
  const hS=hT.standing, aS=aT.standing;
  const odds=m.odds?.moneyline;
  const {h,d,a}=calcPcts(odds);

  // Odds section
  const oddsHTML=odds?`<div class="analysis-section">
    <div class="analysis-label">${t('analysis_odds')}</div>
    <div class="odds-comparison">
      <div class="odds-col h-col"><div class="odds-val">${odds.home}</div><div class="odds-lbl">${hCmp?.team?.abbreviation||'H'}</div><div class="odds-pct" style="color:var(--accent)">${h}%</div></div>
      <div class="odds-col d-col"><div class="odds-val">${odds.draw}</div><div class="odds-lbl">${lang==='zh'?'平局':'Draw'}</div><div class="odds-pct" style="color:var(--gold)">${d}%</div></div>
      <div class="odds-col a-col"><div class="odds-val">${odds.away}</div><div class="odds-lbl">${aCmp?.team?.abbreviation||'A'}</div><div class="odds-pct" style="color:var(--accent2)">${a}%</div></div>
    </div>
    <div class="analysis-body" style="font-size:10px;color:var(--muted)">${lang==='zh'?'赔率来源：DraftKings':'Source: DraftKings'}</div>
  </div>`:'' ;

  // Form section
  const formRow=(abbr,name)=>{
    const matches=(S.teamMatches[abbr]||[]).filter(x=>x.status==='closed'||x.status==='complete').slice(-5);
    if(!matches.length) return '';
    const dots=matches.map(mx=>{
      const r=matchResult(mx,abbr);
      return r?`<div class="form-dot form-${r}">${r}</div>`:'';
    }).join('');
    return `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;margin-bottom:4px">${name}</div><div class="form-row">${dots}</div></div>`;
  };
  const formHTML=`<div class="analysis-section">
    <div class="analysis-label">${t('analysis_form')}</div>
    ${formRow(hCmp?.team?.abbreviation,hCmp?.team?.name||'')}
    ${formRow(aCmp?.team?.abbreviation,aCmp?.team?.name||'')}
  </div>`;

  // Context
  const hPts=hS?.points??0, aPts=aS?.points??0;
  const hPos=hS?.position??'?', aPos=aS?.position??'?';
  const contextLines=lang==='zh'?[
    `${hCmp?.team?.name||'主队'} 积分 ${hPts} 分，组内第 ${hPos} 位`,
    `${aCmp?.team?.name||'客队'} 积分 ${aPts} 分，组内第 ${aPos} 位`,
    hS&&aS&&hPts!==aPts?(hPts>aPts?`${hCmp?.team?.name} 积分领先，形势占优`:`${aCmp?.team?.name} 积分领先，形势占优`):'双队积分相同，势均力敌',
    m.odds?.over_under?`大小球盘口：${m.odds.over_under}（${lang==='zh'?'大':'Over'} ${m.odds?.total?.over?.odds||'?'} / ${lang==='zh'?'小':'Under'} ${m.odds?.total?.under?.odds||'?'}）`:'',
  ]:[
    `${hCmp?.team?.name||'Home'} — ${hPts} pts, Rank #${hPos} in group`,
    `${aCmp?.team?.name||'Away'} — ${aPts} pts, Rank #${aPos} in group`,
    hS&&aS&&hPts!==aPts?(hPts>aPts?`${hCmp?.team?.name} leads on points`:`${aCmp?.team?.name} leads on points`):'Equal on points — evenly matched',
    m.odds?.over_under?`O/U Line: ${m.odds.over_under} (Over ${m.odds?.total?.over?.odds||'?'} / Under ${m.odds?.total?.under?.odds||'?'})`:'',
  ];
  const contextHTML=`<div class="analysis-section">
    <div class="analysis-label">${t('analysis_context')}</div>
    <div class="analysis-body">${contextLines.filter(Boolean).map(l=>`• ${l}`).join('<br>')}</div>
  </div>`;

  return oddsHTML+formHTML+contextHTML+
    `<div class="predict-disclaimer">⚠ ${lang==='zh'?'AI预测，仅供参考，不构成投注建议':'AI prediction only — not betting advice'}</div>`;
}

// ── Live Streams ────────────────────────────────────────────────────────────
const LIVE_STREAMS = {
  zh: [
    { name:'CCTV5+', sub:'央视体育 · 官方直播', url:'https://tv.cctv.com/live/cctv5p/', badge:'cn' },
    { name:'咪咕视频', sub:'中国移动官方版权平台', url:'https://www.miguvideo.com/', badge:'cn' },
    { name:'优酷体育', sub:'部分场次付费直播', url:'https://sports.youku.com/', badge:'cn' },
    { name:'腾讯体育', sub:'部分场次免费直播', url:'https://sports.qq.com/', badge:'cn' },
  ],
  intl: [
    { name:'FIFA+', sub:'Official · Free · Geo-restricted', url:'https://www.fifa.com/fifaplus/en/live', badge:'intl' },
    { name:'FOX Sports', sub:'USA · Fox / FS1 / FS2', url:'https://www.foxsports.com/', badge:'intl' },
    { name:'Peacock', sub:'USA · Telemundo / NBC', url:'https://www.peacocktv.com/', badge:'intl' },
    { name:'BBC iPlayer', sub:'UK · Geo-restricted', url:'https://www.bbc.co.uk/iplayer', badge:'intl' },
    { name:'ITV / ITVX', sub:'UK · Geo-restricted', url:'https://www.itv.com/', badge:'intl' },
    { name:'DAZN', sub:'Global · Subscription required', url:'https://www.dazn.com/', badge:'intl' },
  ],
};

function renderLive(){
  const container=document.getElementById('live-list');
  document.getElementById('live-title-txt').textContent=t('live_title');
  const cnLabel=lang==='zh'?'🇨🇳 中国区直播平台':'🇨🇳 Chinese Platforms';
  const intlLabel=lang==='zh'?'🌐 国际直播平台':'🌐 International Platforms';
  const disclaimerZh='⚠ 直播权限按地区限制，部分平台需要账号或付费。点击跳转外部平台，与本站无关。';
  const disclaimerEn='⚠ Streams are geo-restricted. Some require subscription. External links — not affiliated.';

  const makeCards=streams=>streams.map(s=>`
    <a href="${s.url}" target="_blank" rel="noopener nofollow" class="live-card">
      <span class="live-dot"></span>
      <div style="flex:1;min-width:0">
        <div class="live-name">${s.name}</div>
        <div class="live-sub">${s.sub}</div>
      </div>
      <span class="live-badge ${s.badge}">${s.badge==='cn'?(lang==='zh'?'国内':'CN'):'INTL'}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.4;flex-shrink:0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>`).join('');

  container.innerHTML=`
    <div class="live-section-hdr">${cnLabel}</div>
    ${makeCards(LIVE_STREAMS.zh)}
    <div class="live-section-hdr" style="margin-top:8px">${intlLabel}</div>
    ${makeCards(LIVE_STREAMS.intl)}
    <p style="font-size:10px;color:var(--muted);margin-top:12px;line-height:1.7">${lang==='zh'?disclaimerZh:disclaimerEn}</p>
  `;
}

// ── ICS Export ─────────────────────────────────────────────────────────────
function buildICS(matches) {
  const pad = n => String(n).padStart(2,'0');
  function toICSDate(iso) {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WC2026//World Cup 2026//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'X-WR-CALNAME:FIFA World Cup 2026','X-WR-TIMEZONE:UTC',
  ];
  matches.forEach(m => {
    const hCmp = m.competitors.find(c=>c.qualifier==='home');
    const aCmp = m.competitors.find(c=>c.qualifier==='away');
    const summary = `⚽ ${hCmp?.team?.name||'?'} vs ${aCmp?.team?.name||'?'}`;
    const start = toICSDate(m.start_time);
    const end = toICSDate(new Date(new Date(m.start_time).getTime()+105*60000).toISOString());
    const location = m.venue ? `${m.venue.name}\\, ${m.venue.city}` : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:wc2026-${m.id}@skyseraph.github.io`,
      `DTSTART:${start}`,`DTEND:${end}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      `DESCRIPTION:FIFA World Cup 2026 · ${m.venue?.city||''}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}
window.downloadICS = function(matches) {
  const blob = new Blob([buildICS(matches)], {type:'text/calendar;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wc2026.ics';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
};

// ── Bracket ─────────────────────────────────────────────────────────────────
function renderBracket() {
  const wrap = document.getElementById('bracket-wrap');
  const titleEl = document.getElementById('bracket-title-txt');
  if (titleEl) titleEl.textContent = lang==='zh' ? '🥊 淘汰赛对阵' : '🥊 Knockout Stage';
  if (!wrap) return;

  // Check if we have knockout matches (round of 32 or later)
  const knockoutRounds = ['round_of_32','round_of_16','quarterfinal','semifinal','final','third_place'];
  const koMatches = S.recentMatches.filter(m =>
    knockoutRounds.some(r => (m.round||m.round_name||'').toLowerCase().includes(r.replace('_',' ').replace('_','').toLowerCase()))
  );

  if (!koMatches.length) {
    wrap.innerHTML = `<div class="bracket-placeholder">
      <div class="bp-icon">🏆</div>
      <div class="bp-title">${lang==='zh'?'淘汰赛尚未开始':'Knockout stage not yet started'}</div>
      <div class="bp-sub">${lang==='zh'
        ?'小组赛结束后（预计 6 月 27 日），本页将自动显示 32 强淘汰赛对阵图。\n目前共 12 个小组，各组前 2 名 + 8 个最佳第三名晋级。'
        :'Once the group stage ends (est. June 27), the Round of 32 bracket will appear here automatically.\n12 groups — top 2 from each + 8 best 3rd-place teams advance.'
      }</div>
    </div>`;
    return;
  }

  // When knockout data exists, render a bracket
  // Group by round
  const ROUND_ORDER = ['round_of_32','round_of_16','quarterfinal','semifinal','final'];
  const ROUND_LABELS = {
    zh: {round_of_32:'32强',round_of_16:'16强',quarterfinal:'8强',semifinal:'四强',final:'决赛'},
    en: {round_of_32:'R32',round_of_16:'R16',quarterfinal:'QF',semifinal:'SF',final:'Final'},
  };
  const byRound = {};
  koMatches.forEach(m => {
    const r = ROUND_ORDER.find(rk => (m.round||m.round_name||'').toLowerCase().includes(rk.replace('_',' '))) || 'round_of_32';
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(m);
  });

  const rounds = ROUND_ORDER.filter(r => byRound[r]);
  wrap.innerHTML = `<div class="bracket-rounds">
    ${rounds.map(r => {
      const ms = byRound[r];
      const label = ROUND_LABELS[lang][r] || r;
      return `<div class="bracket-col">
        <div class="bracket-col-title">${label}</div>
        <div class="bracket-matches">
          ${ms.map(m => bracketCardHTML(m)).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function bracketCardHTML(m) {
  const hCmp = m.competitors.find(c=>c.qualifier==='home');
  const aCmp = m.competitors.find(c=>c.qualifier==='away');
  const hT = S.teamIndex[hCmp?.team?.abbreviation]||hCmp?.team||{};
  const aT = S.teamIndex[aCmp?.team?.abbreviation]||aCmp?.team||{};
  const isDone = m.status==='closed'||m.status==='complete';
  const hScore = isDone ? (m.scores?.home??0) : '';
  const aScore = isDone ? (m.scores?.away??0) : '';
  const hWin = isDone && hScore > aScore;
  const aWin = isDone && aScore > hScore;
  const tbd = lang==='zh'?'待定':'TBD';
  const teamRow = (t2, score, win) =>
    `<div class="bracket-team${win?' winner':''}">
      <img src="${t2.crest||''}" onerror="this.style.display='none'" alt="">
      <span class="bt-name">${t2.name||t2.abbreviation||tbd}</span>
      ${isDone?`<span class="bt-score">${score}</span>`:''}
    </div>`;
  return `<div class="bracket-slot">
    <div class="bracket-card">
      ${teamRow(hT, hScore, hWin)}
      ${teamRow(aT, aScore, aWin)}
    </div>
  </div>`;
}

// ── Scorer Board ────────────────────────────────────────────────────────────
let currentScorerTab = 'goals';

async function renderScorers() {
  const listEl = document.getElementById('scorers-list');
  const titleEl = document.getElementById('scorers-title-txt');
  if (titleEl) titleEl.textContent = lang==='zh' ? '📊 数据榜单' : '📊 Statistics';
  if (!listEl) return;

  listEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:11px">${lang==='zh'?'加载中...':'Loading...'}</div>`;

  // Load all available timelines
  const loadedIds = Object.keys(S.matchTimelines);
  const closedMatches = S.recentMatches.filter(m=>m.status==='closed'||m.status==='complete');
  for (const m of closedMatches) {
    if (!S.matchTimelines[m.id]) {
      S.matchTimelines[m.id] = await fetchTimeline(m.id);
    }
  }

  // Aggregate
  const goalMap = {}, yellowMap = {};
  Object.entries(S.matchTimelines).forEach(([eid, events]) => {
    events.forEach(e => {
      if (e.type === 'goal' && e.player?.name) {
        const key = e.player.id || e.player.name;
        if (!goalMap[key]) goalMap[key] = {name:e.player.name, team:e.team?.name||'', abbr:'', count:0};
        goalMap[key].count++;
      }
      if (e.type === 'yellow_card' && e.player?.name) {
        const key = e.player.id || e.player.name;
        if (!yellowMap[key]) yellowMap[key] = {name:e.player.name, team:e.team?.name||'', abbr:'', count:0};
        yellowMap[key].count++;
      }
    });
  });

  // Match abbr from team name
  Object.values(S.teamIndex).forEach(t2 => {
    [goalMap, yellowMap].forEach(map => {
      Object.values(map).forEach(row => {
        if (row.team === t2.name) row.abbr = t2.abbreviation;
      });
    });
  });

  updateScorerTabUI();
  renderScorerList(currentScorerTab === 'goals' ? goalMap : yellowMap, currentScorerTab);
}

function updateScorerTabUI() {
  document.querySelectorAll('.scorer-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.stab === currentScorerTab);
    if (btn.dataset.stab === 'goals') btn.textContent = '⚽ ' + (lang==='zh'?'射手榜':'Top Scorers');
    if (btn.dataset.stab === 'yellow') btn.textContent = '🟨 ' + (lang==='zh'?'黄牌榜':'Yellow Cards');
  });
}

function renderScorerList(map, type) {
  const listEl = document.getElementById('scorers-list');
  if (!listEl) return;
  const sorted = Object.values(map).sort((a,b)=>b.count-a.count).slice(0,20);
  if (!sorted.length) {
    listEl.innerHTML=`<p style="text-align:center;color:var(--muted);font-size:11px;padding:20px">${lang==='zh'?'暂无数据':'No data yet'}</p>`;
    return;
  }
  listEl.innerHTML = sorted.map((row,i) => {
    const team = S.teamIndex[row.abbr] || {};
    const rankCls = i < 3 ? ' top3' : '';
    const countCls = type==='yellow' ? ' yellow' : '';
    return `<div class="scorer-row">
      <span class="scorer-rank${rankCls}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
      <img class="scorer-flag" src="${team.crest||''}" onerror="this.style.display='none'" alt="">
      <div style="flex:1;min-width:0">
        <div class="scorer-name">${row.name}</div>
        <div class="scorer-team">${row.team}</div>
      </div>
      <span class="scorer-count${countCls}">${row.count}</span>
    </div>`;
  }).join('');
}

function initScorerTabs() {
  document.querySelectorAll('.scorer-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentScorerTab = btn.dataset.stab;
      renderScorers();
    });
  });
}

// ── Team Compare ────────────────────────────────────────────────────────────
window.openTeamCompare = function(abbrA, abbrB) {
  const tA = S.teamIndex[abbrA], tB = S.teamIndex[abbrB];
  if (!tA || !tB) return;
  const sA = tA.standing, sB = tB.standing;

  document.getElementById('compare-title').textContent = lang==='zh' ? '球队对比' : 'Team Compare';

  const teamHTML = (team, s) => `
    <img class="compare-flag" src="${team.crest||''}" onerror="this.style.display='none'" alt="">
    <div class="compare-name">${team.name||team.abbreviation}</div>
    <div style="font-size:10px;color:var(--muted)">${team.group||''}</div>
  `;
  document.getElementById('compare-team-left').innerHTML = teamHTML(tA, sA);
  document.getElementById('compare-team-right').innerHTML = teamHTML(tB, sB);

  const stats = [
    [lang==='zh'?'积分':'Points', sA?.points??'—', sB?.points??'—'],
    [lang==='zh'?'场次':'Played', sA?.played??'—', sB?.played??'—'],
    [lang==='zh'?'胜':'W', sA?.won??'—', sB?.won??'—'],
    [lang==='zh'?'平':'D', sA?.drawn??'—', sB?.drawn??'—'],
    [lang==='zh'?'负':'L', sA?.lost??'—', sB?.lost??'—'],
    [lang==='zh'?'进球':'GF', sA?.goals_for??'—', sB?.goals_for??'—'],
    [lang==='zh'?'失球':'GA', sA?.goals_against??'—', sB?.goals_against??'—'],
    [lang==='zh'?'净球差':'GD', sA?.goal_difference??'—', sB?.goal_difference??'—'],
  ];

  document.getElementById('compare-body').innerHTML = stats.map(([label, va, vb]) => {
    const numA = parseFloat(va), numB = parseFloat(vb);
    const clsA = (!isNaN(numA)&&!isNaN(numB)) ? (numA>numB?'home':numA<numB?'tie':'tie') : '';
    const clsB = (!isNaN(numA)&&!isNaN(numB)) ? (numB>numA?'away':numB<numA?'tie':'tie') : '';
    return `<div class="compare-stat-row">
      <div class="cs-val ${clsA}">${va}</div>
      <div class="cs-label">${label}</div>
      <div class="cs-val ${clsB}">${vb}</div>
    </div>`;
  }).join('') + `
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:center">
      <button class="compare-btn" onclick="showGlobeTeamDetailByAbbr('${abbrA}');closeCompare();activateView('globe')">${tA.abbreviation} 详情</button>
      <button class="compare-btn" onclick="showGlobeTeamDetailByAbbr('${abbrB}');closeCompare();activateView('globe')">${tB.abbreviation} 详情</button>
    </div>`;

  document.getElementById('compare-modal').classList.add('show');
};

function closeCompare() { document.getElementById('compare-modal').classList.remove('show'); }
window.closeCompare = closeCompare;

function initCompare() {
  document.getElementById('compare-close').addEventListener('click', closeCompare);
  document.getElementById('compare-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('compare-modal')) closeCompare();
  });
}

// ── AI Chat ────────────────────────────────────────────────────────────────
let apiKey='';
const chatMsgs=document.getElementById('chat-messages');

function initChat(){
  // Restore saved key
  const saved=localStorage.getItem('wc2026_api_key');
  if(saved){setKey(saved);}

  document.getElementById('api-key-input').addEventListener('input',e=>{
    const v=e.target.value.trim();
    if(v.startsWith('sk-ant-')){setKey(v);}
  });
  document.getElementById('api-key-input').addEventListener('change',e=>{
    const v=e.target.value.trim();
    if(v.startsWith('sk-ant-')){setKey(v);localStorage.setItem('wc2026_api_key',v);}
  });

  document.getElementById('chat-send').addEventListener('click',sendChat);
  document.getElementById('chat-input').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
  });

  // Quick buttons
  renderQuickBtns();

  // Intro message
  addBubble('assistant', t('ai_intro').replace(/\n/g,'<br>'));
}

function setKey(key){
  apiKey=key;
  document.getElementById('key-dot').classList.add('ready');
  document.getElementById('key-status-text').textContent=t('key_ready');
  document.getElementById('chat-send').disabled=false;
  document.getElementById('chat-input').placeholder=t('chat_placeholder');
}

function renderQuickBtns(){
  document.getElementById('quick-btns').innerHTML=t('quick_qs').map(q=>
    `<button class="quick-btn" onclick="quickAsk('${q.replace(/'/g,"&#39;")}')">${q}</button>`
  ).join('');
}
window.quickAsk=function(q){
  document.getElementById('chat-input').value=q;
  if(apiKey) sendChat(); else document.getElementById('api-key-input').focus();
};

function addBubble(role, html){
  const div=document.createElement('div');
  div.className=`chat-msg ${role}`;
  div.innerHTML=`<div class="bubble">${html}</div>`;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop=chatMsgs.scrollHeight;
  return div;
}

function buildSystemPrompt(){
  // Embed current standings + today's matches as context
  const today=S.recentMatches.filter(m=>{
    const d=new Date(m.start_time).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
    return d===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
  });
  const standingsSummary=S.standings.slice(0,4).map(g=>
    `${g.name}: `+g.entries.sort((a,b)=>a.position-b.position).map(e=>`${e.team.abbreviation}(${e.points}pt)`).join(', ')
  ).join('\n');

  return `You are a FIFA World Cup 2026 expert assistant embedded in a live dashboard.
Current date: ${new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})}
Tournament: FIFA World Cup 2026 — USA/Canada/Mexico, June 11 – July 19, 2026
Format: 12 groups × 4 teams, top 2 + 8 best 3rd advance to Round of 32

Today's WC matches (${today.length}):
${today.map(m=>`• ${m.competitors[0].team.name} vs ${m.competitors[1].team.name} — ${m.status==='closed'?'FT '+m.scores.home+'-'+m.scores.away:new Date(m.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'})}`).join('\n')||'No matches today'}

Selected standings (first 4 groups):
${standingsSummary}

Respond in ${lang==='zh'?'Chinese (Simplified)':'English'}. Be concise and informative. Use tables or lists for structured data. For predictions, always caveat with "AI预测，仅供参考".`;
}

async function sendChat(){
  const input=document.getElementById('chat-input');
  const msg=input.value.trim();
  if(!msg||!apiKey) return;
  input.value='';
  document.getElementById('chat-send').disabled=true;

  addBubble('user', msg.replace(/</g,'&lt;'));

  const thinking=document.createElement('div');
  thinking.className='chat-msg assistant';
  thinking.innerHTML='<div class="thinking-dot"><span></span><span></span><span></span></div>';
  chatMsgs.appendChild(thinking);
  chatMsgs.scrollTop=chatMsgs.scrollHeight;

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'x-api-key':apiKey,
        'anthropic-version':'2023-06-01',
        'content-type':'application/json',
        'anthropic-dangerous-direct-browser-calls':'true',
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:800,
        system:buildSystemPrompt(),
        messages:[{role:'user',content:msg}],
      }),
    });
    if(!res.ok){const err=await res.json();throw new Error(err.error?.message||res.statusText);}
    const data=await res.json();
    const text=data.content?.[0]?.text||'';
    thinking.remove();
    addBubble('assistant', formatAIResponse(text));
  }catch(err){
    thinking.remove();
    addBubble('assistant',`<span style="color:var(--red)">错误: ${err.message}</span>`);
  }finally{
    document.getElementById('chat-send').disabled=false;
    document.getElementById('chat-input').focus();
  }
}

function formatAIResponse(text){
  // Basic markdown: bold, code, line breaks
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code style="background:var(--surface3);padding:1px 4px;border-radius:3px;font-size:10px">$1</code>')
    .replace(/\n/g,'<br>');
}

// ── Nav ────────────────────────────────────────────────────────────────────
function activateView(view){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.querySelectorAll('.panel-section').forEach(s=>s.classList.toggle('active',s.id==='view-'+view));
}
function initNav(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activateView(btn.dataset.view);
      if(btn.dataset.view==='scorers') renderScorers();
    });
  });
  // WeChat QR toggle (click for mobile, hover handled by CSS)
  const wBtn=document.getElementById('wechat-btn');
  const wPop=document.getElementById('wechat-qr-pop');
  if(wBtn&&wPop){
    wBtn.addEventListener('click',e=>{
      e.stopPropagation();
      wPop.style.display=wPop.style.display==='flex'?'none':'flex';
    });
    document.addEventListener('click',()=>{ wPop.style.display='none'; });
    wPop.addEventListener('click',e=>e.stopPropagation());
  }
}

// Language toggle
document.getElementById('lang-btn').addEventListener('click',()=>{
  lang=lang==='zh'?'en':'zh';
  applyI18n();
  renderGlobeIntro();
  renderMatches();
  renderStandings();
  renderPredictions();
  renderLive();
  renderBracket();
  updateScorerTabUI();
  renderQuickBtns();
  startCountdown();
  chatMsgs.innerHTML='';
  addBubble('assistant', t('ai_intro').replace(/\n/g,'<br>'));
});

function renderGlobeIntro(){
  document.getElementById('globe-intro-text').style.display='block';
  document.getElementById('globe-intro-text').innerHTML=t('globe_intro').split('\n').map(l=>`<p>${l}</p>`).join('');
  document.getElementById('globe-team-detail').classList.remove('show');

  // Group color legend
  const legend=document.getElementById('globe-legend');
  if(legend) legend.innerHTML=S.standings.map((grp,gi)=>`
    <div style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:3px 7px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);transition:border-color 0.15s"
         onmouseover="this.style.borderColor='${GROUP_COLORS[gi]}'"
         onmouseout="this.style.borderColor='var(--border)'"
         onclick="highlightGroup(${gi})">
      <span style="width:8px;height:8px;border-radius:50%;background:${GROUP_COLORS[gi]};flex-shrink:0;display:inline-block"></span>
      <span style="font-size:10px;font-weight:600">${grp.name}</span>
    </div>`).join('');

  // Today's matches summary
  const todayEl=document.getElementById('globe-today-matches');
  if(todayEl){
    const todayStr=new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');
    const todayMatches=S.recentMatches.filter(m=>{
      const d=new Date(m.start_time).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');
      return d===todayStr;
    });
    if(todayMatches.length){
      todayEl.innerHTML=`
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px">
          ⚡ ${lang==='zh'?'今日赛事':'Today\'s Matches'} · ${todayMatches.length}场
        </div>
        ${todayMatches.map(m=>{
          const hCmp=m.competitors.find(c=>c.qualifier==='home');
          const aCmp=m.competitors.find(c=>c.qualifier==='away');
          const hT=S.teamIndex[hCmp?.team?.abbreviation]||hCmp?.team||{};
          const aT=S.teamIndex[aCmp?.team?.abbreviation]||aCmp?.team||{};
          const isLive=m.status==='in_progress';
          const isDone=m.status==='closed'||m.status==='complete';
          const score=isDone||isLive
            ? `<span style="font-weight:700;color:${isLive?'var(--red)':'var(--text)'}">${hCmp?.score??0} - ${aCmp?.score??0}</span>`
            : `<span style="color:var(--muted)">${new Date(m.start_time).toLocaleTimeString(lang==='zh'?'zh-CN':'en-US',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'})}</span>`;
          const statusDot=isLive?'<span style="color:var(--red);font-size:9px;animation:pulse 1.5s infinite">● LIVE</span>':'';
          return `<div onclick="globeFocusMatch('${m.id}','${hCmp?.team?.abbreviation||''}','${aCmp?.team?.abbreviation||''}')"
            style="display:flex;align-items:center;gap:6px;padding:7px 8px;margin-bottom:5px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color 0.15s"
            onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'"
            title="${lang==='zh'?'点击旋转地球仪到连线位置':'Click to rotate globe to match arc'}">
            <img src="${hT.crest||''}" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0" onerror="this.style.display='none'">
            <span style="font-size:11px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${hT.name||hCmp?.team?.abbreviation||'?'}</span>
            <span style="font-size:11px;flex-shrink:0">${score}</span>
            ${statusDot}
            <span style="font-size:11px;font-weight:600;flex:1;min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${aT.name||aCmp?.team?.abbreviation||'?'}</span>
            <img src="${aT.crest||''}" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0" onerror="this.style.display='none'">
          </div>`;
        }).join('')}`;
    } else {
      todayEl.innerHTML=`<div style="font-size:11px;color:var(--muted);padding:8px 0">${lang==='zh'?'今日暂无赛事':'No matches today'}</div>`;
    }
  }

  // Update hover hint language
  const hint=document.getElementById('ghc-hint');
  if(hint) hint.textContent=lang==='zh'?'点击查看详情 →':'Click for details →';
  const canvasHint=document.getElementById('canvas-hint');
  if(canvasHint) canvasHint.textContent=lang==='zh'?'🖱 拖拽旋转 · 滚轮缩放 · 点击球队 · 金线=今日赛事':'🖱 Drag · Scroll zoom · Click team · Gold arc = today\'s match';
}

// ── Team coords ────────────────────────────────────────────────────────────
// Clicking a group legend chip shows the first team in that group
window.highlightGroup = function(gi){
  const grp=S.standings[gi];
  if(!grp) return;
  const first=grp.entries[0];
  if(!first) return;
  showGlobeTeamDetailByAbbr(first.team.abbreviation);
  activateView('globe');
};

function getTeamCoords(){
  // Exact 48 teams from World Cup 2026 standings, keyed by ESPN abbreviation
  return {
    // Group A
    MEX:[23.6,-102.5], CZE:[49.8,15.5], KOR:[35.9,127.8], RSA:[-29.0,25.0],
    // Group B
    CAN:[56.1,-106.3], BIH:[44.0,17.7], SUI:[46.8,8.2], QAT:[25.4,51.2],
    // Group C
    BRA:[-14.2,-51.9], SCO:[56.5,-4.2], HAI:[18.9,-72.3], MAR:[31.8,-7.1],
    // Group D
    PAR:[-23.4,-58.4], TUR:[38.9,35.2], AUS:[-25.3,133.8], USA:[37.1,-95.7],
    // Group E
    ECU:[-1.8,-78.2], GER:[51.2,10.5], CIV:[7.5,-5.5], CUW:[12.1,-68.9],
    // Group F
    NED:[52.1,5.3], SWE:[60.1,18.6], JPN:[36.2,138.3], TUN:[33.9,9.6],
    // Group G
    BEL:[50.5,4.5], IRN:[32.4,53.7], EGY:[26.8,30.8], NZL:[-40.9,174.9],
    // Group H
    ESP:[40.5,-3.7], URU:[-32.5,-55.8], KSA:[23.9,45.1], CPV:[16.0,-24.0],
    // Group I
    NOR:[60.5,8.5], FRA:[46.2,2.2], SEN:[14.5,-14.5], IRQ:[33.3,44.4],
    // Group J
    ARG:[-38.4,-63.6], AUT:[47.5,14.6], ALG:[28.0,1.7], JOR:[30.6,36.1],
    // Group K
    COL:[4.6,-74.1], POR:[39.4,-8.2], UZB:[41.3,64.6], COD:[-4.3,15.3],
    // Group L
    ENG:[52.4,-1.9], CRO:[45.1,15.2], PAN:[8.5,-80.8], GHA:[7.9,-1.0],
  };
}

// Click today match card → rotate globe to arc midpoint, then open match
window.globeFocusMatch = function(matchId, hAbbr, aAbbr){
  const coords = getTeamCoords();
  const hPos = coords[hAbbr], aPos = coords[aAbbr];
  if(hPos && aPos && window._globeRotateTo){
    const phi1=(90-hPos[0])*Math.PI/180, th1=Math.PI/2+hPos[1]*Math.PI/180;
    const phi2=(90-aPos[0])*Math.PI/180, th2=Math.PI/2+aPos[1]*Math.PI/180;
    const v1=new THREE.Vector3(Math.sin(phi1)*Math.cos(th1),Math.cos(phi1),Math.sin(phi1)*Math.sin(th1));
    const v2=new THREE.Vector3(Math.sin(phi2)*Math.cos(th2),Math.cos(phi2),Math.sin(phi2)*Math.sin(th2));
    window._globeRotateTo(v1.add(v2).normalize().multiplyScalar(1.5), 1000);
    // Highlight the arc
    if(window._globeTodayArcs){
      window._globeTodayArcs.forEach(a=>{
        a.material.color.set(a.userData.matchId===matchId ? 0xffffff : 0xffd700);
        a.material.opacity = a.userData.matchId===matchId ? 1 : 0.45;
      });
      setTimeout(()=>{
        window._globeTodayArcs.forEach(a=>{a.material.color.set(0xffd700); a.material.opacity=0.7;});
      }, 3000);
    }
  }
  // Open match detail after rotation
  setTimeout(()=>openMatchModal(matchId), 1100);
};

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function main(){
  await loadData();
  prog(90,'渲染界面...');
  applyI18n();
  renderGlobeIntro();
  renderMatches();
  renderStandings();
  renderPredictions();
  renderLive();
  renderBracket();
  initNav();
  initMatchFilter();
  initScorerTabs();
  initCompare();
  initChat();
  startCountdown();
  prog(100,'完成!');
  initGlobe();
  setTimeout(()=>{
    const l=document.getElementById('loading');
    l.classList.add('hidden');
    setTimeout(()=>l.remove(),600);
  },300);
}
main();

