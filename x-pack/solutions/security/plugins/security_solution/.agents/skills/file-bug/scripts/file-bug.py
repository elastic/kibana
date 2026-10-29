#!/usr/bin/env python3
"""Single entry point the file-bug skill calls instead of hand-rolled `gh` flags."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import uuid
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import (  # noqa: E402
    CreateFailed,
    IssueMatch,
    PartialWrite,
    TitleTooLong,
    _default_run_gh as default_run_gh,
    catalog_from_search_results,
    check_draft,
    decide_write_path,
    embed_uploads,
    finding_from_jsonl,
    format_issue_title,
    infer_deployment,
    infer_release_label,
    infer_team_label,
    pack_gaps,
    parse_search_results,
    render_bug_body,
    run_search,
    scan_security_hints,
    scan_sensitive,
    scan_wip,
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


def _excerpt(text: str, limit: int = 160) -> str:
    collapsed = " ".join(text.split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 1].rstrip() + "…"


def _match_payload(match: IssueMatch) -> dict:
    return {
        "number": match.number,
        "state": match.state,
        "title": match.title,
        "body": match.body,
        "excerpt": _excerpt(match.body),
    }


def _cmd_decide(args: argparse.Namespace) -> int:
    path = decide_write_path(parse_search_results(_read_json(args.matches)))
    return _emit(
        {
            "action": path.action,
            "number": path.number,
            "candidates": [_match_payload(match) for match in path.candidates],
        },
        EXIT_ASK if path.action == "ask" else EXIT_OK,
    )


def _cmd_search(args: argparse.Namespace) -> int:
    try:
        matches, queries = run_search(
            repo=args.repo,
            token=_optional(args.token),
            words=args.words or "",
            screen=_optional(args.screen),
        )
    except (ValueError, RuntimeError) as error:
        return _fail(str(error))
    path = decide_write_path(matches)
    return _emit(
        {
            "action": path.action,
            "number": path.number,
            "candidates": [_match_payload(match) for match in path.candidates],
            "queries": queries,
        },
        EXIT_ASK if path.action == "ask" else EXIT_OK,
    )


def _cmd_validate_labels(args: argparse.Namespace) -> int:
    requested = [name.strip() for name in args.labels.split(",") if name.strip()]
    if args.catalog:
        catalog = catalog_from_search_results([_read_json(args.catalog)])
    elif args.repo:
        payloads = []
        for label in requested:
            result = default_run_gh(
                [
                    "gh",
                    "label",
                    "list",
                    "--repo",
                    args.repo,
                    "--search",
                    label,
                    "--limit",
                    "20",
                    "--json",
                    "name",
                ]
            )
            if result.get("returncode"):
                return _fail(
                    str(result.get("stderr") or "gh label list --search failed")
                )
            try:
                payloads.append(json.loads(str(result.get("stdout") or "[]")))
            except json.JSONDecodeError as error:
                return _fail(f"JSONDecodeError: {error}")
        catalog = catalog_from_search_results(payloads)
    else:
        return _fail("validate-labels needs --catalog or --repo")
    decision = validate_labels(requested, catalog)
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


def _cmd_format_title(args: argparse.Namespace) -> int:
    try:
        title = format_issue_title(args.label, args.symptom)
    except TitleTooLong as error:
        return _emit({"status": "ask", "error": str(error)}, EXIT_ASK)
    except ValueError as error:
        return _fail(str(error))
    return _emit({"title": title})


def _cmd_parse_search(args: argparse.Namespace) -> int:
    matches = parse_search_results(_read_json(args.input))
    return _emit(
        {"matches": [_match_payload(match) for match in matches]}
    )


def _cmd_infer_deployment(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding) if args.finding else {}
    config = _read_json(args.config) if args.config else {}
    if not isinstance(finding, dict) or not isinstance(config, dict):
        return _fail("finding and config must be JSON objects")
    result = infer_deployment(finding, config)
    return _emit(
        {"status": result.status, "label": result.label, "hint": result.hint},
        EXIT_ASK if result.status == "ask" else EXIT_OK,
    )


def _cmd_infer_release(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding) if args.finding else {}
    config = _read_json(args.config) if args.config else {}
    if not isinstance(finding, dict) or not isinstance(config, dict):
        return _fail("finding and config must be JSON objects")
    result = infer_release_label(finding, config)
    return _emit(
        {"status": result.status, "label": result.label, "hint": result.hint},
        EXIT_ASK if result.status == "ask" else EXIT_OK,
    )


def _cmd_from_findings(args: argparse.Namespace) -> int:
    records = [
        json.loads(line)
        for line in _read_text(args.jsonl).splitlines()
        if line.strip()
    ]
    try:
        finding = finding_from_jsonl(
            records, index=args.index, title=_optional(args.title)
        )
    except ValueError as error:
        return _fail(str(error), EXIT_ASK)
    if args.out:
        Path(args.out).write_text(json.dumps(finding), encoding="utf-8")
    return _emit(finding)


_PARSE_FINDINGS = (
    Path(__file__).resolve().parents[2] / "exploratory-tester" / "scripts" / "parse-findings.py"
)


def _cmd_prepare(args: argparse.Namespace) -> int:
    session = Path(args.session_dir)
    parsed = subprocess.run(
        [sys.executable, str(_PARSE_FINDINGS), "--session-dir", str(session)],
        check=False,
        capture_output=True,
        text=True,
    )
    if parsed.returncode:
        return _fail(f"parse-findings failed: {(parsed.stderr or parsed.stdout).strip()}")
    records = [
        json.loads(line)
        for line in (session / "findings.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    try:
        finding = finding_from_jsonl(records, index=args.index, title=_optional(args.title))
    except ValueError as error:
        return _fail(str(error), EXIT_ASK)
    config_path = session / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {}
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    finding_path = out / "finding.json"
    body_path = out / "body.md"
    finding_path.write_text(json.dumps(finding), encoding="utf-8")
    body_path.write_text(render_bug_body(finding, config), encoding="utf-8")
    gaps = pack_gaps(finding, config)
    deployment = infer_deployment(finding, config)
    release = infer_release_label(finding, config)
    hits = scan_sensitive(json.dumps(finding))
    sensitive = [hit for hit in hits if hit != "security_issue"]
    security = {
        "issue": "security_issue" in hits,
        "hints": scan_security_hints(json.dumps(finding)),
    }
    needs_input = bool(
        gaps or deployment.status == "ask" or release.status == "ask" or sensitive
    )
    return _emit(
        {
            "finding": str(finding_path),
            "body": str(body_path),
            "config": str(config_path) if config_path.exists() else None,
            "pack_gaps": gaps,
            "deployment": {
                "status": deployment.status,
                "label": deployment.label,
                "hint": deployment.hint,
            },
            "release": {
                "status": release.status,
                "label": release.label,
                "hint": release.hint,
            },
            "sensitive": sensitive,
            "security": security,
        },
        EXIT_ASK if needs_input else EXIT_OK,
    )


def _cmd_check_pack(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding)
    config = _read_json(args.config) if args.config else {}
    if not isinstance(finding, dict) or not isinstance(config, dict):
        return _fail("finding and config must be JSON objects")
    gaps = pack_gaps(finding, config)
    return _emit(
        {"thin": bool(gaps), "gaps": gaps},
        EXIT_ASK if gaps else EXIT_OK,
    )


GAP_HELP = (
    ("sensitive:", "Human confirms the flagged text is UI wording, not a customer ID; then pass --sensitive-ok."),
    ("security_issue:", "File in elastic/security-team, or the human confirms it is not a vulnerability or secret (--security-ok). --sensitive-ok never unlocks this."),
    ("wip_or_limitation", "Ask the human whether to file anyway; only on 'file anyway' pass --wip-ok."),
    ("media_review", "Human confirms every screenshot/recording is clean; then pass --media-ok."),
)


def _gap_help(gaps: list[str]) -> dict[str, str]:
    return {
        gap: text
        for gap in gaps
        for prefix, text in GAP_HELP
        if gap.startswith(prefix)
    }


def _cmd_check_draft(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding) if args.finding else {}
    config = _read_json(args.config) if args.config else {}
    if not isinstance(finding, dict) or not isinstance(config, dict):
        return _fail("finding and config must be JSON objects")
    body = _read_text(args.body)
    labels = [name.strip() for name in (args.labels or "").split(",") if name.strip()]
    labels.extend(str(name).strip() for name in (args.label or []) if str(name).strip())
    title = _optional(args.title)
    action = args.action or ("create" if title else None)
    if action is None:
        return _fail("pass --title for a create check, or --action comment for a comment/reopen")
    gaps = check_draft(
        body=body,
        title=title,
        finding=finding,
        config=config,
        labels=labels or None,
        wip_ok=bool(args.wip_ok),
        sensitive_ok=bool(args.sensitive_ok),
        repo=args.repo,
        security_ok=bool(args.security_ok),
        media_ok=bool(args.media_ok),
        action=action,
    )
    return _emit(
        {
            "fileable": not gaps,
            "gaps": gaps,
            "help": _gap_help(gaps),
            "hints": scan_security_hints(body, title or "", json.dumps(finding)),
        },
        EXIT_ASK if gaps else EXIT_OK,
    )


def _cmd_scan_wip(args: argparse.Namespace) -> int:
    texts: list[str] = []
    if args.finding:
        texts.append(_read_text(args.finding))
    if args.body:
        texts.append(_read_text(args.body))
    if args.text:
        texts.append(args.text)
    hits = scan_wip(*texts)
    return _emit(
        {"hits": hits},
        EXIT_ASK if hits else EXIT_OK,
    )


def _cmd_scan_sensitive(args: argparse.Namespace) -> int:
    texts: list[str] = []
    if args.finding:
        texts.append(_read_text(args.finding))
    if args.body:
        texts.append(_read_text(args.body))
    if args.text:
        texts.append(args.text)
    hits = scan_sensitive(*texts)
    return _emit(
        {"hits": hits, "hints": scan_security_hints(*texts)},
        EXIT_ASK if hits else EXIT_OK,
    )


def _cmd_render_body(args: argparse.Namespace) -> int:
    finding = _read_json(args.finding)
    config = _read_json(args.config) if args.config else {}
    body = render_bug_body(finding, config)
    if args.out:
        Path(args.out).write_text(body, encoding="utf-8")
    return _emit({"body": body})


def _cmd_write(args: argparse.Namespace) -> int:
    if args.action == "ask":
        return _fail(
            "action 'ask' must be resolved with the human before writing", EXIT_ASK
        )
    finding = _read_json(args.finding) if args.finding else {}
    config = _read_json(args.config) if args.config else {}
    if args.finding and not isinstance(finding, dict):
        return _fail("finding must be a JSON object")
    if args.config and not isinstance(config, dict):
        return _fail("config must be a JSON object")
    try:
        result = write_github(
            action=args.action,
            repo=args.repo,
            title=args.title,
            body=_read_text(args.body_file),
            labels=args.label,
            number=args.number,
            finding=finding if isinstance(finding, dict) else {},
            config=config if isinstance(config, dict) else {},
            security_ok=bool(args.security_ok),
            marker_meta={
                "agent": args.agent or "",
                "model": args.model or "",
                "run": uuid.uuid4().hex[:12],
            },
        )
    except CreateFailed as error:
        return _fail(str(error))
    except PartialWrite as error:
        payload = {"error": str(error), "number": error.number}
        if error.url:
            payload["url"] = error.url
        json.dump(payload, sys.stderr)
        sys.stderr.write("\n")
        return EXIT_FAIL
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
    try:
        result = upload_evidence(repo=args.repo, files=args.file, token=token)
    except RuntimeError as error:
        return _fail(str(error))
    return _emit(
        {
            "uploaded": [{"path": path, "url": url} for path, url in result.uploaded],
            "leftovers": [
                {"path": path, "reason": reason} for path, reason in result.leftovers
            ],
        }
    )


def _uploaded_pairs(payload: object) -> list:
    entries = payload.get("uploaded", payload) if isinstance(payload, dict) else payload
    if not isinstance(entries, list):
        raise ValueError('embed-uploads --map must be a list or {"uploaded": [...]}')
    for entry in entries:
        if not isinstance(entry, dict) or "path" not in entry or "url" not in entry:
            raise ValueError(
                'each embed-uploads --map entry must be {"path": ..., "url": ...} '
                "(use the output of `upload`)"
            )
    return [(str(entry["path"]), str(entry["url"])) for entry in entries]


def _cmd_embed_uploads(args: argparse.Namespace) -> int:
    body = embed_uploads(_read_text(args.body), _uploaded_pairs(_read_json(args.map)))
    if args.out:
        Path(args.out).write_text(body, encoding="utf-8")
    return _emit({"body": body})


def _build_parser() -> argparse.ArgumentParser:
    parser = _Parser(
        prog="file-bug.py",
        description="Compose file_bug.py into the subcommands the skill calls.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    decide = subparsers.add_parser(
        "decide",
        help="create if no matches, otherwise ask (human picks create / comment / reopen)",
        description="create if no matches, otherwise ask (human picks create / comment / reopen)",
    )
    decide.add_argument(
        "--matches",
        required=True,
        help='JSON file holding {"matches": [...]}, or - to read stdin',
    )
    decide.set_defaults(handler=_cmd_decide)

    search = subparsers.add_parser(
        "search",
        help="Run the full duplicate search (issues + open PRs, split in:title/in:body) and decide",
        description=(
            "Runs the token alone, token plus words with in:title and in:body, and plain-language "
            "words split in:title / in:body, on issues and open PRs, then decides. Exit 0 create, "
            "2 ask (candidates), 1 on any gh failure (never treated as an empty result)."
        ),
    )
    search.add_argument("--repo", required=True)
    search.add_argument("--token", default=None, help="Distinctive identifier, e.g. an error name")
    search.add_argument("--words", default="", help="Other distinctive words")
    search.add_argument("--screen", default=None, help="Plain-language screen or control words")
    search.set_defaults(handler=_cmd_search)

    prepare = subparsers.add_parser(
        "prepare",
        help="Path B: parse-findings, pick one finding, check-pack, infer-*, scan-sensitive, render-body",
        description=(
            "Runs the Path B collect pipeline and writes finding.json and body.md to --out-dir. "
            "Exit 2 when something needs the human (pack gaps, deployment/release ask, sensitive hits)."
        ),
    )
    prepare.add_argument("--session-dir", required=True)
    prepare.add_argument("--out-dir", required=True)
    prepare.add_argument("--title", default=None)
    prepare.add_argument("--index", type=int, default=None, help="1-based index into fileable findings")
    prepare.set_defaults(handler=_cmd_prepare)

    labels = subparsers.add_parser("validate-labels", help="Keep only labels that exist")
    labels.add_argument("--labels", required=True, help="Comma-separated label names")
    labels.add_argument(
        "--catalog",
        default=None,
        help="`gh label list --json name` output, or - to read stdin",
    )
    labels.add_argument(
        "--repo",
        default=None,
        help="Search each label with `gh label list --search` (no 1000 cap)",
    )
    labels.set_defaults(handler=_cmd_validate_labels)

    infer = subparsers.add_parser("infer-team", help="Infer a Team:* label")
    infer.add_argument("--area", default=None)
    infer.add_argument("--slug", default=None)
    infer.add_argument("--route", default=None)
    infer.add_argument("--knowledge", required=True, help="security-domain-knowledge.md path")
    infer.set_defaults(handler=_cmd_infer_team)

    title = subparsers.add_parser("format-title", help="Build [<team name>] [Bug] symptom")
    title.add_argument("--label", required=True, help="Team:* label or display name")
    title.add_argument("--symptom", required=True)
    title.set_defaults(handler=_cmd_format_title)

    search = subparsers.add_parser(
        "parse-search", help="Turn gh search JSON into matches.json"
    )
    search.add_argument(
        "--input",
        required=True,
        help="`gh search issues --json` output, or - for stdin",
    )
    search.set_defaults(handler=_cmd_parse_search)

    deploy = subparsers.add_parser(
        "infer-deployment", help="ECH / serverless / both, or ask"
    )
    deploy.add_argument("--config", default=None)
    deploy.add_argument("--finding", default=None)
    deploy.set_defaults(handler=_cmd_infer_deployment)

    release = subparsers.add_parser(
        "infer-release", help="Map Version to a vX.Y.Z label, or ask"
    )
    release.add_argument("--config", default=None)
    release.add_argument("--finding", default=None)
    release.set_defaults(handler=_cmd_infer_release)

    from_findings = subparsers.add_parser(
        "from-findings", help="Pick one finding from parse-findings JSONL"
    )
    from_findings.add_argument("--jsonl", required=True)
    from_findings.add_argument(
        "--index",
        type=int,
        default=None,
        help="1-based index into fileable findings (skips Observation)",
    )
    from_findings.add_argument("--title", default=None)
    from_findings.add_argument(
        "--out", default=None, help="Write the bare finding JSON to this path"
    )
    from_findings.set_defaults(handler=_cmd_from_findings)

    check = subparsers.add_parser(
        "check-pack", help="List missing required / always-ask fields"
    )
    check.add_argument("--finding", required=True)
    check.add_argument("--config", default=None)
    check.set_defaults(handler=_cmd_check_pack)

    draft = subparsers.add_parser(
        "check-draft", help="Fileable-bar gaps on a draft body"
    )
    draft.add_argument("--finding", default=None)
    draft.add_argument("--config", default=None)
    draft.add_argument("--body", required=True, help="Draft markdown path, or -")
    draft.add_argument("--title", default=None)
    draft.add_argument(
        "--labels",
        default=None,
        help="Comma-separated labels that will be applied on create",
    )
    draft.add_argument(
        "--label",
        action="append",
        default=[],
        help="Repeatable label, same as write --label",
    )
    draft.add_argument(
        "--action",
        choices=("create", "comment"),
        default=None,
        help="create (needs --title) or comment (comment/reopen); required when --title is omitted",
    )
    draft.add_argument(
        "--wip-ok",
        action="store_true",
        help="Human said file anyway after a draft/WIP or known-limitation hit",
    )
    draft.add_argument(
        "--sensitive-ok",
        action="store_true",
        help="Human confirmed flagged Cases UI text / similar is not a customer ID",
    )
    draft.add_argument(
        "--repo",
        default="elastic/kibana",
        help="Target repo; a security_issue hit is a gap unless this is elastic/security-team",
    )
    draft.add_argument(
        "--security-ok",
        action="store_true",
        help="Human confirmed a security_issue hit is not a vulnerability or secret",
    )
    draft.add_argument(
        "--media-ok",
        action="store_true",
        help="Human confirmed every screenshot/recording has no real customer or host data",
    )
    draft.set_defaults(handler=_cmd_check_draft)

    wip = subparsers.add_parser(
        "scan-wip", help="Flag draft/WIP PRs and known/intentional limitations"
    )
    wip.add_argument("--finding", default=None)
    wip.add_argument("--body", default=None)
    wip.add_argument("--text", default=None)
    wip.set_defaults(handler=_cmd_scan_wip)

    sensitive = subparsers.add_parser(
        "scan-sensitive", help="Flag emails, case IDs, NDA/customer wording, security_issue"
    )
    sensitive.add_argument("--finding", default=None)
    sensitive.add_argument("--body", default=None)
    sensitive.add_argument("--text", default=None)
    sensitive.set_defaults(handler=_cmd_scan_sensitive)

    render = subparsers.add_parser(
        "render-body", help="Render the file-bug template"
    )
    render.add_argument("--finding", required=True, help="Finding JSON path, or - for stdin")
    render.add_argument("--config", default=None, help="Session config JSON path")
    render.add_argument("--out", default=None, help="Write the rendered markdown to this path")
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
    write.add_argument("--finding", default=None, help="Finding JSON; Path B stamps the tester label")
    write.add_argument("--config", default=None)
    write.add_argument("--agent", default=None, help="Agent running the skill (claude-code, codex, cursor), for the hidden marker")
    write.add_argument("--model", default=None, help="Model name, for the hidden marker")
    write.add_argument(
        "--security-ok",
        action="store_true",
        help="Human confirmed a security_issue hit is not a vulnerability; allows elastic/kibana",
    )
    write.set_defaults(handler=_cmd_write)

    upload = subparsers.add_parser("upload", help="Upload evidence to user-attachments")
    upload.add_argument("--repo", required=True)
    upload.add_argument("--file", action="append", required=True)
    upload.set_defaults(handler=_cmd_upload)

    embed = subparsers.add_parser(
        "embed-uploads",
        help="Replace local evidence paths with ![name](url) for images, <video> for video",
    )
    embed.add_argument("--body", required=True)
    embed.add_argument("--map", required=True, help="upload JSON or {\"uploaded\":[...]}")
    embed.add_argument("--out", default=None, help="Write the embedded markdown body to this path")
    embed.set_defaults(handler=_cmd_embed_uploads)

    return parser


def main(argv: list | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except (
        OSError,
        json.JSONDecodeError,
        KeyError,
        TypeError,
        ValueError,
        RuntimeError,
    ) as error:
        return _fail(f"{type(error).__name__}: {error}")


if __name__ == "__main__":
    sys.exit(main())
