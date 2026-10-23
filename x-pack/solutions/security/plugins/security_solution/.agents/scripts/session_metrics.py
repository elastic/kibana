#!/usr/bin/env python3
"""Pure parsing and formatting primitives for exploratory-tester session metrics."""

from __future__ import annotations

import http.client
import json
import math
import os
import re
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence


TOKEN_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)
SYNTHETIC_MODEL = "<synthetic>"
MODEL_PRICES_PATH = Path(__file__).resolve().parent / "model_prices.json"
MODEL_PRICES_URL = (
    "https://raw.githubusercontent.com/github/gh-aw/main/actions/setup/js/models.json"
)
FETCH_TIMEOUT_SECONDS = 2
MAX_REMOTE_CATALOG_BYTES = 1_000_000
CACHE_WRITE_1H_INPUT_MULTIPLIER = 2
MAX_MODEL_LESS_COST_SHARE = 0.01
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
class ModelUsage:
    totals: TokenTotals = TokenTotals()
    cache_write_1h_tokens: int = 0

    def __add__(self, other: "ModelUsage") -> "ModelUsage":
        return ModelUsage(
            totals=self.totals + other.totals,
            cache_write_1h_tokens=(
                self.cache_write_1h_tokens + other.cache_write_1h_tokens
            ),
        )


@dataclass(frozen=True)
class TranscriptResult:
    source: str
    scope: str
    status: str
    totals: TokenTotals | None
    usage_blocks: int
    name: str | None = None
    usage_by_model: Mapping[str | None, ModelUsage] = field(default_factory=dict)


@dataclass(frozen=True)
class ModelPrice:
    input: float
    output: float
    cache_read: float
    cache_write: float


@dataclass(frozen=True)
class PriceCatalog:
    source: str
    checked: str
    models: Mapping[str, ModelPrice | None]


@dataclass(frozen=True)
class SessionCost:
    usd: float | None
    unavailable_reason: str | None = None
    model_less_tokens_left_out: int = 0


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


def _message_field(obj: dict[str, Any], key: str) -> str | None:
    message = obj.get("message")
    if not isinstance(message, dict):
        return None
    value = message.get(key)
    return value if isinstance(value, str) and value else None


def _usage_block(usage: dict[str, Any]) -> ModelUsage | None:
    values = {
        token_field: _as_non_negative_integer(usage.get(token_field))
        for token_field in TOKEN_FIELDS
    }
    if not any(value is not None for value in values.values()):
        return None

    totals = TokenTotals(
        input_tokens=values["input_tokens"] or 0,
        output_tokens=values["output_tokens"] or 0,
        cache_creation_input_tokens=values["cache_creation_input_tokens"] or 0,
        cache_read_input_tokens=values["cache_read_input_tokens"] or 0,
    )
    cache_creation = usage.get("cache_creation")
    cache_write_1h = (
        _as_non_negative_integer(cache_creation.get("ephemeral_1h_input_tokens"))
        if isinstance(cache_creation, dict)
        else None
    )
    return ModelUsage(
        totals=totals,
        cache_write_1h_tokens=min(
            cache_write_1h or 0, totals.cache_creation_input_tokens
        ),
    )


def parse_transcript(
    path: Path,
    scope: str = "orchestrator",
    name: str | None = None,
) -> TranscriptResult:
    """Parse JSONL usage blocks from one transcript, counting each API response once."""
    source = str(path)
    if not path.is_file():
        return TranscriptResult(source, scope, "missing", None, 0, name)

    # Claude Code writes one line per content block of a response and repeats the
    # response usage on each of them; the last line carries the final counts.
    blocks_by_message: dict[str, tuple[str | None, ModelUsage]] = {}
    blocks_without_id: list[tuple[str | None, ModelUsage]] = []

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
                model = _message_field(obj, "model")
                if model == SYNTHETIC_MODEL:
                    continue
                block = _usage_block(usage)
                if block is None:
                    continue

                message_id = _message_field(obj, "id")
                if message_id is None:
                    blocks_without_id.append((model, block))
                else:
                    blocks_by_message[message_id] = (model, block)
    except OSError:
        return TranscriptResult(source, scope, "unreadable", None, 0, name)

    blocks = [*blocks_by_message.values(), *blocks_without_id]
    if not blocks:
        return TranscriptResult(source, scope, "empty", None, 0, name)

    totals = TokenTotals()
    usage_by_model: dict[str | None, ModelUsage] = {}
    for model, block in blocks:
        totals += block.totals
        usage_by_model[model] = usage_by_model.get(model, ModelUsage()) + block
    return TranscriptResult(
        source, scope, "available", totals, len(blocks), name, usage_by_model
    )


def load_price_catalog(path: Path = MODEL_PRICES_PATH) -> PriceCatalog:
    """Load the local copy of the per-token USD price catalog."""
    try:
        with path.open(encoding="utf-8") as catalog_file:
            raw = json.load(catalog_file)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Unable to read price catalog: {path}") from exc

    if not isinstance(raw, dict) or not isinstance(raw.get("models"), dict):
        raise ValueError("Price catalog must be an object with a models map")
    source = raw.get("source")
    checked = raw.get("checked")
    if not isinstance(source, str) or not isinstance(checked, str):
        raise ValueError("Price catalog source and checked must be strings")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", checked):
        raise ValueError("Price catalog checked must be a YYYY-MM-DD date")
    return PriceCatalog(
        source=source, checked=checked, models=_parse_model_prices(raw["models"])
    )


def fetch_price_catalog(url: str, checked: str) -> PriceCatalog:
    """Fetch gh-aw's models.json and keep its Anthropic prices."""
    try:
        with urllib.request.urlopen(url, timeout=FETCH_TIMEOUT_SECONDS) as response:
            body = response.read(MAX_REMOTE_CATALOG_BYTES + 1)
    except (OSError, ValueError, http.client.HTTPException) as exc:
        raise ValueError(f"Unable to fetch price catalog: {url}") from exc
    if len(body) > MAX_REMOTE_CATALOG_BYTES:
        raise ValueError(f"Price catalog is too large: {url}")
    try:
        raw = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError(f"Price catalog is not valid JSON: {url}") from exc

    providers = raw.get("providers") if isinstance(raw, dict) else None
    anthropic = providers.get("anthropic") if isinstance(providers, dict) else None
    models = anthropic.get("models") if isinstance(anthropic, dict) else None
    if not isinstance(models, dict) or not models:
        raise ValueError(f"Price catalog has no Anthropic models: {url}")
    costs = {
        model: entry.get("cost") if isinstance(entry, dict) else None
        for model, entry in models.items()
    }
    # A remote entry without a valid price stays as unpriced, so its id cannot fall
    # through to a shorter id's prices in find_model_price.
    prices = _parse_model_prices(costs, keep_unpriced=True)
    if not any(price is not None for price in prices.values()):
        raise ValueError(f"Price catalog has no valid Anthropic prices: {url}")
    return PriceCatalog(source=url, checked=checked, models=prices)


def _parse_model_prices(
    raw_models: Mapping[str, Any], keep_unpriced: bool = False
) -> dict[str, ModelPrice | None]:
    models: dict[str, ModelPrice | None] = {}
    for model, prices in raw_models.items():
        price = _model_price(prices)
        if price is None and not keep_unpriced:
            raise ValueError(f"Price catalog entry needs valid input and output prices: {model}")
        models[model] = price
    return models


def _model_price(prices: Any) -> ModelPrice | None:
    if not isinstance(prices, dict):
        return None
    input_price = _as_price(prices.get("input"))
    output_price = _as_price(prices.get("output"))
    if input_price is None or output_price is None:
        return None
    return ModelPrice(
        input=input_price,
        output=output_price,
        cache_read=_price_or(prices.get("cache_read"), input_price),
        cache_write=_price_or(prices.get("cache_write"), input_price),
    )


def _as_price(value: Any) -> float | None:
    # gh-aw's models.json writes prices as decimal strings.
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value) or value < 0:
        return None
    return float(value)


def _price_or(value: Any, fallback: float) -> float:
    price = _as_price(value)
    return fallback if price is None or price == 0 else price


def _comparable_model_id(model: str) -> str:
    return re.sub(r"[._]+", "-", model.strip().lower())


def find_model_price(catalog: PriceCatalog, model: str) -> ModelPrice | None:
    """Match a model by exact id, then by the longest catalog id it starts with."""
    comparable = _comparable_model_id(model)
    if not comparable:
        return None

    best: ModelPrice | None = None
    best_length = -1
    for catalog_model, price in catalog.models.items():
        comparable_catalog_model = _comparable_model_id(catalog_model)
        if comparable_catalog_model == comparable:
            return price
        if (
            comparable.startswith(comparable_catalog_model)
            and len(comparable_catalog_model) > best_length
        ):
            best = price
            best_length = len(comparable_catalog_model)
    return best


def estimate_session_cost(
    usage_by_model: Mapping[str | None, ModelUsage],
    catalog: PriceCatalog,
) -> SessionCost:
    """Return the session cost, leaving out usage with no model id when it is at most 1% of it."""
    named = {model: usage for model, usage in usage_by_model.items() if model is not None}
    prices = _resolve_prices(named, catalog)
    if prices is None:
        reason = "No price for every model in the session" if named else "No usage with a model id"
        return SessionCost(usd=None, unavailable_reason=reason)
    cost = _priced_cost(named, prices)
    model_less = usage_by_model.get(None)
    if model_less is None:
        return SessionCost(usd=cost)
    # Priced at the session's highest prices, the left-out share is an upper bound.
    # When the named models cost $0 (e.g. aborted responses), any model-less usage is over 1%.
    highest = _highest_prices(list(prices.values()))
    if _usage_cost(model_less, highest) > cost * MAX_MODEL_LESS_COST_SHARE:
        return SessionCost(
            usd=None,
            unavailable_reason="Usage with no model id is over 1% of the session cost",
        )
    return SessionCost(usd=cost, model_less_tokens_left_out=model_less.totals.total)


def _highest_prices(prices: Sequence[ModelPrice]) -> ModelPrice:
    return ModelPrice(
        input=max(price.input for price in prices),
        output=max(price.output for price in prices),
        cache_read=max(price.cache_read for price in prices),
        cache_write=max(price.cache_write for price in prices),
    )


def estimate_cost_usd(
    usage_by_model: Mapping[str | None, ModelUsage],
    catalog: PriceCatalog,
) -> float | None:
    """Return the list-price cost in USD, or None when any model has no price."""
    prices = _resolve_prices(usage_by_model, catalog)
    if prices is None:
        return None
    return _priced_cost(usage_by_model, prices)


def _resolve_prices(
    usage_by_model: Mapping[str | None, ModelUsage],
    catalog: PriceCatalog,
) -> dict[str | None, ModelPrice] | None:
    if not usage_by_model:
        return None
    prices: dict[str | None, ModelPrice] = {}
    for model in usage_by_model:
        price = find_model_price(catalog, model) if model else None
        if price is None:
            return None
        prices[model] = price
    return prices


def _priced_cost(
    usage_by_model: Mapping[str | None, ModelUsage],
    prices: Mapping[str | None, ModelPrice],
) -> float:
    return sum(_usage_cost(usage_by_model[model], price) for model, price in prices.items())


def _usage_cost(usage: ModelUsage, price: ModelPrice) -> float:
    totals = usage.totals
    cache_write_5m = totals.cache_creation_input_tokens - usage.cache_write_1h_tokens
    return (
        totals.input_tokens * price.input
        + totals.output_tokens * price.output
        + totals.cache_read_input_tokens * price.cache_read
        + cache_write_5m * price.cache_write
        + usage.cache_write_1h_tokens * price.input * CACHE_WRITE_1H_INPUT_MULTIPLIER
    )


def format_cost(cost_usd: float, catalog: PriceCatalog) -> str | None:
    """Render the test plan cost marker value, or None when the cost rounds to zero."""
    usd = f"{cost_usd:.4f}"
    if float(usd) == 0:
        return None
    return f"usd={usd} pricing={catalog.checked}"


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
