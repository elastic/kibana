"""Explicit configuration for the source-only Google demonstration."""

import hashlib
import os
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent
PROJECT = os.environ.get("EI_GOOGLE_PROJECT_ID", "example-ei-project")
ACCOUNT = os.environ.get("EI_GOOGLE_ACCOUNT", "operator@example.com")
SERVICE = "ei-agent-demo"
BUCKET = f"{PROJECT}-ei-agent-demo-export"
RUNTIME = f"ei-agent-demo-runtime@{PROJECT}.iam.gserviceaccount.com"
RESPONSE_PRINCIPAL = f"ei-agent-demo-response@{PROJECT}.iam.gserviceaccount.com"
AGENT_ID = "google-adk-" + hashlib.sha256(f"{PROJECT}:{SERVICE}".encode()).hexdigest()[:32]
POLICY_ID = os.environ.get("EI_GOOGLE_POLICY_ID", "00000000-0000-4000-8000-000000000001")
GCLOUD = os.environ.get("EI_GCLOUD_BINARY") or shutil.which("gcloud") or "gcloud"
NODE = Path(os.environ.get("EI_NODE_BINARY") or shutil.which("node") or "node")
PYTHON = os.environ.get("EI_PYTHON_BINARY", sys.executable)
REPO = next(
    (parent for parent in ROOT.parents if (parent / ".nvmrc").is_file()),
    Path(os.environ.get("KIBANA_SOURCE", "/path/to/kibana")),
)


def require_cloud_configuration():
    if (not os.environ.get("EI_GOOGLE_PROJECT_ID") or PROJECT == "example-ei-project"
            or not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", PROJECT)):
        raise ValueError("Set EI_GOOGLE_PROJECT_ID to an explicitly selected disposable test project")
    if (not os.environ.get("EI_GOOGLE_ACCOUNT") or ACCOUNT == "operator@example.com"
            or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", ACCOUNT)):
        raise ValueError("Set EI_GOOGLE_ACCOUNT to the authorized Google account for this project")


def require_response_configuration():
    require_cloud_configuration()
    if (not os.environ.get("EI_GOOGLE_POLICY_ID")
            or POLICY_ID == "00000000-0000-4000-8000-000000000001"
            or not re.fullmatch(r"[a-f0-9-]{36}", POLICY_ID)):
        raise ValueError("Set EI_GOOGLE_POLICY_ID to the actual saved restricted-lookup policy UUID")
