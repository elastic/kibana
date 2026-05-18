#!/usr/bin/env python3
"""Render Excalidraw-style sequence diagrams as SVG (readable at doc scale)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class Participant:
    id: str
    label: str
    fill: str
    stroke: str


@dataclass
class Message:
    from_id: str
    to_id: str
    label: str
    y: float
    kind: Literal["call", "return", "self"] = "call"


@dataclass
class Note:
    x: float
    y: float
    w: float
    h: float
    label: str


@dataclass
class SequenceDiagram:
    title: str
    participants: list[Participant]
    messages: list[Message]
    notes: list[Note]
    width: float = 1100
    height: float = 520


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render_svg(d: SequenceDiagram) -> str:
    n = len(d.participants)
    margin_x = 48
    top_y = 88
    lifeline_top = top_y + 52
    lifeline_bottom = d.height - 48
    usable = d.width - 2 * margin_x
    col_w = usable / max(n, 1)
    centers = {p.id: margin_x + col_w * (i + 0.5) for i, p in enumerate(d.participants)}
    box_w, box_h = min(140, col_w - 16), 44

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{d.width}" height="{d.height}" viewBox="0 0 {d.width} {d.height}">',
        '<defs><marker id="arr" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
        '<polygon points="0 0, 10 4, 0 8" fill="#343a40"/></marker></defs>',
        f'<rect width="100%" height="100%" fill="#ffffff"/>',
        f'<text x="48" y="48" font-family="Segoe UI, system-ui, sans-serif" font-size="22" '
        f'font-weight="600" fill="#212529">{_esc(d.title)}</text>',
    ]

    for p in d.participants:
        cx = centers[p.id]
        x = cx - box_w / 2
        parts.append(
            f'<rect x="{x}" y="{top_y}" width="{box_w}" height="{box_h}" rx="8" '
            f'fill="{p.fill}" stroke="{p.stroke}" stroke-width="2"/>'
        )
        lines = p.label.split("\n")
        for i, line in enumerate(lines):
            ty = top_y + box_h / 2 - (len(lines) - 1) * 8 + i * 16
            parts.append(
                f'<text x="{cx}" y="{ty}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" '
                f'font-size="13" fill="#212529">{_esc(line)}</text>'
            )
        parts.append(
            f'<line x1="{cx}" y1="{lifeline_top}" x2="{cx}" y2="{lifeline_bottom}" '
            f'stroke="#adb5bd" stroke-width="1.5" stroke-dasharray="6 5"/>'
        )
        parts.append(
            f'<rect x="{x}" y="{lifeline_bottom}" width="{box_w}" height="{box_h}" rx="8" '
            f'fill="{p.fill}" stroke="{p.stroke}" stroke-width="2"/>'
        )

    for note in d.notes:
        parts.append(
            f'<rect x="{note.x}" y="{note.y}" width="{note.w}" height="{note.h}" rx="6" fill="#fff3bf" '
            f'stroke="#f08c00" stroke-width="1.5" opacity="0.9"/>'
        )
        parts.append(
            f'<text x="{note.x + 10}" y="{note.y + 20}" font-family="Segoe UI, system-ui, sans-serif" '
            f'font-size="12" fill="#495057">{_esc(note.label)}</text>'
        )

    for m in d.messages:
        x1, x2 = centers[m.from_id], centers[m.to_id]
        y = m.y
        if m.kind == "self":
            parts.append(
                f'<path d="M {x1} {y} h 28 v 22 h -56 v -22 h 28" fill="none" stroke="#343a40" '
                f'stroke-width="1.5" marker-end="url(#arr)"/>'
            )
            lx = x1 + 36
        else:
            dash = ' stroke-dasharray="6 4"' if m.kind == "return" else ""
            parts.append(
                f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#343a40" stroke-width="1.5"'
                f'{dash} marker-end="url(#arr)"/>'
            )
            lx = (x1 + x2) / 2
        parts.append(
            f'<text x="{lx}" y="{y - 6}" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" '
            f'font-size="12" fill="#495057">{_esc(m.label)}</text>'
        )

    parts.append("</svg>")
    return "\n".join(parts)


def flyout_insights_diagram() -> SequenceDiagram:
    return SequenceDiagram(
        title="Alert Flyout Insights (on demand — RFC 0002 P0)",
        width=1150,
        height=480,
        participants=[
            Participant("soc", "SOC analyst\n(document flyout)", "#ffdeeb", "#c2255c"),
            Participant("ui", "Flyout panel\n(browser)", "#dbe4ff", "#364fc7"),
            Participant("api", "flyout_insights\nroute", "#e5dbff", "#5f3dc4"),
            Participant("svc", "flyout_insights\nservice", "#e5dbff", "#5f3dc4"),
            Participant("rep", ".kibana-threat-reports*", "#d3f9d8", "#2f9e44"),
        ],
        messages=[
            Message("soc", "ui", "open alert · extract indicator_reference + technique_ids[]", 150),
            Message("ui", "api", "POST /internal/threat_intelligence/flyout_insights", 190),
            Message("api", "svc", "flyoutInsights(esClient, spaceId, body)", 230),
            Message("svc", "rep", "Layer 1: term on indicator reference (threat-report:<id>)", 280),
            Message("rep", "svc", "matching report doc(s)", 310, kind="return"),
            Message("svc", "rep", "Layer 2: nested behaviors.technique_id overlap", 350),
            Message("rep", "svc", "technique-overlap reports (capped)", 380, kind="return"),
            Message("svc", "api", "{ related_reports[], join_reason }", 420, kind="return"),
            Message("api", "ui", "JSON response", 450, kind="return"),
            Message("ui", "soc", "Related threat reports subsection", 480, kind="return"),
        ],
        notes=[
            Note(680, 265, 430, 36, "No per-alert_id array on report — reverse join only"),
        ],
    )


def hunt_orchestrated_diagram() -> SequenceDiagram:
    return SequenceDiagram(
        title="Environment Corroboration — hunt_orchestrated (Path B)",
        width=1200,
        height=560,
        participants=[
            Participant("ab", "Agent / workflow", "#dbe4ff", "#364fc7"),
            Participant("orch", "hunt_orchestrated", "#e5dbff", "#5f3dc4"),
            Participant("t1", "hunt_for_threat", "#fff3bf", "#f08c00"),
            Participant("env", "Customer indices", "#c3fae8", "#0c8599"),
            Participant("t2", "hunt_behavior", "#e5dbff", "#5f3dc4"),
            Participant("rep", ".kibana-threat-reports*", "#d3f9d8", "#2f9e44"),
        ],
        messages=[
            Message("ab", "orch", "hunt_orchestrated(report_id, tier2_when)", 140),
            Message("orch", "t1", "forward hunt IOCs + techniques", 180),
            Message("t1", "env", "multi-index search (alerts, endpoint, aws, …)", 220),
            Message("env", "t1", "hits + affected_assets", 250, kind="return"),
            Message("orch", "orch", "tier2_when == on_hits ?", 290, kind="self"),
            Message("orch", "t2", "hunt_behavior(text, tier1 context samples)", 330),
            Message("t2", "rep", "LLM + MITRE validate → behaviors[]", 370),
            Message("orch", "rep", "write_hunt_feedback → corroborated_rank_score", 410),
            Message("orch", "ab", "tier1 + tier2 results + deploy hints", 450, kind="return"),
        ],
        notes=[
            Note(48, 300, 200, 32, "Skip Tier 2 if no hits"),
            Note(48, 470, 320, 32, "tier2_when: always | on_hits | never"),
        ],
    )
