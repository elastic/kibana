from __future__ import annotations

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
