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


def _shares_substring(left: str, right: str) -> bool:
    return left in right or right in left


def _partial_candidates(
    labels: tuple[str, ...],
    *,
    area: str | None,
    area_slug: str | None,
    route: str | None,
) -> tuple[str, ...]:
    needles = [value.lower() for value in (area, area_slug, route) if value]
    if not needles:
        return ()
    matches: list[str] = []
    for label in labels:
        haystacks = (label.lower(), _team_label_slug(label))
        if any(
            _shares_substring(needle, haystack)
            for needle in needles
            for haystack in haystacks
        ):
            matches.append(label)
    return tuple(matches)


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

    route_teams: list[str] = []
    if route is not None:
        route_teams = _teams_for_route(route, knowledge_md)
        if len(route_teams) == 1:
            return TeamInference("confident", route_teams[0], ())

    seen: set[str] = set()
    candidates: list[str] = []
    for label in (*route_teams, *_partial_candidates(
        labels, area=area, area_slug=area_slug, route=route
    )):
        if label in seen:
            continue
        seen.add(label)
        candidates.append(label)
    return TeamInference("ask", None, tuple(candidates))


_UNKNOWN = "_unknown_"
_DEV_INSTALL = "from source (dev)"
_LOCAL_KINDS = frozenset({"local", "scout"})
_SCREENSHOT_PREFIX = "Screenshot:"
_CONSOLE_PREFIX = "Console:"
_NETWORK_PREFIX = "Network:"


def _as_mapping(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _first_text(*values: object) -> str:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return _UNKNOWN


def _environment(config: dict) -> dict:
    return _as_mapping(config.get("environment"))


def _install_method(environment: dict) -> str:
    explicit = _first_text(environment.get("install_method"))
    if explicit != _UNKNOWN:
        return explicit
    if environment.get("kind") in _LOCAL_KINDS:
        return _DEV_INSTALL
    return _UNKNOWN


def _describe_the_bug(finding: dict) -> str:
    parts: list[str] = []
    current = finding.get("current_behavior")
    if current is not None and str(current).strip():
        parts.append(str(current).strip())
    why = finding.get("why_issue")
    if why is not None and str(why).strip():
        parts.append(str(why).strip())
    return "\n\n".join(parts) if parts else _UNKNOWN


def _numbered_steps(finding: dict) -> str:
    steps = finding.get("steps_followed")
    if not isinstance(steps, list) or not steps:
        return _UNKNOWN
    return "\n".join(f"{index}. {step}" for index, step in enumerate(steps, start=1))


def _evidence_lines(finding: dict) -> list[str]:
    evidence = finding.get("evidence")
    if not isinstance(evidence, list):
        return []
    return [str(line) for line in evidence]


def _values_with_prefix(lines: list[str], prefix: str) -> list[str]:
    return [line[len(prefix) :].strip() for line in lines if line.startswith(prefix)]


def _remaining_evidence(lines: list[str]) -> list[str]:
    classified = (_SCREENSHOT_PREFIX, _CONSOLE_PREFIX, _NETWORK_PREFIX)
    return [line for line in lines if not line.startswith(classified)]


def _joined_or_unknown(values: list[str]) -> str:
    return "\n".join(values) if values else _UNKNOWN


def render_bug_body(finding: dict, config: dict) -> str:
    environment = _environment(config)
    evidence = _evidence_lines(finding)
    additional = [
        f"Role: {_first_text(finding.get('role'))}",
        f"Flow: {_first_text(finding.get('flow'))}",
        f"Level: {_first_text(finding.get('level'))}",
        *_remaining_evidence(evidence),
    ]
    sections = (
        ("**Kibana version:**", _first_text(
            config.get("kibana_version"), environment.get("kibana_version")
        )),
        ("**Elasticsearch version:**", _first_text(
            config.get("elasticsearch_version"),
            environment.get("elasticsearch_version"),
        )),
        ("**Server OS version:**", _first_text(
            environment.get("server_os_version"),
            environment.get("server_os"),
            environment.get("os_version"),
            environment.get("os"),
        )),
        ("**Browser version:**", _first_text(
            environment.get("browser_version"),
            environment.get("browser"),
        )),
        ("**Browser OS version:**", _first_text(
            environment.get("browser_os_version"),
            environment.get("browser_os"),
        )),
        (
            "**Original install method (e.g. download page, yum, from source, etc.):**",
            _install_method(environment),
        ),
        ("**Describe the bug:**", _describe_the_bug(finding)),
        ("**Steps to reproduce:**", _numbered_steps(finding)),
        ("**Expected behavior:**", _first_text(finding.get("expected_behavior"))),
        (
            "**Screenshots (if relevant):**",
            _joined_or_unknown(_values_with_prefix(evidence, _SCREENSHOT_PREFIX)),
        ),
        (
            "**Errors in browser console (if relevant):**",
            _joined_or_unknown(_values_with_prefix(evidence, _CONSOLE_PREFIX)),
        ),
        (
            "**Provide logs and/or server output (if relevant):**",
            _joined_or_unknown(_values_with_prefix(evidence, _NETWORK_PREFIX)),
        ),
        ("**Any additional context:**", "\n".join(additional)),
    )
    return "\n\n".join(f"{heading}\n{body}" for heading, body in sections) + "\n"
