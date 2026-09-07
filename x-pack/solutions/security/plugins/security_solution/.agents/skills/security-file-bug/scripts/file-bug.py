#!/usr/bin/env python3
"""Single entry point the security-file-bug skill calls instead of hand-rolled `gh` flags."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import (  # noqa: E402
    CreateFailed,
    IssueMatch,
    _default_run_gh as default_run_gh,
    decide_write_path,
    infer_team_label,
    render_bug_body,
    upload_evidence,
    validate_labels,
    write_github,
)

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_ASK = 2

_ISSUE_NUMBER_RE = re.compile(r"/issues/(\d+)")


class _Parser(argparse.ArgumentParser):
    """Argparse exits 2 on usage errors; exit 2 is reserved for `ask`, so usage errors exit 1."""

    def error(self, message: str) -> None:
        self.exit(EXIT_FAIL, f"{self.prog}: error: {message}\n")


def _read_text(source: str) -> str:
    if source == "-":
        return sys.stdin.read()
    return Path(source).read_text(encoding="utf-8")


def _read_json(source: str) -> object:
    return json.loads(_read_text(source))


def _emit(payload: dict, code: int = EXIT_OK) -> int:
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")
    return code


def _fail(message: str, code: int = EXIT_FAIL) -> int:
    json.dump({"error": message}, sys.stderr)
    sys.stderr.write("\n")
    return code


def _optional(value: str | None) -> str | None:
    text = (value or "").strip()
    return text or None


def _issue_matches(payload: object) -> list:
    entries = payload.get("matches", []) if isinstance(payload, dict) else []
    return [
        IssueMatch(int(entry["number"]), entry["state"], str(entry.get("title", "")))
        for entry in entries
    ]


def _catalog_names(payload: object) -> set:
    names: set = set()
    for entry in payload if isinstance(payload, list) else []:
        name = entry.get("name") if isinstance(entry, dict) else entry
        if name:
            names.add(str(name))
    return names


def _cmd_decide(args: argparse.Namespace) -> int:
    path = decide_write_path(_issue_matches(_read_json(args.matches)))
    return _emit(
        {
            "action": path.action,
            "number": path.number,
            "candidates": [
                {"number": match.number, "state": match.state, "title": match.title}
                for match in path.candidates
            ],
        },
        EXIT_ASK if path.action == "ask" else EXIT_OK,
    )


def _cmd_validate_labels(args: argparse.Namespace) -> int:
    requested = [name.strip() for name in args.labels.split(",") if name.strip()]
    decision = validate_labels(requested, _catalog_names(_read_json(args.catalog)))
    return _emit(
        {
            "keep": list(decision.keep),
            "dropped": [
                {"label": label, "reason": reason} for label, reason in decision.dropped
            ],
            "ask_team": decision.ask_team,
        },
        EXIT_ASK if decision.ask_team else EXIT_OK,
    )


def _cmd_infer_team(args: argparse.Namespace) -> int:
    result = infer_team_label(
        area=_optional(args.area),
        area_slug=_optional(args.slug),
        route=_optional(args.route),
        knowledge_md=_read_text(args.knowledge),
    )
    return _emit(
        {
            "status": result.status,
            "label": result.label,
            "candidates": list(result.candidates),
        },
        EXIT_ASK if result.status == "ask" else EXIT_OK,
    )


def _cmd_render_body(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding)
    config = _read_json(args.config) if args.config else {}
    return _emit({"body": render_bug_body(finding, config)})


def _cmd_write(args: argparse.Namespace) -> int:
    if args.action == "ask":
        return _fail(
            "action 'ask' must be resolved with the human before writing", EXIT_ASK
        )
    try:
        result = write_github(
            action=args.action,
            repo=args.repo,
            title=args.title,
            body=_read_text(args.body_file),
            labels=args.label,
            number=args.number,
        )
    except CreateFailed as error:
        return _fail(str(error))
    except (RuntimeError, ValueError) as error:
        return _fail(str(error))
    url = result["url"]
    match = _ISSUE_NUMBER_RE.search(url)
    return _emit(
        {
            "action": args.action,
            "url": url,
            "number": int(match.group(1)) if match else args.number,
        }
    )


def _cmd_upload(args: argparse.Namespace) -> int:
    auth = default_run_gh(["gh", "auth", "token"])
    token = str(auth.get("stdout") or "").strip()
    if auth.get("returncode") or not token:
        detail = str(auth.get("stderr") or "").strip() or "no token on stdout"
        return _fail(f"`gh auth token` failed: {detail}")
    result = upload_evidence(
        issue_number=args.issue, repo=args.repo, files=args.file, token=token
    )
    return _emit(
        {
            "uploaded": [{"path": path, "url": url} for path, url in result.uploaded],
            "leftovers": [
                {"path": path, "reason": reason} for path, reason in result.leftovers
            ],
        }
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = _Parser(
        prog="file-bug.py",
        description="Compose file_bug.py into the subcommands the skill calls.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    decide = subparsers.add_parser("decide", help="Pick create / comment / reopen_comment / ask")
    decide.add_argument(
        "--matches",
        required=True,
        help='JSON file holding {"matches": [...]}, or - to read stdin',
    )
    decide.set_defaults(handler=_cmd_decide)

    labels = subparsers.add_parser("validate-labels", help="Keep only labels that exist")
    labels.add_argument("--labels", required=True, help="Comma-separated label names")
    labels.add_argument(
        "--catalog",
        required=True,
        help="`gh label list --json name` output, or - to read stdin",
    )
    labels.set_defaults(handler=_cmd_validate_labels)

    infer = subparsers.add_parser("infer-team", help="Infer a Team:* label")
    infer.add_argument("--area", default=None)
    infer.add_argument("--slug", default=None)
    infer.add_argument("--route", default=None)
    infer.add_argument("--knowledge", required=True, help="security-domain-knowledge.md path")
    infer.set_defaults(handler=_cmd_infer_team)

    render = subparsers.add_parser("render-body", help="Render the Kibana bug template")
    render.add_argument("--finding", required=True, help="Finding JSON path, or - for stdin")
    render.add_argument("--config", default=None, help="Session config JSON path")
    render.set_defaults(handler=_cmd_render_body)

    write = subparsers.add_parser("write", help="Run the agreed `gh` write")
    write.add_argument(
        "--action",
        required=True,
        choices=("create", "comment", "reopen_comment", "ask"),
    )
    write.add_argument("--repo", required=True)
    write.add_argument("--title", default=None)
    write.add_argument("--body-file", required=True, help="Body markdown path, or - for stdin")
    write.add_argument("--label", action="append", default=[])
    write.add_argument("--number", type=int, default=None, help="Issue number to comment on")
    write.set_defaults(handler=_cmd_write)

    upload = subparsers.add_parser("upload", help="Attach evidence to an issue")
    upload.add_argument("--issue", type=int, required=True)
    upload.add_argument("--repo", required=True)
    upload.add_argument("--file", action="append", required=True)
    upload.set_defaults(handler=_cmd_upload)

    return parser


def main(argv: list | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        return _fail(f"{type(error).__name__}: {error}")


if __name__ == "__main__":
    sys.exit(main())
