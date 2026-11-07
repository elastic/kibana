#!/usr/bin/env python3
"""Sync recent real Google agent runs into local Elastic without a background process."""

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

from infra.manage import storage_bytes

ROOT = Path(__file__).resolve().parent
from demo_config import PROJECT, ACCOUNT, GCLOUD, NODE, REPO, PYTHON, require_cloud_configuration
STATE = ROOT / "infra/state" / PROJECT
IMPORTER = "x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_google_adk_runs.ts"
MARKER = ".managed-elastic-sync.json"
MAX_RUNS = 50
MAX_RESOURCE_BYTES = 32768
UUID = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$")
SHA256 = re.compile(r"^[a-f0-9]{64}$")


def date(value):
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Evidence timestamps must include a timezone")
    return parsed.astimezone(dt.timezone.utc)


def utc(value):
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(path, limit=1024 * 1024):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > limit:
        raise ValueError(f"Expected a bounded regular evidence file: {path.name}")
    return json.loads(path.read_text())


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(json.dumps(value, indent=2) + "\n")
    path.chmod(0o600)


def select_runs(state, now, requested=()):
    """Choose only recent invocation receipts from this exact deployed service."""
    resources = read_json(state / "resources.json")
    if resources.get("project_id") != PROJECT or not resources.get("service_url"):
        raise ValueError("Expected the existing example-ei-project deployment state")
    paths = sorted((state / "invocations").glob("*.json"))
    if len(paths) > 1000:
        raise ValueError("Invocation receipt limit exceeded; archive old receipts before syncing")
    cutoff = now - dt.timedelta(hours=24)
    runs = {}
    for path in paths:
        receipt = read_json(path)
        run = receipt.get("response", {})
        run_id = run.get("run_id", "")
        if not isinstance(run_id, str) or not UUID.fullmatch(run_id):
            raise ValueError(f"Invalid native run ID in {path.name}")
        if receipt.get("service_url") != resources["service_url"]:
            raise ValueError("Invocation receipt belongs to a different service")
        if run.get("agent", {}).get("provider") != "google_adk":
            raise ValueError("Invocation receipt is not a Google ADK run")
        started = date(run["started_at"])
        if not cutoff <= started <= now:
            continue
        if run_id in runs and runs[run_id] != run:
            raise ValueError("Conflicting invocation receipts for the same run ID")
        runs[run_id] = run
    if requested:
        if any(not UUID.fullmatch(run_id) for run_id in requested):
            raise ValueError("Pass exact native UUID run IDs")
        missing = sorted(set(requested) - runs.keys())
        if missing:
            raise ValueError("Requested runs are missing from recent local invocation receipts")
        runs = {run_id: runs[run_id] for run_id in set(requested)}
    selected = sorted(runs.values(), key=lambda run: (date(run["started_at"]), run["run_id"]))
    if len(selected) > MAX_RUNS:
        raise ValueError("More than 50 recent runs; select a bounded set with --run-id")
    return selected


def export_window(runs, state, now):
    """Include exact consumed-document edits when they fit the 24-hour audit window."""
    cutoff = now - dt.timedelta(hours=24)
    start = min(date(run["started_at"]) for run in runs) - dt.timedelta(minutes=10)
    versions = {
        (resource.get("uri"), resource.get("generation"), resource.get("sha256"))
        for run in runs for call in run.get("calls", [])
        if isinstance(resource := call.get("resource"), dict)
    }
    changes = sorted((state / "changes").glob("*/change.json"))
    if len(changes) > 500:
        raise ValueError("Change receipt limit exceeded")
    for path in changes:
        change = read_json(path, 32768)
        key = (change.get("resource"), change.get("after", {}).get("generation"), change.get("after_sha256"))
        if key in versions:
            start = min(start, date(change["recorded_at"]) - dt.timedelta(minutes=1))
    return max(start, cutoff), now


def run_checked(command, label, cwd=ROOT, secret_output=False):
    env = os.environ.copy()
    env.setdefault("CLOUDSDK_PYTHON", PYTHON)
    env.setdefault("NODE_OPTIONS", "--max-old-space-size=768")
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, timeout=600, check=False)
    if result.returncode:
        raise RuntimeError(f"{label} failed (exit {result.returncode}); private output was not logged")
    if not secret_output and result.stdout:
        print(result.stdout.decode(errors="replace").strip(), flush=True)
    return result.stdout


def verify_resources(runs, directory):
    token = None
    cached = {}
    reports, unavailable = [], []
    buckets = {f"{PROJECT}-ei-agent-demo-{kind}" for kind in ("support", "customer", "export")}
    for run in runs:
        calls = run.get("calls", [])
        if len(calls) > 20:
            raise ValueError("Run exceeds the 20-tool evidence bound")
        for call in calls:
            resource = call.get("resource")
            if not isinstance(resource, dict):
                continue
            generation, expected = resource.get("generation", ""), resource.get("sha256", "")
            uri = resource.get("uri")
            # Storage uploads record a canonical URI; reads additionally include bucket/object metadata.
            match = re.fullmatch(r"gs://([^/]+)/(.{1,2048})", uri) if isinstance(uri, str) else None
            bucket, name = match.groups() if match else (None, None)
            if (bucket not in buckets or not name or any(ord(char) < 32 for char in name)
                    or "?" in name or "#" in name
                    or ("bucket" in resource and resource["bucket"] != bucket)
                    or ("object" in resource and resource["object"] != name)
                    or not re.fullmatch(r"[0-9]{1,30}", generation)
                    or not SHA256.fullmatch(expected)):
                raise ValueError("Resource readback is restricted to this demo's exact object versions")
            key = (uri, generation)
            if key not in cached:
                if token is None:
                    token = run_checked([GCLOUD, "--project", PROJECT, "--account", ACCOUNT,
                                         "auth", "print-access-token"], "Google authentication", secret_output=True).decode().strip()
                query = urllib.parse.urlencode({"alt": "media", "generation": generation})
                url = (f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/"
                       + urllib.parse.quote(name, safe="") + "?" + query)
                try:
                    cached[key] = storage_bytes(urllib.request.Request(url, headers={
                        "Authorization": f"Bearer {token}"}), MAX_RESOURCE_BYTES)
                except RuntimeError:
                    cached[key] = None
            content = cached[key]
            if content is None:
                unavailable.append({"run_id": run["run_id"], "tool_call_id": call["id"],
                                    "uri": uri, "generation": generation, "status": "readback_unavailable"})
                continue
            observed = hashlib.sha256(content).hexdigest()
            if observed != expected:
                raise ValueError("Exact resource-generation readback hash conflicts with the agent's recorded hash")
            path = directory / "resource-versions" / f"{expected}.json"
            path.parent.mkdir(mode=0o700, exist_ok=True)
            path.write_bytes(content)
            path.chmod(0o600)
            reports.append({"run_id": run["run_id"], "tool_call_id": call["id"], "uri": uri,
                            "generation": generation, "expected_sha256": expected,
                            "readback_sha256": observed, "matches": True,
                            "file": str(path.relative_to(directory))})
    dump(directory / "resource_verification.json", {
        "verified_at": utc(dt.datetime.now(dt.timezone.utc)),
        "method": "Independent Google Storage generation-pinned readback under authenticated verification account",
        "resources": reports, "unavailable": unavailable})
    return len(reports), len(unavailable)


def publish_bundle(staging, destination):
    backup = destination.with_name(".elastic-sync-previous")
    for path in (destination, backup):
        if path.exists() and (path.is_symlink() or read_json(path / MARKER).get("managed_by") != "sync_to_elastic"):
            raise ValueError("Refusing to replace an unrecognized export directory")
    if backup.exists():
        shutil.rmtree(backup)
    if destination.exists():
        destination.rename(backup)
    staging.rename(destination)
    if backup.exists():
        shutil.rmtree(backup)


def acquire_sync_lock(lock, wait_seconds):
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except BlockingIOError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(min(0.5, max(0, deadline - time.monotonic())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true", help="One bounded sync; no persistent process (the default)")
    parser.add_argument("--run-id", action="append", default=[], help="Optional exact recent native run UUID; repeatable")
    parser.add_argument("--dry-run", action="store_true", help="Export and verify real cloud evidence without indexing it")
    parser.add_argument("--wait-lock-seconds", type=int, default=0, help="Wait up to 120 seconds for another bounded import")
    args = parser.parse_args()
    require_cloud_configuration()
    if not 0 <= args.wait_lock_seconds <= 120:
        parser.error("--wait-lock-seconds must be between 0 and 120")
    try:
        with (STATE / ".elastic-sync.lock").open("a") as lock:
            os.chmod(STATE / ".elastic-sync.lock", 0o600)
            acquire_sync_lock(lock, args.wait_lock_seconds)
            now = dt.datetime.now(dt.timezone.utc)
            runs = select_runs(STATE, now, args.run_id)
            if not runs:
                print("No locally invoked Google agent runs in the last 24 hours. Use run_in_elastic.sh first.")
                return 0
            start, end = export_window(runs, STATE, now)
            exports = STATE / "exports"
            exports.mkdir(exist_ok=True, mode=0o700)
            staging = Path(tempfile.mkdtemp(prefix=".elastic-sync-staging-", dir=exports))
            dump(staging / MARKER, {"managed_by": "sync_to_elastic", "project": PROJECT})
            command = [str(ROOT / "demo.sh"), "export", "--start", utc(start), "--end", utc(end),
                       "--output", str(staging)]
            for run in runs:
                command.extend(["--run-id", run["run_id"]])
            print(f"Exporting {len(runs)} real runs and bounded audit evidence…", flush=True)
            run_checked(command, "Bounded cloud export")
            exported = [read_json(staging / f"run-{run['run_id']}.json") for run in runs]
            verified, missing = verify_resources(exported, staging)
            run_checked([sys.executable, str(ROOT / "verify_evidence.py"), "--export", str(staging),
                         "--state", str(STATE), "--output", str(staging / "verification.json")], "Evidence verification")
            destination = exports / "elastic_sync"
            publish_bundle(staging, destination)
            pinned_node = (REPO / ".nvmrc").read_text().strip().removeprefix("v")
            actual_node = run_checked([str(NODE), "--version"], "Node version check", secret_output=True).decode().strip().removeprefix("v")
            if not NODE.is_file() or actual_node != pinned_node:
                raise ValueError("Use the repository-pinned Node runtime via EI_NODE_BINARY")
            command = [str(NODE), "-r", "@kbn/setup-node-env", IMPORTER,
                       "--export-dir", str(destination), "--state-dir", str(STATE), "--project", PROJECT]
            if args.dry_run:
                command.append("--dry-run")
            run_checked(command, "Google evidence import", cwd=REPO)
            print(f"Exact resource versions verified: {verified}; unavailable: {missing}.")
            print(f"Evidence bundle: {destination}")
            print("Audit logs can arrive late; rerun this sync to enrich the same records without duplicating sessions.")
            if not args.dry_run:
                print("The existing AI policy monitor evaluates newly imported calls after saved-policy activation.")
            return 0
    except (OSError, ValueError, RuntimeError, KeyError, TypeError, subprocess.TimeoutExpired) as error:
        print(f"Google-to-Elastic sync stopped: {type(error).__name__}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
