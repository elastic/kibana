#!/usr/bin/env python3
"""Generate the two synthetic screenshots the media scenarios use (needs Pillow)."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def make(path: Path, lines: list) -> None:
    image = Image.new("RGB", (900, 260), "white")
    draw = ImageDraw.Draw(image)
    for index, line in enumerate(lines):
        draw.text((20, 20 + index * 30), line, fill="black")
    image.save(path)


out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
make(
    out / "shot-sensitive.png",
    [
        "Kibana  https://acme-prod-7f3a.kb.us-east-1.aws.found.io/app/security/alerts",
        "Host: ACME-FIN-LAPTOP-0042  IP 10.42.7.19",
        "User: jane.doe@acmecorp.com",
        "Alerts table: 0 results (expected 12)",
    ],
)
make(
    out / "shot-clean.png",
    [
        "Kibana  http://localhost:5601/app/security/alerts",
        "Host: demo-host-1  user: elastic",
        "Alerts table: 0 results (expected 12)",
    ],
)
