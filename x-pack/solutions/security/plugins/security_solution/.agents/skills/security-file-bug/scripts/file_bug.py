from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

WriteAction = Literal["create", "comment", "reopen_comment", "ask"]


@dataclass(frozen=True)
class IssueMatch:
    number: int
    state: Literal["open", "closed"]
    title: str


@dataclass(frozen=True)
class WritePath:
    action: WriteAction
    number: int | None
    candidates: tuple[IssueMatch, ...]


@dataclass(frozen=True)
class LabelDecision:
    keep: tuple[str, ...]
    dropped: tuple[tuple[str, str], ...]
    ask_team: bool


def decide_write_path(matches: list[IssueMatch]) -> WritePath:
    if len(matches) == 0:
        return WritePath("create", None, ())
    if len(matches) == 1:
        match = matches[0]
        action: WriteAction = (
            "reopen_comment" if match.state == "closed" else "comment"
        )
        return WritePath(action, match.number, (match,))
    return WritePath("ask", None, tuple(matches))


def validate_labels(requested: list[str], catalog: set[str]) -> LabelDecision:
    keep: list[str] = []
    dropped: list[tuple[str, str]] = []
    ask_team = False
    for name in requested:
        if name in catalog:
            keep.append(name)
            continue
        dropped.append((name, "not in catalog"))
        if name.startswith("Team:"):
            ask_team = True
    return LabelDecision(tuple(keep), tuple(dropped), ask_team)


@dataclass(frozen=True)
class TeamInference:
    status: Literal["confident", "ask"]
    label: str | None
    candidates: tuple[str, ...]


_TEAM_LABEL_RE = re.compile(r"`Team:[^`]+`")
_GENERIC_PATH_SEGMENTS = frozenset({"public", "server", "lib", "common", "api"})


def _team_label_slug(label: str) -> str:
    name = label.removeprefix("Team:")
    return name.lower().replace(" ", "-")


def _extract_team_labels(knowledge_md: str) -> tuple[str, ...]:
    seen: set[str] = set()
    labels: list[str] = []
    for token in _TEAM_LABEL_RE.findall(knowledge_md):
        label = token.strip("`")
        if label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return tuple(labels)


def _section_after_heading(knowledge_md: str, heading: str) -> str:
    marker = f"## {heading}"
    start = knowledge_md.find(marker)
    if start == -1:
        return ""
    rest = knowledge_md[start + len(marker) :]
    next_heading = re.search(r"^## ", rest, flags=re.MULTILINE)
    if next_heading is None:
        return rest
    return rest[: next_heading.start()]


def _table_data_rows(section: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if not cells or all(set(cell) <= set("-: ") for cell in cells):
            continue
        rows.append(cells)
    return rows[1:] if rows else []


def _path_folders(cell: str) -> list[str]:
    folders: list[str] = []
    for path in re.findall(r"`([^`]+)`", cell):
        for segment in path.split("/"):
            if segment and segment not in _GENERIC_PATH_SEGMENTS:
                folders.append(segment)
    return folders


def _teams_for_code_area(code_area: str, knowledge_md: str) -> list[str]:
    folders = _path_folders(code_area)
    if not folders:
        return []
    label_section = _section_after_heading(knowledge_md, "Team Label to Code Path Mapping")
    matches: list[str] = []
    seen: set[str] = set()
    for row in _table_data_rows(label_section):
        if len(row) < 3:
            continue
        label = row[0].strip("`")
        if not label.startswith("Team:"):
            continue
        public_path = row[2]
        if not any(folder in public_path for folder in folders):
            continue
        if label in seen:
            continue
        seen.add(label)
        matches.append(label)
    return matches


def _teams_for_route(route: str, knowledge_md: str) -> list[str]:
    routes_section = _section_after_heading(knowledge_md, "Common Page Routes")
    matched: list[str] = []
    seen: set[str] = set()
    for row in _table_data_rows(routes_section):
        if len(row) < 3:
            continue
        if row[0] != route:
            continue
        for label in _teams_for_code_area(row[2], knowledge_md):
            if label in seen:
                continue
            seen.add(label)
            matched.append(label)
    return matched


def infer_team_label(
    *,
    area: str | None,
    area_slug: str | None,
    route: str | None,
    knowledge_md: str,
) -> TeamInference:
    labels = _extract_team_labels(knowledge_md)

    if area is not None:
        area_lower = area.lower()
        for label in labels:
            name = label.removeprefix("Team:")
            if area_lower == name.lower() or area_lower == label.lower():
                return TeamInference("confident", label, ())

    if area_slug is not None:
        for label in labels:
            if _team_label_slug(label) == area_slug:
                return TeamInference("confident", label, ())

    if route is not None:
        route_teams = _teams_for_route(route, knowledge_md)
        if len(route_teams) == 1:
            return TeamInference("confident", route_teams[0], ())
        if len(route_teams) > 1:
            return TeamInference("ask", None, tuple(route_teams))

    return TeamInference("ask", None, ())
