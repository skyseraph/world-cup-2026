# World Cup 2026 — Feature Plan

## Goal
分两批实现 6 个新功能，全部基于现有数据，纯前端实现。

## Data Findings
- `recent.json`: 24 events, statuses: closed/live/not_started, fields: id/status/start_time/venue/competitors/scores/odds
- `timeline_*.json`: goal/yellow_card/substitution/halftime/kickoff etc, each goal has player.name + team
- No dedicated player stats endpoint — build scorer board from timelines
- Live match present (id 760418, Haiti vs Scotland)
- Next upcoming: 2026-06-14T04:00Z

## Batch 1 — Countdown + Follow Teams + Export .ics

### Phase 1: 下一场倒计时 [pending]
- Where: header 区域，显示"距下场 X:XX:XX"
- Logic: 找 status=not_started 最早的一场，setInterval 每秒更新
- i18n: zh/en 两套文案
- Files: index.html (CSS), main.js (renderCountdown + startCountdown)

### Phase 2: 关注球队 [pending]
- Where: 积分榜球队行 + 球队详情面板，加 ★ 收藏按钮
- Storage: localStorage key `wc2026_fav_teams` = JSON array of abbreviations
- UI: 地球仪面板顶部新增"我关注的队"卡片；赛程筛选增加"关注"filter tab
- Files: index.html (CSS), main.js (favTeams state + toggleFav + renderFavBar)

### Phase 3: 赛程导出 .ics [pending]
- Where: 赛程面板顶部加"导出日历"按钮；单场赛事卡片加📅图标
- Logic: 生成 iCalendar 格式文本，Blob download
- Each VEVENT: DTSTART/DTEND/SUMMARY/LOCATION/DESCRIPTION
- Files: main.js (buildICS + downloadICS)

## Batch 2 — Bracket + Scorer Board + Team Compare

### Phase 4: 淘汰赛对阵图 [pending]
- Where: 新 nav tab "🏆 淘汰赛"（暂时显示"小组赛进行中"占位，等数据有淘汰赛后自动渲染）
- Layout: CSS bracket tree，R32→R16→QF→SF→Final
- Data: from recent.json rounds (currently all group stage)
- Files: index.html (bracket CSS), main.js (renderBracket)

### Phase 5: 进球/数据榜单 [pending]
- Where: 新 nav tab "📊 榜单" 或在积分榜面板加子 tab
- Data: 聚合所有 timeline_*.json 的 goal 事件，统计 player.name + team.name 进球数
- Also: yellow_card 统计
- Files: main.js (buildScorerBoard from S.matchTimelines)

### Phase 6: 球队对比面板 [pending]
- Where: 球队详情面板底部加"对比"按钮，或积分榜选两行触发
- UI: 两列并排，对比 积分/进球/失球/净球/胜率/近5场
- Files: main.js (renderTeamCompare modal or section)

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Files to Modify
- `/Users/bob/dev/skills/skills/world_cup/index.html`
- `/Users/bob/dev/skills/skills/world_cup/assets/js/main.js`
