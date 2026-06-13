#!/usr/bin/env python3
"""Fetch World Cup 2026 data and write to data/ directory."""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

SEASON_ID = "world-cup-2026"


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"WARN: {' '.join(cmd)} failed: {result.stderr[:200]}", file=sys.stderr)
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"WARN: JSON parse error for {' '.join(cmd)}", file=sys.stderr)
        return None


def save(name, data):
    path = DATA_DIR / f"{name}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"  saved {path.name}")


def main():
    print(f"Fetching World Cup 2026 data @ {datetime.now(timezone.utc).isoformat()}")

    # Recent matches: last 4 days + today + next 3 days (covers upcoming + history)
    now = datetime.now(timezone.utc).date()
    all_events = []
    for delta in range(-4, 4):
        date_str = (now + timedelta(days=delta)).isoformat()
        day = run(["sports-skills", "football", "get_daily_schedule", f"--date={date_str}"])
        if day:
            events = day.get("data", {}).get("events", [])
            wc = [e for e in events if e.get("competition", {}).get("id") == "world-cup"]
            all_events.extend(wc)
            if wc:
                print(f"  {date_str}: {len(wc)} WC matches")
    # Deduplicate by event id
    seen = set()
    unique = []
    for e in all_events:
        if e["id"] not in seen:
            seen.add(e["id"])
            unique.append(e)
    save("recent", {"updated_at": datetime.now(timezone.utc).isoformat(), "events": unique})

    # Standings
    standings = run(["sports-skills", "football", "get_season_standings", f"--season_id={SEASON_ID}"])
    if standings:
        standings["updated_at"] = datetime.now(timezone.utc).isoformat()
        save("standings", standings)

    # Teams
    teams = run(["sports-skills", "football", "get_season_teams", f"--season_id={SEASON_ID}"])
    if teams:
        teams["updated_at"] = datetime.now(timezone.utc).isoformat()
        save("teams", teams)

    print("Done.")


if __name__ == "__main__":
    main()
