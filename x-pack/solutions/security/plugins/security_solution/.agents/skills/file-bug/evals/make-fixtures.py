#!/usr/bin/env python3
"""Build the eval fixtures and render the scenarios into <out>/scenarios (needs Pillow).

Usage: python3 make-fixtures.py <out-dir>
Creates synthetic screenshots, a session dir for the Path B scenario, the s6 draft body,
and copies each scenario with $FIXTURES / $SESSION_DIR replaced by real paths.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent


def make(path: Path, lines: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (900, 260), "white")
    draw = ImageDraw.Draw(image)
    for index, line in enumerate(lines):
        draw.text((20, 20 + index * 30), line, fill="black")
    image.save(path)


out = Path(sys.argv[1]).resolve()
fixtures = out / "fixtures"
session = out / "session"
make(
    fixtures / "shot-sensitive.png",
    [
        "Kibana  https://initech-prod-7f3a.kb.example.invalid/app/security/alerts",
        "Host: INITECH-FIN-LAPTOP-0042  IP 192.0.2.19",
        "User: jane.doe@initech-finance.example",
        "Alerts table: 0 results (expected 12)",
    ],
)
make(
    fixtures / "shot-clean.png",
    [
        "Kibana  http://localhost:5601/app/security/alerts",
        "Host: demo-host-1  user: elastic",
        "Alerts table: 0 results (expected 12)",
    ],
)
make(
    session / "screenshots" / "ea-flow1.png",
    [
        "Kibana http://localhost:5601/app/security/entity_analytics",
        "Risk scores table: 0 entities  (toast: TypeError)",
    ],
)
for name in ("findings-flow-1.md", "config.json"):
    shutil.copy(HERE / "fixtures" / name, session / name)
signal = out / "session-signal"
make(
    signal / "screenshots" / "cases-flow1.png",
    [
        "Kibana http://localhost:5601/app/security/cases/abc123",
        "Logged in as viewer (space A) - case from space B is visible",
    ],
)
shutil.copy(HERE / "fixtures" / "findings-flow-1-signal.md", signal / "findings-flow-1.md")
shutil.copy(HERE / "fixtures" / "config.json", signal / "config.json")
for source in (HERE / "fixtures").iterdir():
    if source.name in ("findings-flow-1.md", "findings-flow-1-signal.md", "config.json"):
        continue
    text = source.read_text(encoding="utf-8")
    (fixtures / source.name).write_text(text.replace("$FIXTURES", str(fixtures)), encoding="utf-8")

rendered = out / "scenarios"
rendered.mkdir(parents=True, exist_ok=True)
for scenario in sorted((HERE / "scenarios").glob("*.txt")):
    text = scenario.read_text(encoding="utf-8")
    text = (
        text.replace("$FIXTURES", str(fixtures))
        .replace("$SESSION_DIR_SIGNAL", str(signal))
        .replace("$SESSION_DIR", str(session))
    )
    (rendered / scenario.name).write_text(text, encoding="utf-8")
shutil.copy(HERE / "stub-gh.py", out / "stub-gh.py")
brief = (HERE / "agent-brief.md").read_text(encoding="utf-8")
(out / "agent-brief.md").write_text(brief.replace("$STUB_GH", str(out / "stub-gh.py")), encoding="utf-8")
print(f"fixtures, stub, brief and {len(list(rendered.glob('*.txt')))} scenarios written to {out}")
