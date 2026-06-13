import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── i18n ───────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    nav_globe:'🌍 地球仪', nav_matches:'📅 赛程', nav_standings:'🏆 积分榜',
    nav_predict:'🔮 预测', nav_skill:'🤖 AI问答',
    globe_intro:'旋转地球查看 48 支参赛队分布\n彩色标记 = 小组颜色\n点击标记 → 右侧显示球队详情',
    peers_title:'同组球队', matches_title_glob:'本届赛事',
    matches_title:'📅 近期赛事', standings_title:'🏆 小组积分榜',
    predict_title:'🔮 赛事预测分析',
    predict_intro:'预测基于赔率（DraftKings）和积分形势。点击任意比赛展开详细分析。',
    skill_title:'🤖 AI 世界杯助手',
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
    nav_predict:'🔮 Predict', nav_skill:'🤖 AI Chat',
    globe_intro:"Rotate the globe to see all 48 teams\nColored markers = group color\nClick a marker → view team details",
    peers_title:'Group rivals', matches_title_glob:'Tournament record',
    matches_title:'📅 Recent Matches', standings_title:'🏆 Group Standings',
    predict_title:'🔮 Match Predictions',
    predict_intro:'Predictions based on DraftKings odds and standings form. Click any match to expand the analysis.',
    skill_title:'🤖 AI World Cup Assistant',
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

// ── Helpers ────────────────────────────────────────────────────────────────
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
      const phi=(90-lat)*Math.PI/180, theta=(lon+180)*Math.PI/180;

      const dot=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,8),new THREE.MeshBasicMaterial({color}));
      dot.position.setFromSphericalCoords(1.02,phi,theta);
      dot.userData={abbr:ab,team:entry.team,group:grp.name,standing:entry,gi};

      const ring=new THREE.Mesh(new THREE.RingGeometry(0.023,0.031,16),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4,side:THREE.DoubleSide}));
      ring.position.copy(dot.position); ring.lookAt(0,0,0);

      // Spike
      const spGeo=new THREE.BufferGeometry().setFromPoints([dot.position.clone().multiplyScalar(0.99),dot.position.clone().multiplyScalar(1.05)]);
      scene.add(new THREE.Line(spGeo,new THREE.LineBasicMaterial({color,opacity:0.45,transparent:true})));

      scene.add(dot); scene.add(ring);
      markers.push({dot,ring}); markerMeshes.push(dot);
    });
  });

  // ── Today's match arcs ────────────────────────────────────────────────────
  const todayArcs = [];
  const todayMatchIds = [];
  const now = new Date();
  const todayStr = now.toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\//g,'-');

  function latLonToVec(lat, lon, r=1.02){
    const phi=(90-lat)*Math.PI/180, theta=(lon+180)*Math.PI/180;
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
    arc.userData={matchId:m.id,isArc:true};
    scene.add(arc);
    todayArcs.push(arc);
    todayMatchIds.push(m.id);
  });

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
  document.getElementById('gtd-sub').textContent=data.group+(s?` · #${s.position}`:'');

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
          ${flagImg(pt,'')}<span>${e.team.abbreviation}</span><span style="color:var(--gold);font-size:10px">${e.standing?.points??e.points??0}pt</span>
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
function renderMatches(){
  const container=document.getElementById('matches-list');
  document.getElementById('matches-title-txt').textContent=t('matches_title');
  const list=[...S.recentMatches].sort((a,b)=>new Date(b.start_time)-new Date(a.start_time));
  if(!list.length){container.innerHTML=`<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">${t('no_matches')}</p>`;return;}
  container.innerHTML=list.map(m=>matchCardHTML(m)).join('');
  container.querySelectorAll('.match-card').forEach((card,i)=>{
    card.addEventListener('click',()=>openMatchModal(list[i].id));
  });
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
      </div>
      <div class="score-box">
        <div class="score-main">${score}</div>
        <div class="score-tag${tagCls}">${tagTxt}</div>
      </div>
      <div class="team-side away">
        ${flagImg(aT,'team-flag-sm')}
        <span class="team-nm">${aCmp?.team?.name||'—'}</span>
      </div>
    </div>
    ${odds?`<div class="odds-strip">
      <div class="odd-chip">${t('odds_h')}<b>${odds.home}</b></div>
      <div class="odd-chip">${t('odds_d')}<b>${odds.draw}</b></div>
      <div class="odd-chip">${t('odds_a')}<b>${odds.away}</b></div>
    </div>`:''}
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
        <td><div class="tcell">${flagImg(td,'')} ${lang==='zh'?e.team.name:e.team.abbreviation}</div></td>
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
    row.addEventListener('click',()=>{
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
    btn.addEventListener('click',()=>activateView(btn.dataset.view));
  });
}

// Language toggle
document.getElementById('lang-btn').addEventListener('click',()=>{
  lang=lang==='zh'?'en':'zh';
  applyI18n();
  renderGlobeIntro();
  renderMatches();
  renderStandings();
  renderPredictions();
  renderQuickBtns();
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
          return `<div onclick="activateView('matches');setTimeout(()=>openMatchModal('${m.id}'),150)"
            style="display:flex;align-items:center;gap:6px;padding:7px 8px;margin-bottom:5px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color 0.15s"
            onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
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
  return {
    MEX:[23.6,-102.5],KOR:[35.9,127.8],RSA:[-29.0,25.0],CZE:[49.8,15.5],
    BRA:[-14.2,-51.9],MAR:[31.8,-7.1],SCO:[56.5,-4.2],HAI:[18.9,-72.3],
    ARG:[-38.4,-63.6],CRO:[45.1,15.2],EGY:[26.8,30.8],DOM:[18.7,-70.2],
    FRA:[46.2,2.2],NGA:[9.1,8.7],JPN:[36.2,138.3],ECU:[-1.8,-78.2],
    ESP:[40.5,-3.7],SEN:[14.5,-14.5],AUS:[-25.3,133.8],VEN:[6.4,-66.6],
    GER:[51.2,10.5],BEL:[50.5,4.5],CHI:[-35.7,-71.5],ELS:[13.8,-88.9],
    POR:[39.4,-8.2],USA:[37.1,-95.7],URU:[-32.5,-55.8],ALG:[28.0,1.7],
    NED:[52.1,5.3],NZL:[-40.9,174.9],CMR:[3.9,11.5],CHN:[35.9,104.2],
    ENG:[52.4,-1.9],IRN:[32.4,53.7],PAN:[8.5,-80.8],TUN:[33.9,9.6],
    COL:[4.6,-74.1],DEN:[56.3,9.5],KSA:[23.9,45.1],TRI:[10.7,-61.5],
    SUI:[46.8,8.2],QAT:[25.4,51.2],HND:[15.2,-86.2],WAL:[52.1,-3.8],
    UKR:[48.4,31.2],NOR:[60.5,8.5],CAN:[56.1,-106.3],BIH:[44.0,17.7],
    PAR:[-23.4,-58.4],PRY:[-23.4,-58.4],
  };
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function main(){
  await loadData();
  prog(90,'渲染界面...');
  applyI18n();
  renderGlobeIntro();
  renderMatches();
  renderStandings();
  renderPredictions();
  initNav();
  initChat();
  prog(100,'完成!');
  initGlobe();
  setTimeout(()=>{
    const l=document.getElementById('loading');
    l.classList.add('hidden');
    setTimeout(()=>l.remove(),600);
  },300);
}
main();

