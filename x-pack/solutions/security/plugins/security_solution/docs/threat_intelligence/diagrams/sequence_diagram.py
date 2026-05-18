#!/usr/bin/env python3
"""Generate sequence-diagram PNGs for flows not in the reference docx."""

from __future__ import annotations

from pathlib import Path

from sequence_render import (
    flyout_insights_diagram,
    hunt_orchestrated_diagram,
    render_svg,
)

OUT = Path(__file__).parent


def main() -> None:
    import subprocess

    for name, diagram in [
        ("flow_3_8_flyout_insights", flyout_insights_diagram()),
        ("hunt_orchestrated_path_b", hunt_orchestrated_diagram()),
    ]:
        svg_path = OUT / f"{name}.svg"
        png_path = OUT / f"{name}.png"
        svg_path.write_text(render_svg(diagram), encoding="utf-8")
        subprocess.run(
            ["rsvg-convert", "-w", "1200", str(svg_path), "-o", str(png_path)],
            check=True,
        )
        print(f"Wrote {png_path}")


if __name__ == "__main__":
    main()
