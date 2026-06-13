---
name: world-cup
description: |
  2026 FIFA 世界杯 skill — 赛程、比分、积分榜、球员信息、比赛预测、3D可视化页面。
  Use when: 用户询问2026世界杯相关信息（赛程/比分/积分榜/球员/预测）。
  Opens a live 3D globe dashboard at https://skyseraph.github.io/world-cup-2026
---

# ⚽ FIFA World Cup 2026

**3D 可视化页面**: https://skyseraph.github.io/world-cup-2026

---

## 使用方式

### 打开可视化页面
用户说"打开世界杯页面"/"显示3D界面"时，引导用户访问：
```
https://skyseraph.github.io/world-cup-2026
```

---

## 数据查询

所有数据查询使用 `sports-skills` CLI（`world-cup-2026` season）。

**环境检查**（首次使用）：
```bash
which sports-skills || python3.12 -m pip install sports-skills --break-system-packages
export PATH="$PATH:/Users/bob/.local/share/uv/python/cpython-3.12.13-macos-aarch64-none/bin"
```

### 今日赛程
```bash
sports-skills football get_daily_schedule
# 过滤世界杯比赛: competition.id == "world-cup"
```

### 积分榜
```bash
sports-skills football get_season_standings --season_id=world-cup-2026
```

### 比赛详情（比分+统计）
```bash
# 先找 event_id
sports-skills football get_daily_schedule
# 再查详情
sports-skills football get_event_summary --event_id=<id>
sports-skills football get_event_timeline --event_id=<id>
sports-skills football get_event_statistics --event_id=<id>
sports-skills football get_event_lineups --event_id=<id>
```

### 球队/球员搜索
```bash
sports-skills football search_team --query="Brazil"
sports-skills football search_player --query="Mbappe"
sports-skills football get_player_profile --tm_player_id=<id>
```

---

## 实时比分补充

`sports-skills` 不提供实时进行中的比分，使用 WebSearch 补充：
```
搜索: "World Cup 2026 live score [today's date]"
搜索: "[Team A] vs [Team B] live 2026"
```

---

## 比赛预测

结合以下数据做预测分析：
1. `get_season_standings` 查近期积分和形势
2. `get_event_summary` 查近几场比赛结果
3. `get_event_statistics` 查控球率/射门等数据
4. 赔率数据（`odds.moneyline` 已包含在 get_daily_schedule 中）
5. 用 Claude 推理综合判断，**明确标注"AI预测，仅供参考"**

---

## 数据更新

GitHub Actions 每 30 分钟自动抓取数据并提交到 `data/` 目录。
手动刷新：
```bash
python3.12 scripts/fetch_data.py
```
