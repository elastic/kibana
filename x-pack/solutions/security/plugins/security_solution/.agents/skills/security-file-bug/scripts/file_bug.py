from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal

WriteAction = Literal["create", "comment", "reopen_comment", "ask"]
UNKNOWN_ANSWER = "Unknown"


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


def format_issue_title(team_label: str, symptom: str) -> str:
    name = re.sub(r"^Team:\s*", "", team_label.strip())
    symptom_text = " ".join(symptom.split()).strip()
    if not name or not symptom_text:
        raise ValueError("team label and symptom are required")
    return f"[{name}] {symptom_text}"


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
        matches.append(IssueMatch(number, state, str(entry.get("title", ""))))
    return matches


def finding_from_jsonl(
    records: list,
    *,
    index: int | None = None,
    title: str | None = None,
) -> dict:
    findings = [
        record
        for record in records
        if isinstance(record, dict) and record.get("kind") == "finding"
    ]
    if title is not None:
        wanted = title.strip().lower()
        for finding in findings:
            if str(finding.get("title", "")).strip().lower() == wanted:
                return finding
        raise ValueError(f"no finding titled {title!r}")
    if index is None:
        if len(findings) == 1:
            return findings[0]
        raise ValueError("pass --index or --title when jsonl has multiple findings")
    if index < 0 or index >= len(findings):
        raise ValueError(f"finding index {index} out of range")
    return findings[index]


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


_DEV_INSTALL = "from source (dev)"
_LOCAL_KINDS = frozenset({"local", "scout"})
_SCREENSHOT_PREFIX = "Screenshot:"
_RECORDING_PREFIX = "Recording:"
_CONSOLE_PREFIX = "Console:"
_NETWORK_PREFIX = "Network:"
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
    if environment.get("kind") in _LOCAL_KINDS:
        return _DEV_INSTALL
    return None


def _describe_the_bug(finding: dict) -> str:
    parts: list[str] = []
    current = finding.get("current_behavior")
    if current is not None and str(current).strip():
        parts.append(str(current).strip())
    why = finding.get("why_issue")
    if why is not None and str(why).strip():
        parts.append(str(why).strip())
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


def _values_with_prefix(lines: list[str], prefix: str) -> list[str]:
    return [line[len(prefix) :].strip() for line in lines if line.startswith(prefix)]


def _remaining_evidence(lines: list[str]) -> list[str]:
    classified = (
        _SCREENSHOT_PREFIX,
        _RECORDING_PREFIX,
        _CONSOLE_PREFIX,
        _NETWORK_PREFIX,
    )
    return [line for line in lines if not line.startswith(classified)]


def _stack_version(config: dict, environment: dict) -> str:
    return _first_text(
        config.get("kibana_version"),
        environment.get("kibana_version"),
        config.get("elasticsearch_version"),
        environment.get("elasticsearch_version"),
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
    return _optional_text(raw)


def _additional_information(finding: dict, evidence: list[str]) -> str | None:
    lines: list[str] = []
    for label, key in (("Flow", "flow"), ("Level", "level")):
        value = _optional_text(finding.get(key))
        if value is not None:
            lines.append(f"{label}: {value}")
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


def _current_behaviour(finding: dict, evidence: list[str]) -> str:
    parts: list[str] = []
    current = finding.get("current_behavior")
    if current is not None and str(current).strip():
        parts.append(str(current).strip())
    media = [
        *_values_with_prefix(evidence, _SCREENSHOT_PREFIX),
        *_values_with_prefix(evidence, _RECORDING_PREFIX),
    ]
    if media:
        parts.append("\n".join(media))
    return "\n\n".join(parts)


def pack_gaps(finding: dict, config: dict) -> list[str]:
    environment = _environment(config)
    evidence = _evidence_lines(finding)
    gaps: list[str] = []
    if not _stack_version(config, environment):
        gaps.append("version")
    if not _numbered_steps(finding):
        gaps.append("steps")
    if not _current_behaviour(finding, evidence):
        gaps.append("current")
    if not _first_text(finding.get("expected_behavior")):
        gaps.append("expected")
    if not _feature_flags(finding, config, environment):
        gaps.append("feature_flags")
    if infer_deployment(finding, config).status == "ask":
        gaps.append("deployment")
    if not _optional_text(finding.get("role"), config.get("role")):
        gaps.append("role")
    if not _spaces(finding, config, environment):
        gaps.append("spaces")
    return gaps


def is_thin_pack(finding: dict, config: dict) -> bool:
    return bool(pack_gaps(finding, config))


def render_bug_body(finding: dict, config: dict) -> str:
    environment = _environment(config)
    evidence = _evidence_lines(finding)
    optional = (
        (
            _HEADING_FEATURE_FLAGS,
            _feature_flags(finding, config, environment),
        ),
        (_HEADING_DEPLOYMENT, _deployment(finding, config, environment)),
        (_HEADING_ROLE, _optional_text(finding.get("role"), config.get("role"))),
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
        (_HEADING_VERSION, _stack_version(config, environment)),
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
        (_HEADING_CURRENT, _current_behaviour(finding, evidence)),
        (_HEADING_EXPECTED, _first_text(finding.get("expected_behavior"))),
    ]
    console = "\n".join(_values_with_prefix(evidence, _CONSOLE_PREFIX))
    if console:
        sections.append((_HEADING_CONSOLE, console))
    logs = "\n".join(_values_with_prefix(evidence, _NETWORK_PREFIX))
    if logs:
        sections.append((_HEADING_LOGS, logs))
    additional = optional_present.get(_HEADING_ADDITIONAL)
    if additional is not None:
        sections.append((_HEADING_ADDITIONAL, additional))
    filled = [(heading, body) for heading, body in sections if body]
    return "\n\n".join(f"{heading}\n{body}" for heading, body in filled) + "\n"


_ASSET_URL = (
    "https://uploads.github.com/repos/{repo}/issues/{issue_number}/assets?name={name}"
)
_VIDEO_SUFFIXES = frozenset({".mp4", ".mov", ".webm"})
_COMPRESS_MAX_SIZE = "9M"

HttpPost = Callable[[str, dict], dict]
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


def compress_video(src: Path, dest: Path, run: CommandRunner | None = None) -> None:
    """Re-encode `src` into `dest` under the GitHub asset size limit."""
    runner = _run_checked if run is None else run
    runner(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vcodec",
            "libx264",
            "-acodec",
            "aac",
            "-crf",
            "28",
            "-fs",
            _COMPRESS_MAX_SIZE,
            str(dest),
        ]
    )


def _default_http_post(url: str, headers: dict, file_path: Path) -> dict:
    """Multipart-POST `file_path` to a GitHub asset URL with `curl`."""
    argv = ["curl", "-s", "-X", "POST", "-w", "\n%{http_code}"]
    for key, value in headers.items():
        argv += ["-H", f"{key}: {value}"]
    argv += ["-F", f"file=@{file_path}", url]
    completed = subprocess.run(argv, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise UploadError(completed.stderr.strip() or "curl failed", 0)
    body, _, code = completed.stdout.rpartition("\n")
    status = int(code.strip()) if code.strip().isdigit() else 0
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        payload = {}
    asset_url = _as_mapping(payload).get("browser_download_url")
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


def _retry_compressed(
    path: Path,
    url: str,
    headers: dict,
    http_post: HttpPost,
    compress_video_fn: CompressVideo,
) -> tuple[bool, str, str]:
    workdir = Path(tempfile.mkdtemp(prefix="file_bug_compress_"))
    try:
        dest = workdir / path.name
        try:
            compress_video_fn(path, dest)
        except (OSError, subprocess.SubprocessError) as error:
            return False, "", f"compress failed before the retry ({error})"
        ok, status, asset_url = _post(http_post, url, headers, dest)
        if ok:
            return True, asset_url or "", ""
        return False, "", _rejected_reason(status, after_compress=True)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def upload_evidence(
    *,
    issue_number: int,
    repo: str,
    files: list,
    token: str,
    http_post: HttpPost = _default_http_post,
    compress_video_fn: CompressVideo = compress_video,
) -> UploadResult:
    """Upload every evidence file, compressing a rejected video once before retrying."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    uploaded: list[tuple[str, str]] = []
    leftovers: list[tuple[str, str]] = []
    for file_path in files:
        path = Path(file_path)
        url = _ASSET_URL.format(repo=repo, issue_number=issue_number, name=path.name)
        ok, status, asset_url = _post(http_post, url, headers, path)
        if ok:
            uploaded.append((str(path), asset_url or ""))
            continue
        if path.suffix.lower() not in _VIDEO_SUFFIXES:
            leftovers.append((str(path), _rejected_reason(status)))
            continue
        ok, asset_url, reason = _retry_compressed(
            path, url, headers, http_post, compress_video_fn
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


def _default_run_gh(argv: list) -> dict:
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
        returncode, stdout, stderr = _gh_result(run_gh(argv))
    if returncode != 0:
        raise RuntimeError(_gh_failed(argv, stderr))
    return _first_url(stdout)


def write_github(
    *,
    action: WriteAction,
    repo: str,
    title: str | None,
    body: str,
    labels: list,
    number: int | None,
    run_gh: GhRunner = _default_run_gh,
) -> dict:
    """Run the `gh` write for `action`, never retrying a create that already failed."""
    if action == "ask":
        raise ValueError("action 'ask' must be resolved by the caller before writing")
    if action == "create":
        if not title:
            raise ValueError("action 'create' needs a title")
    elif number is None:
        raise ValueError(f"action {action!r} needs an issue number")

    workdir = Path(tempfile.mkdtemp(prefix="file_bug_body_"))
    try:
        body_file = workdir / "body.md"
        body_file.write_text(body, encoding="utf-8")
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
            url = _gh_comment(
                repo=repo, number=number, body_file=body_file, run_gh=run_gh
            )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
    return {"url": url}
