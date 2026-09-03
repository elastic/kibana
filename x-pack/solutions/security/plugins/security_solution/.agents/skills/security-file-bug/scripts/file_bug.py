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
