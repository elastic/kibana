#!/usr/bin/env python3
"""Pure parsing and formatting primitives for exploratory-tester session metrics."""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping


TOKEN_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)
ALLOWED_SCOPES = frozenset(("orchestrator", "worker"))
ALLOWED_ARTIFACT_KINDS = frozenset(
    (
        "findings",
        "report",
        "screenshot",
        "video",
        "configuration",
        "detector_source",
    )
)
PAYLOAD_FIELDS = ("tool_input", "tool_output", "browser_events")


@dataclass(frozen=True)
class TokenTotals:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0

    @property
    def total(self) -> int:
        return sum(
            (
                self.input_tokens,
                self.output_tokens,
                self.cache_creation_input_tokens,
                self.cache_read_input_tokens,
            )
        )

    def __add__(self, other: "TokenTotals") -> "TokenTotals":
        return TokenTotals(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            cache_creation_input_tokens=(
                self.cache_creation_input_tokens
                + other.cache_creation_input_tokens
            ),
            cache_read_input_tokens=(
                self.cache_read_input_tokens + other.cache_read_input_tokens
            ),
        )

    def as_dict(self) -> dict[str, int]:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_creation_input_tokens": self.cache_creation_input_tokens,
            "cache_read_input_tokens": self.cache_read_input_tokens,
            "total": self.total,
        }


@dataclass(frozen=True)
class TranscriptResult:
    source: str
    scope: str
    status: str
    totals: TokenTotals | None
    usage_blocks: int
    name: str | None = None


@dataclass(frozen=True)
class ManifestTranscript:
    path: str
    scope: str = "orchestrator"
    name: str | None = None


@dataclass(frozen=True)
class ManifestArtifact:
    path: str
    kind: str


def resolve_transcript(explicit_path: str | None) -> Path | None:
    """Return the explicit or current Claude Code transcript, if it exists."""
    if explicit_path:
        path = Path(explicit_path)
        return path if path.is_file() else None

    session_id = os.environ.get("CLAUDE_CODE_SESSION_ID", "").strip()
    if not session_id:
        return None

    cwd_slug = os.getcwd().replace("/", "-")
    transcript = Path.home() / ".claude" / "projects" / cwd_slug / f"{session_id}.jsonl"
    return transcript if transcript.is_file() else None


def _as_non_negative_integer(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value) or value < 0:
        return None
    if isinstance(value, float) and not value.is_integer():
        return None
    return int(value)


def _extract_usage(obj: Any) -> dict[str, Any] | None:
    if not isinstance(obj, dict):
        return None

    message = obj.get("message")
    if isinstance(message, dict) and isinstance(message.get("usage"), dict):
        return message["usage"]

    usage = obj.get("usage")
    return usage if isinstance(usage, dict) else None


def parse_transcript(
    path: Path,
    scope: str = "orchestrator",
    name: str | None = None,
) -> TranscriptResult:
    """Parse supported JSONL usage blocks from one transcript."""
    source = str(path)
    if not path.is_file():
        return TranscriptResult(source, scope, "missing", None, 0, name)

    totals = TokenTotals()
    usage_blocks = 0

    try:
        with path.open(encoding="utf-8") as transcript:
            for raw in transcript:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    obj = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                usage = _extract_usage(obj)
                if usage is None:
                    continue

                values = {
                    field: _as_non_negative_integer(usage.get(field))
                    for field in TOKEN_FIELDS
                }
                if not any(value is not None for value in values.values()):
                    continue

                usage_blocks += 1
                totals += TokenTotals(
                    input_tokens=values["input_tokens"] or 0,
                    output_tokens=values["output_tokens"] or 0,
                    cache_creation_input_tokens=(
                        values["cache_creation_input_tokens"] or 0
                    ),
                    cache_read_input_tokens=values["cache_read_input_tokens"] or 0,
                )
    except OSError:
        return TranscriptResult(source, scope, "unreadable", None, 0, name)

    if usage_blocks == 0:
        return TranscriptResult(source, scope, "empty", None, 0, name)
    return TranscriptResult(source, scope, "available", totals, usage_blocks, name)


def format_legacy_usage(totals: TokenTotals) -> str:
    """Render the stable one-line format used by existing skill consumers."""
    return (
        f"input={totals.input_tokens} "
        f"output={totals.output_tokens} "
        f"cache_create={totals.cache_creation_input_tokens} "
        f"cache_read={totals.cache_read_input_tokens} "
        f"total={totals.total}"
    )


def load_manifest(path: Path) -> dict[str, object]:
    """Load and validate the versioned session metrics manifest."""
    try:
        with path.open(encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Unable to read metrics manifest: {path}") from exc

    if not isinstance(manifest, dict) or manifest.get("version") != 1:
        raise ValueError("Metrics manifest must be an object with version 1")
    return manifest


def _resolve_manifest_path(root: Path, relative_path: str) -> Path:
    if not isinstance(relative_path, str) or not relative_path:
        raise ValueError("Manifest paths must be non-empty strings")

    candidate = (root / relative_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"Manifest path escapes session root: {relative_path}") from exc
    return candidate


def _resolve_declared_root(
    manifest_path: Path,
    raw_root: object,
    label: str,
) -> Path:
    if not isinstance(raw_root, str):
        raise ValueError(f"Manifest {label} must be a string")

    manifest_directory = manifest_path.parent.resolve()
    candidate = (manifest_directory / raw_root).resolve()
    try:
        candidate.relative_to(manifest_directory)
    except ValueError as exc:
        raise ValueError(
            f"Manifest {label} must remain within the manifest directory"
        ) from exc
    return candidate


def _manifest_transcripts(
    manifest: Mapping[str, object],
) -> list[ManifestTranscript]:
    raw_transcripts = manifest.get("transcripts", [])
    if not isinstance(raw_transcripts, list):
        raise ValueError("Manifest transcripts must be a list")

    transcripts: list[ManifestTranscript] = []
    for raw_transcript in raw_transcripts:
        if not isinstance(raw_transcript, dict):
            raise ValueError("Manifest transcript entries must be objects")
        path = raw_transcript.get("path")
        scope = raw_transcript.get("scope", "orchestrator")
        name = raw_transcript.get("name")
        if not isinstance(path, str) or not isinstance(scope, str):
            raise ValueError("Manifest transcript path and scope must be strings")
        if scope not in ALLOWED_SCOPES:
            raise ValueError(f"Unsupported transcript scope: {scope}")
        if name is not None and not isinstance(name, str):
            raise ValueError("Manifest transcript name must be a string")
        transcripts.append(ManifestTranscript(path, scope, name))
    return transcripts


def _manifest_artifacts(
    manifest: Mapping[str, object],
) -> list[ManifestArtifact]:
    raw_artifacts = manifest.get("artifacts", [])
    if not isinstance(raw_artifacts, list):
        raise ValueError("Manifest artifacts must be a list")

    artifacts: list[ManifestArtifact] = []
    for raw_artifact in raw_artifacts:
        if not isinstance(raw_artifact, dict):
            raise ValueError("Manifest artifact entries must be objects")
        path = raw_artifact.get("path")
        kind = raw_artifact.get("kind")
        if not isinstance(path, str) or not isinstance(kind, str):
            raise ValueError("Manifest artifact path and kind must be strings")
        if kind not in ALLOWED_ARTIFACT_KINDS:
            raise ValueError(f"Unsupported artifact kind: {kind}")
        artifacts.append(ManifestArtifact(path, kind))
    return artifacts


def _session_dir_artifacts(session_dir: Path) -> list[ManifestArtifact]:
    artifacts: list[ManifestArtifact] = []
    artifacts.extend(
        ManifestArtifact(path.name, "findings")
        for path in session_dir.glob("findings-flow-*.md")
        if path.is_file()
    )
    for name, kind in (("report.md", "report"), ("config.json", "configuration")):
        path = session_dir / name
        if path.is_file():
            artifacts.append(ManifestArtifact(name, kind))

    screenshot_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    video_extensions = {".mov", ".mp4", ".webm"}
    for directory, extensions, kind in (
        ("screenshots", screenshot_extensions, "screenshot"),
        ("videos", video_extensions, "video"),
    ):
        root = session_dir / directory
        if not root.is_dir():
            continue
        artifacts.extend(
            ManifestArtifact(str(path.relative_to(session_dir)), kind)
            for path in root.rglob("*")
            if path.is_file() and path.suffix.lower() in extensions
        )
    return artifacts


def _artifact_metrics(
    manifest_root: Path,
    manifest_artifacts: list[ManifestArtifact],
    session_dir: Path | None,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    artifacts = [(manifest_root, artifact) for artifact in manifest_artifacts]
    if session_dir is not None:
        artifacts.extend(
            (session_dir.resolve(), artifact)
            for artifact in _session_dir_artifacts(session_dir)
        )

    by_kind: dict[str, dict[str, int]] = {}
    sources: list[dict[str, object]] = []
    seen_paths: set[Path] = set()
    for root, artifact in artifacts:
        path = _resolve_manifest_path(root, artifact.path)
        if path in seen_paths:
            continue
        seen_paths.add(path)
        source = {"kind": "artifact", "path": str(path), "artifact_kind": artifact.kind}
        try:
            size = path.stat().st_size
        except OSError:
            source["status"] = "missing"
            sources.append(source)
            continue
        stats = by_kind.setdefault(artifact.kind, {"files": 0, "bytes": 0})
        stats["files"] += 1
        stats["bytes"] += size
        source["status"] = "available"
        source["bytes"] = size
        sources.append(source)

    status = "available" if by_kind else "not_available"
    return {"status": status, "by_kind": by_kind}, sources


def _payload_metrics(manifest: Mapping[str, object]) -> dict[str, object]:
    raw_payload = manifest.get("payload_bytes")
    if not isinstance(raw_payload, dict):
        return {"status": "not_available"}

    values: dict[str, int] = {}
    for field in PAYLOAD_FIELDS:
        value = _as_non_negative_integer(raw_payload.get(field))
        if value is None:
            return {"status": "not_available"}
        values[field] = value
    return {"status": "available", **values}


def _token_metrics(
    results: list[TranscriptResult],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    by_scope: dict[str, TokenTotals] = {}
    sources: list[dict[str, object]] = []
    for result in results:
        source = {
            "kind": "transcript",
            "path": result.source,
            "scope": result.scope,
            "status": result.status,
            "usage_blocks": result.usage_blocks,
        }
        if result.name is not None:
            source["name"] = result.name
        sources.append(source)
        if result.status != "available" or result.totals is None:
            continue
        by_scope[result.scope] = by_scope.get(result.scope, TokenTotals()) + result.totals

    aggregate = TokenTotals()
    serialized_by_scope: dict[str, dict[str, int]] = {}
    for scope, totals in sorted(by_scope.items()):
        serialized_by_scope[scope] = totals.as_dict()
        aggregate += totals

    status = "available" if serialized_by_scope else "not_available"
    return (
        {
            "status": status,
            "by_scope": serialized_by_scope,
            "aggregate": aggregate.as_dict() if serialized_by_scope else None,
        },
        sources,
    )


def build_session_metrics(
    manifest_path: Path | None,
    explicit_transcript: Path | None,
    session_dir: Path | None,
) -> dict[str, object]:
    """Build deterministic scoped token, payload, and artifact metrics."""
    manifest: dict[str, object] = {}
    manifest_root = session_dir.resolve() if session_dir is not None else None
    artifact_root = manifest_root
    manifest_sources: list[dict[str, object]] = []
    if manifest_path is not None and manifest_path.is_file():
        manifest = load_manifest(manifest_path)
        manifest_root = _resolve_declared_root(
            manifest_path,
            manifest.get("session_root", "."),
            "session_root",
        )
        artifact_root = _resolve_declared_root(
            manifest_path,
            manifest.get("artifact_root", manifest.get("session_root", ".")),
            "artifact_root",
        )
        manifest_sources.append(
            {
                "kind": "manifest",
                "path": str(manifest_path),
                "status": "available",
            }
        )
    elif manifest_path is not None:
        manifest_sources.append(
            {
                "kind": "manifest",
                "path": str(manifest_path),
                "status": "missing",
            }
        )
    if manifest_root is None:
        manifest_root = Path.cwd().resolve()
    if artifact_root is None:
        artifact_root = manifest_root

    transcript_results: list[TranscriptResult] = []
    transcript_paths: set[Path] = set()

    def add_transcript(
        path: Path,
        scope: str = "orchestrator",
        name: str | None = None,
    ) -> None:
        resolved_path = path.resolve()
        if resolved_path in transcript_paths:
            return
        transcript_paths.add(resolved_path)
        transcript_results.append(parse_transcript(path, scope, name))

    if manifest:
        for entry in _manifest_transcripts(manifest):
            path = _resolve_manifest_path(manifest_root, entry.path)
            add_transcript(path, entry.scope, entry.name)
    elif explicit_transcript is not None:
        add_transcript(explicit_transcript)
    else:
        auto_transcript = resolve_transcript(None)
        if auto_transcript is not None:
            add_transcript(auto_transcript)

    if explicit_transcript is not None and manifest:
        add_transcript(explicit_transcript)

    tokens, token_sources = _token_metrics(transcript_results)
    artifacts, artifact_sources = _artifact_metrics(
        artifact_root,
        _manifest_artifacts(manifest) if manifest else [],
        session_dir,
    )
    return {
        "schema_version": 1,
        "tokens": tokens,
        "payload_bytes": _payload_metrics(manifest),
        "artifacts": artifacts,
        "sources": manifest_sources + token_sources + artifact_sources,
    }


def render_json_metrics(metrics: Mapping[str, object]) -> str:
    """Render metrics with stable key ordering for fixture comparisons."""
    return json.dumps(metrics, sort_keys=True)
