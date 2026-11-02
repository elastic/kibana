from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal
from urllib.parse import quote

WriteAction = Literal["create", "comment", "reopen_comment", "ask"]
UNKNOWN_ANSWER = "Unknown"
FILED_VIA = "Filed via file-bug"
FILED_MARKER = "<!-- filed-via: file-bug v1 -->"
KIBANA_REPO = "elastic/kibana"
SECURITY_TEAM_REPO = "elastic/security-team"
ALLOWED_REPOS = frozenset({KIBANA_REPO, SECURITY_TEAM_REPO})
READ_ONLY_GH = (("search", "issues"), ("search", "prs"), ("label", "list"))


def require_allowed_repo(repo: str) -> None:
    """Refuse an empty or unknown repo; FILE_BUG_EXTRA_REPOS (comma list) allows a scratch repo."""
    extra = {name.strip().lower() for name in os.environ.get("FILE_BUG_EXTRA_REPOS", "").split(",")}
    allowed = {name.lower() for name in ALLOWED_REPOS} | (extra - {""})
    if not repo or repo.strip().lower() not in allowed:
        raise ValueError(
            f"--repo must be one of {sorted(ALLOWED_REPOS)} (got {repo!r}); "
            "state the repo literally in every command"
        )
MAX_TITLE_LEN = 140
SOURCE_EXPLORATORY_TESTER = "exploratory-tester"
TESTER_SOURCE_LABEL = "sec-eng-prod:exploratory-tester"
CREATE_LABELS = ("bug", "triage_needed")
ISSUE_TYPE = "Bug"
_MEDIA_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm", ".mov")


class TitleTooLong(ValueError):
    """Symptom does not fit in MAX_TITLE_LEN after the [team] [Bug] prefix."""


_VAGUE_SYMPTOMS = frozenset(
    {
        "broken",
        "error",
        "an error",
        "doesn't work",
        "does not work",
        "doesnt work",
        "not working",
        "fails",
        "failed",
        "it doesn't work",
        "it does not work",
    }
)
_VAGUE_CURRENT_RE = re.compile(
    r"^(broken|it (doesn'?t|does not) work|doesn'?t work|does not work|not working|"
    r"an error( appears)?|error( occurs| appears)?|something went wrong|fails|failed)\.?$",
    re.I,
)
_VAGUE_EXPECTED_RE = re.compile(
    r"^(works|should work|work correctly|as expected|correct(ly)?|it works)\.?$",
    re.I,
)
_QUOTED_OR_TYPED_ERROR_RE = re.compile(
    r'"[^"]+"|`[^`]+`|\bTypeError\b|\bError:|\bReferenceError\b|\btoast\b',
    re.I,
)
_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
_SDH_RE = re.compile(r"\bSDH[A-Z0-9-]{3,}\b", re.I)
_CASE_RE = re.compile(r"\b(?:case|ticket)\s*#?\s*\d{4,}\b", re.I)
_SENSITIVE_WORD_RE = re.compile(
    r"\bnda\b|\bcustomer\s+(?:name|id|org|organization)\b|\bour customer\b",
    re.I,
)
# High precision: a hit here gates the public repo. Word-list terms live in the hint below.
_SECURITY_RE = re.compile(
    r"\bCVE-\d{4}-\d{4,}\b"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|\b(?:Bearer|ApiKey)\s+(?=[A-Za-z0-9+/=_.-]*\d)[A-Za-z0-9+/=_.-]{20,}"
    r"|\bAKIA[0-9A-Z]{16}\b"
    r"|\bAuthorization:\s*Basic\s+[A-Za-z0-9+/]{12,}={0,2}"
    r"|\bcurl\b[^\n]*\s(?:-u|--user)\s+[^\s:]+:(?!\*|<|\$|(?i:(?:undefined|null|none|redacted|changeme|example|password|secret)\b))[^\s]{4,}"
    r"|\b[a-z][a-z0-9+.-]*://[^\s/:@*<]+:(?!\*|<|\$|(?i:(?:undefined|null|none|redacted|changeme|example|password|secret)\b))[^\s/@]{4,}@"
    r"|\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*"
    r"(?!\$|(?:undefined|null|none|redacted|changeme|example)\b)"
    r"(?=[^\s'\"]*\d)[^\s'\"*]{8,}",
    re.I,
)
# Soft: common Security Solution UI wording too. Never gates; it prompts a re-read for a signal.
_SECURITY_HINT_RE = re.compile(
    r"\b(?:auth(?:entication|orization)?\s+bypass|privilege\s+escalation|"
    r"remote\s+code\s+execution|sql\s+injection|cross[\s-]site\s+scripting|"
    r"xss|rce|csrf|ssrf|exploit(?:able)?|vulnerab(?:le|ility|ilities))\b",
    re.I,
)
_MEDIA_EXT = r"(?:png|jpe?g|gif|webp|mp4|webm|mov)"
_MEDIA_REF_RE = re.compile(
    r"!\[[^\]]*\]\([^)]+\)|<video\b|^\s*(?:screenshot|recording|video)s?\s*:"
    rf"|(?:\$SESSION_DIR/|~/|\.{{1,2}}/|/)[^\s()<>\"'`]*\.{_MEDIA_EXT}\b",
    re.I | re.M,
)
# A bare path in prose; repro snippets (inline or fenced code) are input, not attachments.
_LOCAL_MEDIA_BARE_RE = re.compile(
    r"(?<![\w/:.-])(?:\$SESSION_DIR/|~/|\.{1,2}/|/[^\s()<>\"'`/]+/|[A-Za-z]:\\)[^\s()<>\"'`]*"
    rf"\.{_MEDIA_EXT}\b",
    re.I | re.M,
)
# An explicit attachment reference whose target is not an http(s) URL (relative paths too).
# A labelled line is checked even when the filename is in backticks; image and video tags are
# checked outside code only, so a repro snippet containing one is not an attachment.
_LOCAL_MEDIA_LABEL_RE = re.compile(
    rf"^\s*(?:screenshot|recording|video)s?\s*:\s*(?!https?://|!\[|<video)[^\s]*\.{_MEDIA_EXT}\b",
    re.I | re.M,
)
_LOCAL_MEDIA_EMBED_RE = re.compile(
    rf"!\[[^\]]*\]\((?!https?://)[^)]*\.{_MEDIA_EXT}\)"
    rf"|<video[^>]*\bsrc=\"(?!https?://)[^\"]*\.{_MEDIA_EXT}\"",
    re.I | re.M,
)
_FENCE_RE = re.compile(r"```.*?```", re.S)
# A code span delimited by two or more backticks may contain single backticks (CommonMark).
_MULTI_TICK_SPAN_RE = re.compile(r"(`{2,})(?!`).+?(?<!`)\1(?!`)", re.S)
# Backticks inside an image destination are literal URL characters, not a code span.
_LOCAL_MEDIA_TICKED_EMBED_RE = re.compile(
    rf"!\[[^\]]*\]\(\s*`+(?!https?://)[^)`]*\.{_MEDIA_EXT}`*\s*\)", re.I
)


def _local_media(body: str) -> str | None:
    outside_code = _without_code(body)
    match = (
        _LOCAL_MEDIA_LABEL_RE.search(_FENCE_RE.sub("", body).replace("`", ""))
        or _LOCAL_MEDIA_EMBED_RE.search(outside_code)
        or _LOCAL_MEDIA_TICKED_EMBED_RE.search(_MULTI_TICK_SPAN_RE.sub("", _FENCE_RE.sub("", body)))
        or _LOCAL_MEDIA_BARE_RE.search(outside_code)
    )
    return match.group(0) if match else None


_CODE_RE = re.compile(r"```.*?```|`[^`\n]*`", re.S)


def _without_code(text: str) -> str:
    """Drop fenced and inline code: repro snippets there are input, not attachments."""
    return _CODE_RE.sub("", text)


_TITLE_FORMAT_RE = re.compile(r"^\[.+?\] \[Bug\] .+")
_STACK_RELEASE_RE = re.compile(r"^v?(\d+)\.(\d+)(?:\.(\d+))?$")
_WIP_RE = re.compile(
    r"\b(?:draft\s+pr|wip\s+pr|work[\s-]in[\s-]progress|known\s+limitation|"
    r"intentional(?:\s+limitation)?|by\s+design|not\s+yet\s+implemented|"
    r"still\s+a\s+draft|known\s+work\s+in\s+progress)\b",
    re.I,
)
_DRAFT_PR_RE = re.compile(
    r"(?:PR\s*#?\d+|#\d+)[^\n.]{0,80}\bdraft\b|"
    r"\bdraft\b[^\n.]{0,80}(?:PR\s*#?\d+|#\d+)",
    re.I,
)


@dataclass(frozen=True)
class IssueMatch:
    number: int
    state: Literal["open", "closed"]
    title: str
    body: str = ""


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


def format_issue_title(team_label: str, symptom: str) -> str:
    name = re.sub(r"^Team:\s*", "", team_label.strip())
    symptom_text = " ".join(symptom.split()).strip().rstrip(".")
    if not name or not symptom_text:
        raise ValueError("team label and symptom are required")
    if symptom_text.lower() in _VAGUE_SYMPTOMS:
        raise ValueError("symptom is too vague")
    prefix = f"[{name}] [Bug] "
    budget = MAX_TITLE_LEN - len(prefix)
    if budget < 1:
        raise ValueError("team name leaves no room for a symptom")
    if len(symptom_text) > budget:
        raise TitleTooLong(
            f"title would be {len(prefix) + len(symptom_text)} characters; "
            f"shorten the symptom so the title is ≤{MAX_TITLE_LEN}"
        )
    return f"{prefix}{symptom_text}"


def parse_search_results(payload: object) -> list[IssueMatch]:
    if isinstance(payload, dict):
        entries = payload.get("items") or payload.get("matches") or []
    elif isinstance(payload, list):
        entries = payload
    else:
        return []
    matches: list[IssueMatch] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        try:
            number = int(entry["number"])
        except (KeyError, TypeError, ValueError):
            continue
        state = entry.get("state", "open")
        if state not in ("open", "closed"):
            state = "open"
        matches.append(
            IssueMatch(
                number,
                state,
                str(entry.get("title", "")),
                str(entry.get("body", "") or ""),
            )
        )
    return matches


def _fileable_findings(records: list) -> list:
    return [
        record
        for record in records
        if isinstance(record, dict)
        and record.get("kind") == "finding"
        and record.get("block_type") != "Observation"
    ]


def finding_from_jsonl(
    records: list,
    *,
    index: int | None = None,
    title: str | None = None,
) -> dict:
    numbered = _fileable_findings(records)
    if title is not None:
        wanted = title.strip().lower()
        for finding in numbered:
            if str(finding.get("title", "")).strip().lower() == wanted:
                return _with_tester_source(finding)
        raise ValueError(f"no finding titled {title!r}")
    if index is None:
        if len(numbered) == 1:
            return _with_tester_source(numbered[0])
        raise ValueError("pass --index or --title when jsonl has multiple findings")
    if index < 1 or index > len(numbered):
        raise ValueError(f"finding index {index} out of range (1-based)")
    return _with_tester_source(numbered[index - 1])


def _with_tester_source(finding: dict) -> dict:
    stamped = dict(finding)
    stamped["source"] = SOURCE_EXPLORATORY_TESTER
    return stamped


def is_tester_finding(finding: dict, config: dict | None = None) -> bool:
    if finding.get("source") == SOURCE_EXPLORATORY_TESTER:
        return True
    setup = _as_mapping((config or {}).get("setup"))
    return str(setup.get("skill") or "").strip() == SOURCE_EXPLORATORY_TESTER


def _unique_labels(*groups: list) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for name in group:
            text = str(name).strip()
            if text and text not in seen:
                seen.add(text)
                merged.append(text)
    return merged


def with_source_labels(
    labels: list, finding: dict, config: dict | None = None
) -> list[str]:
    extras = [TESTER_SOURCE_LABEL] if is_tester_finding(finding, config) else []
    return _unique_labels(extras, labels)


def with_create_labels(labels: list) -> list[str]:
    return _unique_labels(list(CREATE_LABELS), labels)


def search_queries(token: str | None, words: str, screen: str | None = None) -> list[str]:
    """Query set for the duplicate search.

    GitHub's default search returns nothing when an identifier is ANDed with other
    words and no in:title / in:body qualifier is present, so every identifier-plus-words
    query is qualified, and the bare identifier is also run on its own. Plain words are run
    unqualified too (they match across title and body) as well as split by field.
    """
    token = (token or "").strip()
    words = " ".join((words or "").split())
    screen = " ".join((screen or "").split())
    if token.startswith("-") or " " in token:
        raise ValueError("--token must be a single identifier that does not start with '-'")
    if not token and not words and not screen:
        raise ValueError("search needs --token or --words")
    queries: list[str] = []
    if token:
        queries.append(token)
        if words:
            queries += [f"{token} {words} in:title", f"{token} {words} in:body"]
    for plain in dict.fromkeys(text for text in (words, screen) if text):
        queries += [plain, f"{plain} in:title", f"{plain} in:body"]
    return list(dict.fromkeys(queries))


def run_search(
    *,
    repo: str,
    token: str | None,
    words: str,
    screen: str | None = None,
    run_gh: GhRunner | None = None,
) -> tuple[list[IssueMatch], list[dict]]:
    """Run every query on issues (open and closed) and open PRs; a gh failure is an error, never `[]`."""
    run_gh = run_gh or _default_run_gh
    queries = search_queries(token, words, screen)
    found: dict[int, IssueMatch] = {}
    ran: list[dict] = []
    for kind in ("issues", "prs"):
        fields = "number,state,title,body" + (",isDraft" if kind == "prs" else "")
        for query in queries:
            argv = ["gh", "search", kind, "--repo", repo, "--limit", "20", "--json", fields]
            if kind == "prs":
                argv += ["--state", "open"]
            argv.append(query)
            result = run_gh(argv)
            if result.get("returncode"):
                detail = str(result.get("stderr") or "").strip() or "no stderr"
                raise RuntimeError(f"gh search {kind} failed for {query!r}: {detail}")
            try:
                payload = json.loads(str(result.get("stdout") or "[]"))
            except json.JSONDecodeError as error:
                raise RuntimeError(f"gh search {kind} returned invalid JSON for {query!r}: {error}") from error
            matches = parse_search_results(payload)
            ran.append({"kind": kind, "query": query, "matches": len(matches)})
            for match in matches:
                found.setdefault(match.number, match)
    return list(found.values()), ran


def decide_write_path(matches: list[IssueMatch]) -> WritePath:
    if len(matches) == 0:
        return WritePath("create", None, ())
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


def catalog_from_search_results(payloads: list) -> set[str]:
    names: set[str] = set()
    for payload in payloads:
        entries = payload if isinstance(payload, list) else []
        for entry in entries:
            name = entry.get("name") if isinstance(entry, dict) else entry
            if name:
                names.add(str(name))
    return names


@dataclass(frozen=True)
class TeamInference:
    status: Literal["confident", "ask"]
    label: str | None
    candidates: tuple[str, ...]


_TEAM_LABEL_RE = re.compile(r"`Team:[^`]+`")
_GENERIC_PATH_SEGMENTS = frozenset({"public", "server", "lib", "common", "api"})


def _team_label_slug(label: str) -> str:
    name = label.removeprefix("Team:").strip()
    return name.lower().replace(" ", "-")


def _compact_team(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().removeprefix("team:").strip())


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
        if route not in (row[0], row[1], row[1].strip("`")):
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
        area_key = _compact_team(area)
        for label in labels:
            name = label.removeprefix("Team:").strip()
            if area_key == _compact_team(name) or area_key == _compact_team(label):
                return TeamInference("confident", label, ())

    if area_slug is not None:
        slug_key = _compact_team(area_slug)
        for label in labels:
            if slug_key == _compact_team(_team_label_slug(label)):
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


_DEV_INSTALL = "from source (dev)"
_LOCAL_KINDS = frozenset({"local", "scout"})
_SCREENSHOT_PREFIX = "Screenshot:"
_RECORDING_PREFIX = "Recording:"
_VIDEO_PREFIX = "Video:"
_CONSOLE_PREFIX = "Console:"
_NETWORK_PREFIX = "Network:"
_MEDIA_PREFIXES = (_SCREENSHOT_PREFIX, _RECORDING_PREFIX, _VIDEO_PREFIX)
_ENV_TYPE_DEPLOYMENT = {
    "serverless": "Serverless",
    "stateful-ess": "ECH",
    "ess": "ECH",
    "stateful-classic": "ECH",
    "stateful": "ECH",
}
_HEADING_DESCRIBE = "**Describe the bug:**"
_HEADING_VERSION = "**Version:**"
_HEADING_FEATURE_FLAGS = "**Feature flags:**"
_HEADING_DEPLOYMENT = "**Deployment:**"
_HEADING_ROLE = "**Role required to reproduce:**"
_HEADING_SPACES = "**Spaces:**"
_HEADING_SERVER_OS = "**Server OS version:**"
_DEPLOYMENT_LABELS = {
    "ech": "ECH",
    "ess": "ECH",
    "hosted": "ECH",
    "serverless": "Serverless",
    "both": "ECH and serverless",
}
_HEADING_BROWSER = "**Browser and Browser OS versions:**"
_HEADING_ENDPOINT = "**Elastic Endpoint version:**"
_HEADING_INSTALL = (
    "**Original install method (e.g. download page, yum, from source, etc.):**"
)
_HEADING_PRECONDITIONS = "**Preconditions:**"
_HEADING_STEPS = "**Steps to reproduce:**"
_HEADING_CURRENT = "**Current behaviour (with screenshots and recordings):**"
_HEADING_EXPECTED = "**Expected behavior:**"
_HEADING_CONSOLE = "**Errors in browser console (if relevant):**"
_HEADING_LOGS = "**Logs and/or server output (if relevant):**"
_HEADING_ADDITIONAL = "**Any additional information:**"


def _as_mapping(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def _first_text(*values: object) -> str:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _optional_text(*values: object) -> str | None:
    return _first_text(*values) or None


def _environment(config: dict) -> dict:
    return _as_mapping(config.get("environment"))


def _install_method(environment: dict) -> str | None:
    explicit = _optional_text(environment.get("install_method"))
    if explicit:
        return explicit
    env_type = str(environment.get("type") or "").lower()
    url = _first_text(environment.get("url"), environment.get("kibana_url"))
    if env_type == "stateful-ess" or (url and "cloud" in url.lower()):
        return "Elastic Cloud"
    if environment.get("kind") in _LOCAL_KINDS or env_type == "stateful-classic":
        return _DEV_INSTALL
    return None


def _describe_the_bug(finding: dict) -> str:
    parts: list[str] = []
    title = _optional_text(finding.get("title"))
    why = _optional_text(finding.get("why_issue"))
    if title:
        parts.append(title)
    if why:
        parts.append(why)
    return "\n\n".join(parts)


def _numbered_steps(finding: dict) -> str:
    steps = finding.get("steps_followed")
    if not isinstance(steps, list) or not steps:
        return ""
    return "\n".join(f"{index}. {step}" for index, step in enumerate(steps, start=1))


def _evidence_lines(finding: dict) -> list[str]:
    evidence = finding.get("evidence")
    if not isinstance(evidence, list):
        return []
    return [str(line) for line in evidence]


def _session_dir(config: dict, environment: dict) -> str | None:
    return _optional_text(config.get("session_dir"), environment.get("session_dir"))


def _normalize_evidence_value(raw: str, session_dir: str | None) -> str:
    text = raw.strip()
    if len(text) >= 2 and text[0] == "`" and text[-1] == "`":
        text = text[1:-1]
    if session_dir:
        text = text.replace("$SESSION_DIR", session_dir.rstrip("/"))
    return text


def _looks_like_media_path(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    if text.startswith(("http://", "https://")):
        return True
    if "/" in text or "\\" in text:
        return True
    return text.lower().endswith(_MEDIA_SUFFIXES)


def _values_with_prefix(
    lines: list[str], prefix: str, session_dir: str | None = None
) -> list[str]:
    return [
        _normalize_evidence_value(line[len(prefix) :], session_dir)
        for line in lines
        if line.startswith(prefix)
    ]


def _remaining_evidence(lines: list[str]) -> list[str]:
    classified = (*_MEDIA_PREFIXES, _CONSOLE_PREFIX, _NETWORK_PREFIX)
    return [line for line in lines if not line.startswith(classified)]


def _stack_version(config: dict, environment: dict) -> str:
    return _first_text(
        config.get("kibana_version"),
        environment.get("kibana_version"),
        config.get("elasticsearch_version"),
        environment.get("elasticsearch_version"),
    )


def _version_text(finding: dict, config: dict) -> str:
    environment = _environment(config)
    return _first_text(
        finding.get("version"),
        finding.get("kibana_version"),
        _stack_version(config, environment),
    )


def _with_flag_setup(flags: str | None, finding: dict, config: dict, environment: dict) -> str | None:
    if flags is None:
        return None
    setup = _optional_text(
        finding.get("feature_flag_setup"),
        config.get("feature_flag_setup"),
        environment.get("feature_flag_setup"),
    )
    if setup:
        return f"{flags}\nSetup: {setup}"
    return flags


def _feature_flags(finding: dict, config: dict, environment: dict) -> str | None:
    raw = finding.get("feature_flags")
    if raw is None:
        raw = config.get("feature_flags")
    if raw is None:
        raw = environment.get("feature_flags")
    flags: str | None
    if raw is None:
        flags = _optional_text(
            finding.get("feature_flag"),
            config.get("feature_flag"),
            environment.get("feature_flag"),
        )
    elif isinstance(raw, dict):
        lines: list[str] = []
        for key, value in raw.items():
            name = str(key).strip()
            if not name:
                continue
            if value is True or str(value).strip().lower() in {"on", "enabled"}:
                state = "on"
            elif value is False or str(value).strip().lower() in {"off", "disabled"}:
                state = "off"
            else:
                state = str(value).strip()
            lines.append(f"{name}: {state}" if state else name)
        flags = "\n".join(lines) or None
    elif isinstance(raw, list):
        names = [str(item).strip() for item in raw if str(item).strip()]
        flags = "\n".join(names) or None
    else:
        flags = str(raw).strip() or None
    return _with_flag_setup(flags, finding, config, environment)


@dataclass(frozen=True)
class DeploymentInference:
    status: Literal["confident", "ask"]
    label: str | None
    hint: str | None = None


def infer_deployment(finding: dict, config: dict) -> DeploymentInference:
    environment = _environment(config)
    explicit = _optional_text(
        finding.get("deployment"),
        config.get("deployment"),
        environment.get("deployment"),
        environment.get("project_type"),
    )
    if explicit:
        if explicit.lower() == UNKNOWN_ANSWER.lower():
            return DeploymentInference("confident", UNKNOWN_ANSWER)
        return DeploymentInference(
            "confident", _DEPLOYMENT_LABELS.get(explicit.lower(), explicit)
        )
    env_type = _optional_text(environment.get("type"), config.get("type"))
    if env_type:
        key = env_type.lower()
        if key in _ENV_TYPE_DEPLOYMENT:
            return DeploymentInference("confident", _ENV_TYPE_DEPLOYMENT[key])
        if "serverless" in key:
            return DeploymentInference("confident", "Serverless")
        if "stateful" in key:
            return DeploymentInference("confident", "ECH")
    arch = _optional_text(
        environment.get("arch"),
        config.get("arch"),
        environment.get("domain"),
        config.get("domain"),
    )
    if arch:
        key = arch.lower()
        if "serverless" in key:
            return DeploymentInference("confident", "Serverless")
        if "stateful" in key or key in {"ess", "ech"}:
            return DeploymentInference("confident", "ECH")
    url = _optional_text(
        environment.get("url"),
        config.get("url"),
        environment.get("kibana_url"),
        config.get("kibana_url"),
    )
    if url and "cloud" in url.lower():
        return DeploymentInference(
            "ask",
            None,
            "URL contains 'cloud' (may be serverless) — confirm with the human",
        )
    return DeploymentInference("ask", None)


@dataclass(frozen=True)
class ReleaseInference:
    status: Literal["confident", "ask"]
    label: str | None
    hint: str | None = None


def infer_release_label(finding: dict, config: dict) -> ReleaseInference:
    """Map a stack version to a `vX.Y.Z` label, or ask when it is not a release."""
    raw = _version_text(finding, config)
    if not raw or raw.lower() == UNKNOWN_ANSWER.lower():
        return ReleaseInference(
            "ask", None, "Version is missing or Unknown — confirm the stack release"
        )
    token = raw.strip().split()[0]
    matched = _STACK_RELEASE_RE.fullmatch(token)
    if not matched:
        return ReleaseInference(
            "ask",
            None,
            f"{token!r} is not a stack release (need X.Y or X.Y.Z)",
        )
    major, minor, patch = matched.group(1), matched.group(2), matched.group(3) or "0"
    return ReleaseInference("confident", f"v{major}.{minor}.{patch}")


def _deployment(finding: dict, config: dict, environment: dict) -> str | None:
    result = infer_deployment(finding, config)
    if result.status == "confident":
        return result.label
    return None


def _preconditions(finding: dict, config: dict) -> str | None:
    raw = finding.get("preconditions")
    if raw is None:
        raw = config.get("preconditions")
    if isinstance(raw, list):
        lines = [str(item).strip() for item in raw if str(item).strip()]
        return "\n".join(f"- {line}" for line in lines) or None
    return _optional_text(raw)


def _spaces(finding: dict, config: dict, environment: dict) -> str | None:
    raw = finding.get("spaces")
    if raw is None:
        raw = finding.get("space")
    if raw is None:
        raw = config.get("spaces")
    if raw is None:
        raw = environment.get("spaces")
    if raw is None:
        raw = environment.get("space")
    if isinstance(raw, list):
        names = [str(item).strip() for item in raw if str(item).strip()]
        return ", ".join(names) or None
    explicit = _optional_text(raw)
    if explicit:
        return explicit
    space_id = _optional_text(
        finding.get("space_id"),
        environment.get("space_id"),
        config.get("space_id"),
    )
    if not space_id:
        return None
    if space_id == "default":
        return "default"
    return f"custom ({space_id})"


def _additional_information(finding: dict, evidence: list[str]) -> str | None:
    lines: list[str] = []
    flow = _optional_text(finding.get("flow_name"), finding.get("flow"))
    if flow is not None:
        lines.append(f"Flow: {flow}")
    level = _optional_text(finding.get("level"))
    if level is not None:
        lines.append(f"Level: {level}")
    lines.extend(_remaining_evidence(evidence))
    return "\n".join(lines) if lines else None


def _browser_and_os(environment: dict) -> str | None:
    browser = _optional_text(
        environment.get("browser_version"), environment.get("browser")
    )
    browser_os = _optional_text(
        environment.get("browser_os_version"), environment.get("browser_os")
    )
    if browser and browser_os:
        return f"{browser} / {browser_os}"
    return browser or browser_os


def _role(finding: dict, config: dict) -> str | None:
    setup = _as_mapping(config.get("setup"))
    return _optional_text(
        finding.get("role"),
        config.get("role"),
        setup.get("resolved_role"),
        setup.get("role"),
    )


def _current_behaviour(
    finding: dict, evidence: list[str], session_dir: str | None = None
) -> str:
    parts: list[str] = []
    current = finding.get("current_behavior")
    if current is not None and str(current).strip():
        parts.append(str(current).strip())
    media = [
        value
        for prefix in _MEDIA_PREFIXES
        for value in _values_with_prefix(evidence, prefix, session_dir)
        if _looks_like_media_path(value)
    ]
    if media:
        parts.append("\n".join(media))
    return "\n\n".join(parts)


def pack_gaps(finding: dict, config: dict) -> list[str]:
    environment = _environment(config)
    evidence = _evidence_lines(finding)
    session_dir = _session_dir(config, environment)
    gaps: list[str] = []
    version = _version_text(finding, config)
    if not version:
        gaps.append("version")
    elif (
        not _is_unknown_value(version)
        and infer_release_label(finding, config).status == "ask"
    ):
        gaps.append("release")
    if not _numbered_steps(finding):
        gaps.append("steps")
    if not _current_behaviour(finding, evidence, session_dir):
        gaps.append("current")
    if not _first_text(finding.get("expected_behavior")):
        gaps.append("expected")
    if not _feature_flags(finding, config, environment):
        gaps.append("feature_flags")
    if infer_deployment(finding, config).status == "ask":
        gaps.append("deployment")
    if not _role(finding, config):
        gaps.append("role")
    if not _spaces(finding, config, environment):
        gaps.append("spaces")
    current_text = _first_text(finding.get("current_behavior"))
    if current_text and _is_vague_current(current_text):
        gaps.append("current_vague")
    expected_text = _first_text(finding.get("expected_behavior"))
    if expected_text and _is_vague_expected(expected_text):
        gaps.append("expected_vague")
    if _needs_quoted_error(finding, evidence):
        gaps.append("error_unquoted")
    return gaps


def is_thin_pack(finding: dict, config: dict) -> bool:
    return bool(pack_gaps(finding, config))


def _is_unknown_value(text: str) -> bool:
    return text.strip().lower() == UNKNOWN_ANSWER.lower()


def _is_vague_current(text: str) -> bool:
    stripped = text.strip()
    if not stripped or _is_unknown_value(stripped):
        return False
    return bool(_VAGUE_CURRENT_RE.match(stripped))


def _is_vague_expected(text: str) -> bool:
    stripped = text.strip()
    if not stripped or _is_unknown_value(stripped):
        return False
    return bool(_VAGUE_EXPECTED_RE.match(stripped))


def _needs_quoted_error(finding: dict, evidence: list[str]) -> bool:
    current = _first_text(finding.get("current_behavior"))
    console = "\n".join(_values_with_prefix(evidence, _CONSOLE_PREFIX))
    hay = f"{current}\n{console}"
    if not hay.strip() or _is_unknown_value(current):
        return False
    if _QUOTED_OR_TYPED_ERROR_RE.search(hay):
        return False
    return bool(re.search(r"\berror\b|\bfail", hay, re.I))


_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
_EMPTY_STEP_RE = re.compile(r"^\d+\.\s*$")
_NUMBERED_STEP_CONTENT_RE = re.compile(r"^\d+\.\s+(\S.*)$")
_BODY_PACK_FIELDS = (
    ("version", _HEADING_VERSION),
    ("current_behavior", _HEADING_CURRENT),
    ("expected_behavior", _HEADING_EXPECTED),
    ("feature_flags", _HEADING_FEATURE_FLAGS),
    ("deployment", _HEADING_DEPLOYMENT),
    ("role", _HEADING_ROLE),
    ("spaces", _HEADING_SPACES),
)
_REQUIRED_BODY_SECTIONS = (
    ("body_describe", _HEADING_DESCRIBE),
    ("body_version", _HEADING_VERSION),
    ("body_steps", _HEADING_STEPS),
    ("body_current", _HEADING_CURRENT),
    ("body_expected", _HEADING_EXPECTED),
)


def _visible_text(text: str) -> str:
    return _HTML_COMMENT_RE.sub("", text)


_HEADING_LINE_RE = re.compile(r"^\*\*[^\n]+:\*\*[ \t]*$", re.M)
_STAMP_LINE_RE = re.compile(rf"^{re.escape(FILED_VIA)}[ \t]*$", re.M)


def _section_content(body: str, heading: str) -> str:
    visible = _visible_text(body)
    heading_re = re.compile(r"(?m)^" + re.escape(heading) + r"[ \t]*$")
    match = heading_re.search(visible)
    if not match:
        return ""
    after = visible[match.end() :]
    nxt = _HEADING_LINE_RE.search(after) or _STAMP_LINE_RE.search(after)
    chunk = after[: nxt.start()] if nxt else after
    return chunk.strip()


def _body_section_filled(heading: str, content: str) -> bool:
    if not content:
        return False
    if heading == _HEADING_STEPS:
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        if lines and all(_EMPTY_STEP_RE.match(line) for line in lines):
            return False
    return True


def _body_section_gaps(body: str) -> list[str]:
    return [
        gap
        for gap, heading in _REQUIRED_BODY_SECTIONS
        if not _body_section_filled(heading, _section_content(body, heading))
    ]


def _steps_from_body(text: str) -> list[str]:
    steps: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        match = _NUMBERED_STEP_CONTENT_RE.match(stripped)
        if match:
            steps.append(match.group(1).strip())
        elif stripped and not _EMPTY_STEP_RE.match(stripped):
            steps.append(stripped)
    return steps


def _finding_with_body_answers(finding: dict, body: str) -> dict:
    """Prefer filled template headings over stale or empty finding JSON."""
    merged = dict(finding)
    for key, heading in _BODY_PACK_FIELDS:
        content = _section_content(body, heading)
        if _body_section_filled(heading, content):
            merged[key] = content
    steps = _section_content(body, _HEADING_STEPS)
    if _body_section_filled(_HEADING_STEPS, steps):
        parsed = _steps_from_body(steps)
        if parsed:
            merged["steps_followed"] = parsed
    console = _section_content(body, _HEADING_CONSOLE)
    if _body_section_filled(_HEADING_CONSOLE, console):
        evidence = list(merged["evidence"]) if isinstance(merged.get("evidence"), list) else []
        evidence.append(f"{_CONSOLE_PREFIX} {console}")
        merged["evidence"] = evidence
    return merged


_MARKER_RE = re.compile(r"[ \t]*<!-- filed-via: file-bug v1\b[^>]*-->[ \t]*\n?")
_META_VALUE_RE = re.compile(r"[A-Za-z0-9._:/+-]{1,60}")


def filed_marker(meta: dict[str, str] | None = None) -> str:
    """The hidden marker, optionally with `key=value` fields (agent, model, run)."""
    fields = []
    for key, value in (meta or {}).items():
        value = str(value or "").strip()
        if value and _META_VALUE_RE.fullmatch(value):
            fields.append(f"{key}={value}")
    return "<!-- filed-via: file-bug v1" + "".join(f" {f}" for f in fields) + " -->"


def with_filed_stamp(body: str, meta: dict[str, str] | None = None) -> str:
    """Append the visible stamp and the hidden marker, each only once.

    The marker lets tooling find skill-filed tickets; agents never add it by hand.
    An existing marker is replaced, so `write` can enrich the plain one `render-body` added.
    """
    text = _MARKER_RE.sub("", body).rstrip()
    if FILED_VIA not in _visible_text(text):
        text = f"{text}\n\n{FILED_VIA}"
    return f"{text}\n{filed_marker(meta)}\n"


def scan_wip(*texts: object) -> list[str]:
    """Flag draft/WIP PRs and known/intentional limitations in a draft."""
    blob = "\n".join(str(text) for text in texts if text)
    if _WIP_RE.search(blob) or _DRAFT_PR_RE.search(blob):
        return ["wip_or_limitation"]
    return []


def scan_sensitive(*texts: object) -> list[str]:
    blob = "\n".join(str(text) for text in texts if text)
    hits: list[str] = []
    if _EMAIL_RE.search(blob):
        hits.append("email")
    if _SDH_RE.search(blob):
        hits.append("support_case")
    if _CASE_RE.search(blob):
        hits.append("case_id")
    if _SENSITIVE_WORD_RE.search(blob):
        hits.append("customer_or_nda")
    if _SECURITY_RE.search(blob):
        hits.append("security_issue")
    return hits


def scan_security_hints(*texts: object) -> list[str]:
    """Soft signal only: security wording that is also common Security Solution UI text."""
    blob = "\n".join(str(text) for text in texts if text)
    return ["security_hint"] if _SECURITY_HINT_RE.search(blob) else []


def has_media(*texts: object) -> bool:
    """True when a draft embeds or references a screenshot or recording."""
    return bool(_MEDIA_REF_RE.search("\n".join(str(text) for text in texts if text)))


def check_draft(
    *,
    body: str,
    title: str | None,
    finding: dict,
    config: dict,
    labels: list | None = None,
    wip_ok: bool = False,
    sensitive_ok: bool = False,
    repo: str = KIBANA_REPO,
    security_ok: bool = False,
    media_ok: bool = False,
    action: str | None = None,
) -> list[str]:
    merged = _finding_with_body_answers(finding, body)
    mode = action or ("create" if title is not None else "comment")
    # A comment/reopen without a finding adds to an existing issue that already holds the
    # template answers, so only the sensitive/security/WIP/media gates apply to it.
    gaps = [] if mode == "comment" and not finding else list(pack_gaps(merged, config))
    if mode == "create" and title is None:
        gaps.append("title")
    if title is not None:
        if len(title) > MAX_TITLE_LEN or not _TITLE_FORMAT_RE.match(title):
            gaps.append("title")
        names = [str(label) for label in (labels or [])]
        if "bug" not in names:
            gaps.append("bug_label")
        if "triage_needed" not in names:
            gaps.append("triage_label")
        if FILED_VIA not in _visible_text(body):
            gaps.append("stamp")
        gaps.extend(_body_section_gaps(body))
    if is_tester_finding(finding, config) and title is not None:
        if TESTER_SOURCE_LABEL not in [str(label) for label in (labels or [])]:
            gaps.append("tester_label")
    hits = scan_sensitive(body, json.dumps(merged), title or "")
    if not sensitive_ok:
        gaps.extend(f"sensitive:{hit}" for hit in hits if hit != "security_issue")
    if "security_issue" in hits and not security_ok and repo.lower() != SECURITY_TEAM_REPO:
        gaps.append("security_issue:file_in_security_team")
    if not media_ok and has_media(body):
        gaps.append("media_review")
    if not wip_ok and not merged.get("file_despite_wip"):
        gaps.extend(scan_wip(body, json.dumps(merged)))
    return gaps


def render_bug_body(finding: dict, config: dict) -> str:
    environment = _environment(config)
    evidence = _evidence_lines(finding)
    session_dir = _session_dir(config, environment)
    optional = (
        (
            _HEADING_FEATURE_FLAGS,
            _feature_flags(finding, config, environment),
        ),
        (_HEADING_DEPLOYMENT, _deployment(finding, config, environment)),
        (_HEADING_ROLE, _role(finding, config)),
        (_HEADING_SPACES, _spaces(finding, config, environment)),
        (
            _HEADING_SERVER_OS,
            _optional_text(
                environment.get("server_os_version"),
                environment.get("server_os"),
                environment.get("os_version"),
                environment.get("os"),
            ),
        ),
        (_HEADING_BROWSER, _browser_and_os(environment)),
        (
            _HEADING_ENDPOINT,
            _optional_text(
                environment.get("endpoint_version"),
                environment.get("elastic_endpoint_version"),
                config.get("endpoint_version"),
            ),
        ),
        (_HEADING_PRECONDITIONS, _preconditions(finding, config)),
        (_HEADING_ADDITIONAL, _additional_information(finding, evidence)),
    )
    optional_present = {
        heading: value for heading, value in optional if value is not None
    }
    sections: list[tuple[str, str]] = [
        (_HEADING_DESCRIBE, _describe_the_bug(finding)),
        (_HEADING_VERSION, _version_text(finding, config)),
        *[(heading, optional_present[heading]) for heading in (
            _HEADING_FEATURE_FLAGS,
            _HEADING_DEPLOYMENT,
            _HEADING_ROLE,
            _HEADING_SPACES,
            _HEADING_SERVER_OS,
            _HEADING_BROWSER,
            _HEADING_ENDPOINT,
        ) if heading in optional_present],
        (_HEADING_INSTALL, _install_method(environment)),
        *([( _HEADING_PRECONDITIONS, optional_present[_HEADING_PRECONDITIONS] )]
          if _HEADING_PRECONDITIONS in optional_present else []),
        (_HEADING_STEPS, _numbered_steps(finding)),
        (_HEADING_CURRENT, _current_behaviour(finding, evidence, session_dir)),
        (_HEADING_EXPECTED, _first_text(finding.get("expected_behavior"))),
    ]
    console = "\n".join(_values_with_prefix(evidence, _CONSOLE_PREFIX, session_dir))
    if console:
        sections.append((_HEADING_CONSOLE, console))
    logs = "\n".join(_values_with_prefix(evidence, _NETWORK_PREFIX, session_dir))
    if logs:
        sections.append((_HEADING_LOGS, logs))
    additional = optional_present.get(_HEADING_ADDITIONAL)
    if additional is not None:
        sections.append((_HEADING_ADDITIONAL, additional))
    filled = [(heading, body) for heading, body in sections if body]
    return with_filed_stamp(
        "\n\n".join(f"{heading}\n{body}" for heading, body in filled) + "\n"
    )


_ASSET_URL = (
    "https://uploads.github.com/user-attachments/assets"
    "?name={name}&content_type={content_type}&repository_id={repository_id}"
)
_VIDEO_SUFFIXES = frozenset({".mp4", ".mov", ".webm"})
_IMAGE_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp"})
_MIME_BY_SUFFIX = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}
_MAX_ASSET_BYTES = 10 * 1024 * 1024
_TARGET_ASSET_BYTES = 8 * 1024 * 1024
_AUDIO_BITRATE = 96_000

HttpPost = Callable[[str, dict, Path], dict]
CommandRunner = Callable[[list], object]
CompressVideo = Callable[[Path, Path], None]


@dataclass(frozen=True)
class UploadResult:
    uploaded: tuple[tuple[str, str], ...]
    leftovers: tuple[tuple[str, str], ...]


class UploadError(Exception):
    """Raised by an `http_post` implementation that never reached GitHub."""

    def __init__(self, message: str, status: int = 0) -> None:
        super().__init__(message)
        self.status = status


def _run_checked(argv: list) -> object:
    return subprocess.run(argv, check=True, capture_output=True, text=True)


def _probe_duration_seconds(src: Path, runner: CommandRunner) -> float | None:
    completed = runner(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(src),
        ]
    )
    stdout = getattr(completed, "stdout", "") or ""
    try:
        duration = float(stdout.strip())
    except ValueError:
        return None
    return duration if duration > 0 else None


def _ffmpeg_codecs(dest: Path) -> tuple[str, str]:
    if dest.suffix.lower() == ".webm":
        return "libvpx-vp9", "libopus"
    return "libx264", "aac"


def compress_video(src: Path, dest: Path, run: CommandRunner | None = None) -> None:
    """Re-encode `src` into `dest` under the GitHub asset size limit."""
    runner = _run_checked if run is None else run
    duration = _probe_duration_seconds(src, runner)
    video_bps = 400_000
    if duration:
        video_bps = max(
            80_000, int((_TARGET_ASSET_BYTES * 8) / duration) - _AUDIO_BITRATE
        )
    vcodec, acodec = _ffmpeg_codecs(dest)
    runner(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vcodec",
            vcodec,
            "-acodec",
            acodec,
            "-b:v",
            str(video_bps),
            "-maxrate",
            str(video_bps),
            "-bufsize",
            str(video_bps * 2),
            "-b:a",
            "96k",
            str(dest),
        ]
    )


def _mime_for(path: Path) -> str:
    return _MIME_BY_SUFFIX.get(path.suffix.lower(), "application/octet-stream")


def _asset_url_from_payload(payload: dict) -> str | None:
    for key in ("url", "href", "browser_download_url"):
        value = payload.get(key)
        if value:
            return str(value)
    return None


def _curl_config(headers: dict) -> str:
    return "".join(f'header = "{key}: {value}"\n' for key, value in headers.items())


def _default_http_post(
    url: str,
    headers: dict,
    file_path: Path,
    run: CommandRunner | None = None,
) -> dict:
    """Binary-POST `file_path` to GitHub user-attachments with `curl`.

    Headers go through `curl -K -` so the bearer token is not on argv.
    `uploads.github.com/user-attachments/assets` is not a documented GitHub
    API and can change without notice.
    """
    runner = subprocess.run if run is None else run
    argv = [
        "curl",
        "-s",
        "-X",
        "POST",
        "-w",
        "\n%{http_code}",
        "-K",
        "-",
        "--data-binary",
        f"@{file_path}",
        url,
    ]
    completed = runner(
        argv, input=_curl_config(headers), capture_output=True, text=True, check=False
    )
    if completed.returncode != 0:
        raise UploadError(completed.stderr.strip() or "curl failed", 0)
    body, _, code = completed.stdout.rpartition("\n")
    status = int(code.strip()) if code.strip().isdigit() else 0
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    asset_url = _asset_url_from_payload(_as_mapping(payload))
    return {
        "ok": 200 <= status < 300 and bool(asset_url),
        "status": status,
        "url": asset_url,
    }


def _post(
    http_post: HttpPost, url: str, headers: dict, file_path: Path
) -> tuple[bool, int, str | None]:
    try:
        response = _as_mapping(http_post(url, headers, file_path))
    except UploadError as error:
        return False, error.status, None
    return (
        bool(response.get("ok")),
        int(response.get("status") or 0),
        response.get("url"),
    )


def _rejected_reason(status: int, *, after_compress: bool = False) -> str:
    stage = "after compress retry" if after_compress else "on upload"
    return f"GitHub rejected the file {stage} (status {status})"


def _asset_upload_url(path: Path, repository_id: int) -> str:
    return _ASSET_URL.format(
        name=quote(path.name, safe=""),
        content_type=quote(_mime_for(path), safe=""),
        repository_id=repository_id,
    )


def _asset_upload_headers(token: str, path: Path) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": _mime_for(path),
    }


def _retry_compressed(
    path: Path,
    token: str,
    repository_id: int,
    http_post: HttpPost,
    compress_video_fn: CompressVideo,
) -> tuple[bool, str, str]:
    workdir = Path(tempfile.mkdtemp(prefix="file_bug_compress_"))
    try:
        dest = workdir / f"{path.stem}.mp4"
        try:
            compress_video_fn(path, dest)
        except (OSError, subprocess.SubprocessError) as error:
            return False, "", f"compress failed before the retry ({error})"
        if dest.exists() and dest.stat().st_size > _MAX_ASSET_BYTES:
            return False, "", "compressed video still exceeds 10MB"
        ok, status, asset_url = _post(
            http_post,
            _asset_upload_url(dest, repository_id),
            _asset_upload_headers(token, dest),
            dest,
        )
        if ok:
            return True, asset_url or "", ""
        return False, "", _rejected_reason(status, after_compress=True)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _repository_id(repo: str, run_gh: GhRunner) -> int:
    returncode, stdout, stderr = _gh_result(run_gh(["gh", "api", f"repos/{repo}", "--jq", ".id"]))
    if returncode != 0:
        raise RuntimeError(_gh_failed(["gh", "api", f"repos/{repo}"], stderr))
    return int(stdout.strip())


def _is_image_upload(path: str) -> bool:
    return Path(path).suffix.lower() in _IMAGE_SUFFIXES


def _is_video_upload(path: str) -> bool:
    return Path(path).suffix.lower() in _VIDEO_SUFFIXES


def _video_embed(url: str) -> str:
    return f'<video src="{url}" controls></video>'


def _isolate_as_paragraph(body: str, token: str) -> str:
    """Put `token` alone in its paragraph so GitHub shows a player, not a link."""
    isolated = re.sub(
        rf"[ \t]*{re.escape(token)}[ \t]*",
        f"\n\n{token}\n\n",
        body,
    )
    return re.sub(r"\n{3,}", "\n\n", isolated)


def _embed_video(body: str, path: str, url: str) -> str:
    embed = _video_embed(url)
    result = re.sub(
        rf"!\[[^\]]*\]\(`?{re.escape(path)}`?\)",
        embed,
        body,
    )
    result = result.replace(f"`{path}`", embed)
    result = result.replace(path, embed)
    return _isolate_as_paragraph(result, embed)


def _markdown_for_upload(path: str, url: str) -> str:
    if _is_image_upload(path):
        return f"![{Path(path).name}]({url})"
    if _is_video_upload(path):
        return _video_embed(url)
    return url


def embed_uploads(body: str, uploaded: list) -> str:
    """Replace local evidence paths so GitHub inlines images and videos.

    Images become ``![name](url)``. Videos become a ``<video>`` player on its
    own paragraph (a URL in a sentence renders as a link). A path already
    inside ``](path)`` only has the URL swapped so existing alt text is kept.
    """
    result = body
    ordered = sorted(uploaded, key=lambda pair: len(str(pair[0])), reverse=True)
    for path, url in ordered:
        path_text = str(path)
        url_text = str(url)
        if not path_text or not url_text:
            continue
        if _is_video_upload(path_text):
            result = _embed_video(result, path_text, url_text)
            continue
        result = result.replace(f"](`{path_text}`)", f"]({url_text})")
        result = result.replace(f"]({path_text})", f"]({url_text})")
        replacement = _markdown_for_upload(path_text, url_text)
        result = result.replace(f"`{path_text}`", replacement)
        result = result.replace(path_text, replacement)
    return result


def upload_evidence(
    *,
    repo: str,
    files: list,
    token: str,
    repository_id: int | None = None,
    http_post: HttpPost = _default_http_post,
    compress_video_fn: CompressVideo = compress_video,
    run_gh: GhRunner | None = None,
) -> UploadResult:
    """Upload evidence to user-attachments, compressing a rejected video once."""
    require_allowed_repo(repo)
    repo_id = repository_id
    if repo_id is None:
        repo_id = _repository_id(repo, run_gh or _default_run_gh)
    uploaded: list[tuple[str, str]] = []
    leftovers: list[tuple[str, str]] = []
    for file_path in files:
        path = Path(file_path)
        url = _asset_upload_url(path, repo_id)
        headers = _asset_upload_headers(token, path)
        ok, status, asset_url = _post(http_post, url, headers, path)
        if ok:
            uploaded.append((str(path), asset_url or ""))
            continue
        if path.suffix.lower() not in _VIDEO_SUFFIXES:
            leftovers.append((str(path), _rejected_reason(status)))
            continue
        ok, asset_url, reason = _retry_compressed(
            path, token, repo_id, http_post, compress_video_fn
        )
        if ok:
            uploaded.append((str(path), asset_url))
            continue
        leftovers.append((str(path), reason))
    return UploadResult(tuple(uploaded), tuple(leftovers))


GhRunner = Callable[[list], dict]

_URL_RE = re.compile(r"https?://\S+")


class CreateFailed(Exception):
    """Raised when `gh issue create` fails; the create is never retried."""


class PartialWrite(Exception):
    """Raised when part of a write succeeded (reopen, comment, or labels)."""

    def __init__(
        self, message: str, *, number: int, url: str | None = None
    ) -> None:
        super().__init__(message)
        self.number = number
        self.url = url


def _default_run_gh(argv: list) -> dict:
    override = os.environ.get("FILE_BUG_GH")
    if override and argv and argv[0] == "gh":
        if tuple(argv[1:3]) not in READ_ONLY_GH:
            return {
                "returncode": 1,
                "stdout": "",
                "stderr": "blocked: FILE_BUG_GH is set (eval mode), so only read commands run",
            }
        argv = [*shlex.split(override), *argv[1:]]
    completed = subprocess.run(
        argv,
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "GH_PAGER": "cat"},
    )
    return {
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def _gh_result(value: object) -> tuple[int, str, str]:
    payload = _as_mapping(value)
    return (
        int(payload.get("returncode") or 0),
        str(payload.get("stdout") or ""),
        str(payload.get("stderr") or ""),
    )


def _first_url(stdout: str) -> str:
    match = _URL_RE.search(stdout)
    return match.group(0) if match else stdout.strip()


def _gh_failed(argv: list, stderr: str) -> str:
    return f"`{' '.join(argv[:4])}` failed: {stderr.strip() or 'no stderr'}"


def _gh_create(
    *, repo: str, title: str, body_file: Path, labels: list, run_gh: GhRunner
) -> str:
    argv = [
        "gh",
        "issue",
        "create",
        "--repo",
        repo,
        "--title",
        title,
        "--body-file",
        str(body_file),
        "--type",
        ISSUE_TYPE,
    ]
    for label in labels:
        argv += ["--label", str(label)]
    returncode, stdout, stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        raise CreateFailed(_gh_failed(argv, stderr))
    return _first_url(stdout)


def _gh_reopen(*, repo: str, number: int, run_gh: GhRunner) -> None:
    argv = ["gh", "issue", "reopen", str(number), "--repo", repo]
    returncode, _, stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        raise RuntimeError(_gh_failed(argv, stderr))


def _gh_add_labels(
    *, repo: str, number: int, labels: list, run_gh: GhRunner
) -> None:
    argv = ["gh", "issue", "edit", str(number), "--repo", repo]
    for label in labels:
        argv += ["--add-label", str(label)]
    returncode, _, stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        raise RuntimeError(_gh_failed(argv, stderr))


def _gh_comment(
    *, repo: str, number: int, body_file: Path, run_gh: GhRunner
) -> str:
    argv = [
        "gh",
        "issue",
        "comment",
        str(number),
        "--repo",
        repo,
        "--body-file",
        str(body_file),
    ]
    returncode, stdout, stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        raise RuntimeError(_gh_failed(argv, stderr))
    return _first_url(stdout)


def _label_in_repo(repo: str, name: str, run_gh: GhRunner) -> bool:
    argv = [
        "gh",
        "label",
        "list",
        "--repo",
        repo,
        "--search",
        name,
        "--limit",
        "20",
        "--json",
        "name",
    ]
    returncode, stdout, _stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        return False
    try:
        payload = json.loads(stdout or "[]")
    except json.JSONDecodeError:
        return False
    return name in catalog_from_search_results([payload])


def write_github(
    *,
    action: WriteAction,
    repo: str,
    title: str | None,
    body: str,
    labels: list,
    number: int | None,
    finding: dict | None = None,
    config: dict | None = None,
    security_ok: bool = False,
    marker_meta: dict[str, str] | None = None,
    run_gh: GhRunner = _default_run_gh,
) -> dict:
    """Run the `gh` write for `action`, never retrying a create that already failed."""
    require_allowed_repo(repo)
    if action == "ask":
        raise ValueError("action 'ask' must be resolved by the caller before writing")
    if action == "create":
        if not title:
            raise ValueError("action 'create' needs a title")
    elif number is None:
        raise ValueError(f"action {action!r} needs an issue number")
    if (
        repo.lower() == KIBANA_REPO
        and not security_ok
        and "security_issue" in scan_sensitive(body, title or "")
    ):
        where = (
            f"file it in {SECURITY_TEAM_REPO}"
            if action == "create"
            else "do not post it on a public issue"
        )
        raise ValueError(
            f"text looks security-sensitive (key, token or CVE): {where}, "
            "or pass --security-ok if the human confirmed it is a false positive"
        )

    local_media = _local_media(body)
    if local_media:
        raise ValueError(
            f"body still references a local file ({local_media}): run `upload`, "
            "then `embed-uploads`, and write the embedded body"
        )

    labels = with_source_labels(labels, finding or {}, config)
    if action == "create":
        labels = with_create_labels(labels)
    workdir = Path(tempfile.mkdtemp(prefix="file_bug_body_"))
    try:
        body_file = workdir / "body.md"
        body_file.write_text(with_filed_stamp(body, marker_meta), encoding="utf-8")
        if action == "create":
            url = _gh_create(
                repo=repo,
                title=str(title),
                body_file=body_file,
                labels=labels,
                run_gh=run_gh,
            )
        else:
            if action == "reopen_comment":
                _gh_reopen(repo=repo, number=number, run_gh=run_gh)
                try:
                    url = _gh_comment(
                        repo=repo, number=number, body_file=body_file, run_gh=run_gh
                    )
                except RuntimeError as error:
                    raise PartialWrite(
                        f"reopened #{number} but the comment failed: {error}",
                        number=number,
                    ) from error
            else:
                url = _gh_comment(
                    repo=repo, number=number, body_file=body_file, run_gh=run_gh
                )
            extras = [name for name in labels if name == TESTER_SOURCE_LABEL]
            if extras:
                try:
                    _gh_add_labels(
                        repo=repo, number=number, labels=extras, run_gh=run_gh
                    )
                except RuntimeError as error:
                    raise PartialWrite(
                        f"commented #{number} ({url}) but adding labels failed: {error}",
                        number=number,
                        url=url,
                    ) from error
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
    return {"url": url, "labels": labels}


if __name__ == "__main__":
    raise SystemExit(
        "file_bug.py is the library. Run scripts/file-bug.py <cmd> instead."
    )
