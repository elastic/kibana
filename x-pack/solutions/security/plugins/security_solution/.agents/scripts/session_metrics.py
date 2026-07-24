#!/usr/bin/env python3
"""Pure parsing and formatting primitives for exploratory-tester session metrics."""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


TOKEN_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)


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
) -> TranscriptResult:
    """Parse supported JSONL usage blocks from one transcript."""
    source = str(path)
    if not path.is_file():
        return TranscriptResult(source, scope, "missing", None, 0)

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
        return TranscriptResult(source, scope, "unreadable", None, 0)

    if usage_blocks == 0:
        return TranscriptResult(source, scope, "empty", None, 0)
    return TranscriptResult(source, scope, "available", totals, usage_blocks)


def format_legacy_usage(totals: TokenTotals) -> str:
    """Render the stable one-line format used by existing skill consumers."""
    return (
        f"input={totals.input_tokens} "
        f"output={totals.output_tokens} "
        f"cache_create={totals.cache_creation_input_tokens} "
        f"cache_read={totals.cache_read_input_tokens} "
        f"total={totals.total}"
    )
