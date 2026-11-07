#!/usr/bin/env python3
"""Provision one bucket-scoped response identity; never modify the agent's grant.

A short-lived impersonated token is returned only to callers or a private file.
It must be stored as an encrypted Elastic connector secret, never in workflow YAML.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
DEMO_ROOT = ROOT.parent
sys.path.insert(0, str(DEMO_ROOT))
from demo_config import PROJECT, ACCOUNT, BUCKET, GCLOUD, PYTHON, require_cloud_configuration
ACCOUNT_ID = "ei-agent-demo-response"
SERVICE_ACCOUNT = f"{ACCOUNT_ID}@{PROJECT}.iam.gserviceaccount.com"
ROLE_ID = "eiAgentDemoBucketResponse"
ROLE_NAME = f"projects/{PROJECT}/roles/{ROLE_ID}"
PERMISSIONS = {"storage.buckets.getIamPolicy", "storage.buckets.setIamPolicy"}
MARKER = "Managed by entity-intelligence-native-response"
JOURNAL = ROOT / "response_identity.json"


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, value: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")
    os.chmod(temporary, 0o600)
    temporary.replace(path)


def gc(*args, raw=False, optional=False):
    """Use an explicit account/project; do not echo secret-bearing command output."""
    command = [GCLOUD, *args, f"--project={PROJECT}", f"--account={ACCOUNT}", "--quiet"]
    if not raw:
        command.append("--format=json")
    result = subprocess.run(command, env={**os.environ, "CLOUDSDK_PYTHON": os.environ.get("CLOUDSDK_PYTHON", PYTHON)},
                            text=True, capture_output=True, check=False)
    if result.returncode:
        if optional and re.search(r"NOT_FOUND|not found|does not exist|404", result.stderr, re.I):
            return None
        # stderr from auth commands can include identifiers; suppress all output.
        raise RuntimeError(f"Google command failed ({' '.join(args[:3])}); exit={result.returncode}")
    return result.stdout.strip() if raw else json.loads(result.stdout or "{}")


def load_journal(path=JOURNAL):
    if not path.exists():
        return {"managed_by": "entity-intelligence-native-response", "project_id": PROJECT,
                "service_account": SERVICE_ACCOUNT, "role": ROLE_NAME, "bucket": BUCKET,
                "created": {}, "started_at": now()}
    value = json.loads(path.read_text())
    expected = {"managed_by": "entity-intelligence-native-response", "project_id": PROJECT,
                "service_account": SERVICE_ACCOUNT, "role": ROLE_NAME, "bucket": BUCKET}
    if any(value.get(key) != expected_value for key, expected_value in expected.items()):
        raise ValueError("Response identity journal does not match the fixed demo scope")
    return value


def require_demo_scope():
    path = DEMO_ROOT / "infra/state" / PROJECT / "resources.json"
    value = json.loads(path.read_text())
    if (value.get("managed_by") != "entity-intelligence-demo" or value.get("project_id") != PROJECT
            or value.get("buckets", {}).get("export") != BUCKET
            or BUCKET not in value.get("resources_created", {}).get("buckets", [])):
        raise ValueError("Refusing a bucket without this demo's exact provisioning record")
    project = gc("projects", "describe", PROJECT)
    resource = gc("storage", "buckets", "describe", f"gs://{BUCKET}", "--raw")
    if (str(resource.get("project_number", resource.get("projectNumber"))) != str(project["projectNumber"])
            or resource.get("labels", {}).get("ei_demo") != "agent_service_account"
            or resource.get("name") != BUCKET):
        raise ValueError("Export bucket does not match this project's managed demo")
    return project, resource


def validate_account(resource: dict, journal: dict):
    if (not journal.get("created", {}).get("service_account")
            or resource.get("description") != MARKER
            or resource.get("email") != SERVICE_ACCOUNT
            or resource.get("projectId") != PROJECT
            or (journal.get("unique_id") and resource.get("uniqueId") != journal["unique_id"])):
        raise ValueError("Refusing existing unmanaged or replaced response service account")


def validate_role(resource: dict, journal: dict):
    if (not journal.get("created", {}).get("role")
            or resource.get("name") != ROLE_NAME or resource.get("description") != MARKER
            or resource.get("deleted")
            or set(resource.get("includedPermissions", [])) != PERMISSIONS):
        raise ValueError("Refusing existing unmanaged or expanded response IAM role")


def setup():
    project, resource = require_demo_scope()
    journal = load_journal()
    account = gc("iam", "service-accounts", "describe", SERVICE_ACCOUNT, optional=True)
    role = gc("iam", "roles", "describe", ROLE_ID, optional=True)
    # Check both collisions before creating or granting anything.
    if account:
        validate_account(account, journal)
    if role:
        validate_role(role, journal)
    write_json(JOURNAL, journal)
    if not account:
        account = gc("iam", "service-accounts", "create", ACCOUNT_ID,
                     "--display-name=Entity Intelligence native response", f"--description={MARKER}")
        journal["created"]["service_account"] = now()
        journal["unique_id"] = account["uniqueId"]
        write_json(JOURNAL, journal)
    if not role:
        role = gc("iam", "roles", "create", ROLE_ID, "--title=EI demo bucket IAM response",
                  f"--description={MARKER}", f"--permissions={','.join(sorted(PERMISSIONS))}", "--stage=GA")
        journal["created"]["role"] = now()
        write_json(JOURNAL, journal)
    # Enabling IAM Credentials permits short-lived impersonation without a key.
    gc("services", "enable", "iamcredentials.googleapis.com")
    gc("storage", "buckets", "add-iam-policy-binding", f"gs://{BUCKET}",
       f"--member=serviceAccount:{SERVICE_ACCOUNT}", f"--role={ROLE_NAME}")
    gc("iam", "service-accounts", "add-iam-policy-binding", SERVICE_ACCOUNT,
       f"--member=user:{ACCOUNT}", "--role=roles/iam.serviceAccountTokenCreator", "--condition=None")
    bucket_policy = gc("storage", "buckets", "get-iam-policy", f"gs://{BUCKET}")
    account_policy = gc("iam", "service-accounts", "get-iam-policy", SERVICE_ACCOUNT)
    expected_grant = any(binding.get("role") == ROLE_NAME and not binding.get("condition")
                         and f"serviceAccount:{SERVICE_ACCOUNT}" in binding.get("members", [])
                         for binding in bucket_policy.get("bindings", []))
    expected_impersonation = any(binding.get("role") == "roles/iam.serviceAccountTokenCreator"
                                and not binding.get("condition")
                                and f"user:{ACCOUNT}" in binding.get("members", [])
                                for binding in account_policy.get("bindings", []))
    if not expected_grant or not expected_impersonation:
        raise RuntimeError("Response role or impersonation grant was not verified")
    journal.update(configured_at=now(), project_number=str(project["projectNumber"]),
                   permissions=sorted(PERMISSIONS), impersonator=ACCOUNT,
                   credential_type="short_lived_service_account_impersonation_no_key",
                   token_lifetime_seconds=3600,
                   bucket_policy=bucket_policy, service_account_policy=account_policy,
                   constraints={"grant_scope": f"gs://{BUCKET}", "no_project_role_binding": True,
                                "no_object_read_or_write_permission": True,
                                "note": "IAM administration can alter permissions within this one demo bucket."})
    write_json(JOURNAL, journal)
    return journal


def mint_access_token():
    """For encrypted connector provisioning; never print or log the returned token."""
    journal = load_journal()
    if not journal.get("configured_at"):
        raise ValueError("Run setup and verify the scoped identity before minting credentials")
    token = gc("auth", "print-access-token", f"--impersonate-service-account={SERVICE_ACCOUNT}",
               "--lifetime=3600s", raw=True)
    if not token or any(character.isspace() for character in token):
        raise RuntimeError("Google returned an invalid credential")
    return token


def write_private_token(path: Path):
    if not path.is_absolute():
        raise ValueError("Token output must be an absolute private path")
    token = mint_access_token()
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        handle.write(token)
    return {"credential_file": str(path), "issued_at": now(), "lifetime_seconds": 3600,
            "service_account": SERVICE_ACCOUNT, "printed_credential": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("setup")
    mint = commands.add_parser("mint-token")
    mint.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    require_cloud_configuration()
    if args.command == "setup":
        result = setup()
        print(json.dumps({key: result[key] for key in ["service_account", "role", "bucket", "permissions", "configured_at"]}, indent=2))
    else:
        print(json.dumps(write_private_token(args.output), indent=2))


if __name__ == "__main__":
    main()
