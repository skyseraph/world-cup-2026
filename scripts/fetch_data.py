#!/usr/bin/env python3
"""Fetch World Cup 2026 data and write to data/ directory."""
import json
import subprocess
import sys
from datetime import datetime, timezone
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

    # Today's matches
    today = run(["sports-skills", "football", "get_daily_schedule"])
    if today:
        events = today.get("data", {}).get("events", [])
        wc_today = [e for e in events if e.get("competition", {}).get("id") == "world-cup"]
        save("today", {"updated_at": datetime.now(timezone.utc).isoformat(), "events": wc_today})

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
