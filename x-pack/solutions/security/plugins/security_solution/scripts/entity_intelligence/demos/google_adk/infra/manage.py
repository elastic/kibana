#!/usr/bin/env python3
"""Explicit-project Google Cloud demo provisioning; stdlib + gcloud only."""

import argparse
import base64
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent / "app"
LABEL = {"ei_demo": "agent_service_account"}
SERVICE = "ei-agent-demo"
ROLE = "eiAgentDemoModelInvoker"
MODEL_PERMISSIONS = {"aiplatform.endpoints.predict", "serviceusage.services.use"}
APIS = ["run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com",
        "aiplatform.googleapis.com", "storage.googleapis.com", "iam.googleapis.com",
        "serviceusage.googleapis.com", "logging.googleapis.com"]
BASE_CASE = {"case_id": "CASE-001", "customer": "Example Customer A", "classification": "synthetic",
             "summary": "Example Customer A asks how to update their support contact.",
             "internal_notes": "Summarize the support request. Do not include customer reference data."}
CUSTOMER = {"customer": "Example Customer A", "reference": "DEMO-001",
            "classification": "confidential-demo", "synthetic": True}


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    path.chmod(0o600)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def storage_bytes(request, limit):
    """Use a fixed Google endpoint, bounded responses and credential-safe failures."""
    endpoint = urllib.parse.urlsplit(request.full_url)
    if endpoint.scheme != "https" or endpoint.netloc != "storage.googleapis.com":
        raise ValueError("Storage request must use the fixed Google API host")
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=45) as response:
            body = response.read(limit + 1)
    except urllib.error.HTTPError as error:
        # Do not echo server response bodies, headers, request objects or access tokens.
        raise RuntimeError(f"Storage API returned HTTP {error.code}") from None
    except urllib.error.URLError:
        raise RuntimeError("Storage API request failed before a usable response was received") from None
    if len(body) > limit:
        raise RuntimeError("Storage API response exceeded the evidence size limit")
    return body


def merge_storage_audit(policy):
    """Preserve unrelated IAM, etag, audit services and existing exemptions."""
    result = copy.deepcopy(policy)
    effective = {entry.get("logType") for service in policy.get("auditConfigs", [])
                 if service.get("service") in ["allServices", "storage.googleapis.com"]
                 for entry in service.get("auditLogConfigs", []) if not entry.get("exemptedMembers")}
    if {"DATA_READ", "DATA_WRITE"}.issubset(effective):
        return result
    services = result.setdefault("auditConfigs", [])
    storage = next((item for item in services if item.get("service") == "storage.googleapis.com"), None)
    if storage is None:
        storage = {"service": "storage.googleapis.com", "auditLogConfigs": []}
        services.append(storage)
    logs = storage.setdefault("auditLogConfigs", [])
    for kind in ["DATA_READ", "DATA_WRITE"]:
        if not any(item.get("logType") == kind for item in logs):
            logs.append({"logType": kind})
    return result


def bounded_window(start, end):
    dates = [dt.datetime.fromisoformat(value.replace("Z", "+00:00")) for value in (start, end)]
    if any(value.tzinfo is None for value in dates):
        raise ValueError("Use explicit UTC or timezone offsets in both timestamps")
    duration = (dates[1] - dates[0]).total_seconds()
    if not 0 < duration <= 86400:
        raise ValueError("Export window must be positive and at most 24 hours")
    return [value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z") for value in dates]


class Demo:
    def __init__(self, args):
        self.args = args
        if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", args.project):
            raise ValueError("Supply an explicit valid project ID (6–30 lowercase characters)")
        if not re.fullmatch(r"[^\s@]+@[^\s@]+", args.account):
            raise ValueError("Supply the exact authenticated account email")
        self.gcloud = args.gcloud or shutil.which("gcloud")
        if not self.gcloud:
            raise ValueError("gcloud is not installed; provide --gcloud /absolute/path/to/gcloud")
        self.project = args.project
        self.account = args.account
        self.region = args.region
        self.state_dir = ROOT / "state" / self.project
        self.state_path = self.state_dir / "resources.json"
        self.state = json.loads(self.state_path.read_text()) if self.state_path.exists() else {}
        self.runtime = f"ei-agent-demo-runtime@{self.project}.iam.gserviceaccount.com"
        self.builder = f"ei-agent-demo-builder@{self.project}.iam.gserviceaccount.com"
        self.buckets = {kind: f"{self.project}-ei-agent-demo-{kind}" for kind in ["support", "customer", "export", "evidence"]}
        if self.state.get("response", {}).get("control_bucket"):
            self.buckets["control"] = self.state["response"]["control_bucket"]

    def gc(self, *args, optional=False, raw=False):
        command = [self.gcloud, *args, f"--project={self.project}", f"--account={self.account}", "--quiet"]
        if not raw:
            command.append("--format=json")
        result = subprocess.run(command, text=True, capture_output=True, check=False)
        if result.returncode:
            if optional and re.search(r"NOT_FOUND|not found|does not exist|404|Cannot find service \[[^\]]+\]", result.stderr, re.I):
                return None
            # Never include stdout: authentication commands may contain a token.
            raise RuntimeError(f"gcloud {' '.join(args[:3])} failed: {result.stderr.strip()}")
        if raw:
            return result.stdout.strip()
        return json.loads(result.stdout) if result.stdout.strip() else {}

    def save(self):
        dump(self.state_path, self.state)

    def mark_created(self, kind, name):
        values = self.state.setdefault("resources_created", {}).setdefault(kind, [])
        if name not in values:
            values.append(name)
        self.save()

    def created(self, kind, name):
        return name in self.state.get("resources_created", {}).get(kind, [])

    def require_state(self):
        if self.state.get("project_id") != self.project or self.state.get("managed_by") != "entity-intelligence-demo":
            raise ValueError("No local provisioning record for this exact project; run provision first")

    def bind_project(self, member, role):
        self.gc("projects", "add-iam-policy-binding", self.project,
                f"--member={member}", f"--role={role}", "--condition=None")

    def file_command(self, value, callback):
        with tempfile.TemporaryDirectory(prefix="ei-gcp-") as temp:
            path = Path(temp) / "document.json"
            dump(path, value)
            return callback(path)

    def provision(self):
        args = self.args
        if not args.owner:
            raise ValueError("--owner is required: declare the accountable owner, separately from the deployer")
        if args.create_project and not args.billing_account:
            raise ValueError("A new project requires an explicit --billing-account")
        project = self.gc("projects", "describe", self.project, optional=True)
        if project is None:
            if not args.create_project:
                raise ValueError("Project does not exist; use --create-project and an explicit billing account")
            create_args = ["projects", "create", self.project, "--name=Entity Intelligence Agent Demo",
                           "--labels=ei_demo=agent_service_account"]
            if args.folder:
                create_args.append(f"--folder={args.folder}")
            elif args.organization:
                create_args.append(f"--organization={args.organization}")
            self.gc(*create_args)
            self.state = {"managed_by": "entity-intelligence-demo", "project_id": self.project,
                          "created_project": True, "created_at": now(), "deployer": self.account}
            self.save()
        elif not self.state:
            if not args.use_existing_project:
                raise ValueError("Project already exists; explicit --use-existing-project is required to adopt it")
            self.state = {"managed_by": "entity-intelligence-demo", "project_id": self.project,
                          "created_project": False, "created_at": now(), "deployer": self.account}
            self.save()
        billing = self.gc("billing", "projects", "describe", self.project)
        expected = f"billingAccounts/{args.billing_account}" if args.billing_account else None
        if billing.get("billingEnabled"):
            if expected and billing.get("billingAccountName") != expected:
                raise ValueError("Project is attached to a different billing account; will not change it")
        elif expected:
            self.gc("billing", "projects", "link", self.project, f"--billing-account={args.billing_account}")
        else:
            raise ValueError("Project has no active billing; supply its intended --billing-account")
        self.gc("services", "enable", *APIS)
        original = self.gc("projects", "get-iam-policy", self.project)
        if not (self.state_dir / "iam-before.json").exists():
            dump(self.state_dir / "iam-before.json", original)
        merged = merge_storage_audit(original)
        if merged != original:
            self.file_command(merged, lambda path: self.gc("projects", "set-iam-policy", self.project, str(path)))
            self.state["audit_configuration_added_at"] = now()
            self.save()
        for account_id, email, title in [("ei-agent-demo-runtime", self.runtime, "Entity Intelligence runtime"),
                                          ("ei-agent-demo-builder", self.builder, "Entity Intelligence build")]:
            existing = self.gc("iam", "service-accounts", "describe", email, optional=True)
            if existing is None:
                self.gc("iam", "service-accounts", "create", account_id, f"--display-name={title}",
                        "--description=Managed by entity-intelligence-demo")
                self.mark_created("service_accounts", email)
            elif not self.created("service_accounts", email) or existing.get("description") != "Managed by entity-intelligence-demo":
                raise ValueError(f"Refusing to reuse unmarked service account {email}")
            self.gc("iam", "service-accounts", "add-iam-policy-binding", email,
                    f"--member=user:{self.account}", "--role=roles/iam.serviceAccountUser", "--condition=None")
        role = self.gc("iam", "roles", "describe", ROLE, optional=True)
        if role is None:
            self.gc("iam", "roles", "create", ROLE, "--title=EI agent model invocation",
                    "--description=Managed by entity-intelligence-demo",
                    f"--permissions={','.join(sorted(MODEL_PERMISSIONS))}", "--stage=GA")
            self.mark_created("roles", ROLE)
        elif (not self.created("roles", ROLE) or role.get("description") != "Managed by entity-intelligence-demo"
              or set(role.get("includedPermissions", [])) != MODEL_PERMISSIONS):
            raise ValueError("Existing model invocation role has unexpected permissions; refusing to overwrite")
        self.bind_project(f"serviceAccount:{self.runtime}", f"projects/{self.project}/roles/{ROLE}")
        self.bind_project(f"serviceAccount:{self.builder}", "roles/run.builder")
        project = self.gc("projects", "describe", self.project)
        for kind, bucket in self.buckets.items():
            existing = self.gc("storage", "buckets", "describe", f"gs://{bucket}", optional=True)
            if existing is None:
                self.gc("storage", "buckets", "create", f"gs://{bucket}", f"--location={self.region}",
                        "--uniform-bucket-level-access", "--public-access-prevention",
                        "--default-storage-class=STANDARD")
                self.mark_created("buckets", bucket)
                self.gc("storage", "buckets", "update", f"gs://{bucket}",
                        "--update-labels=ei_demo=agent_service_account")
            elif (str(existing.get("project_number", existing.get("projectNumber", ""))) != str(project["projectNumber"])
                  or not self.created("buckets", bucket)):
                raise ValueError(f"Refusing to use bucket not marked as this project's demo: {bucket}")
            elif existing.get("labels", {}).get("ei_demo") != "agent_service_account":
                # Recover a previous create interrupted before its separate label update.
                self.gc("storage", "buckets", "update", f"gs://{bucket}", "--update-labels=ei_demo=agent_service_account")
            if kind in ["support", "customer", "control"]:
                self.gc("storage", "buckets", "update", f"gs://{bucket}", "--versioning")
                role_name = "roles/storage.objectViewer"
            else:
                role_name = "roles/storage.objectCreator"
            self.gc("storage", "buckets", "add-iam-policy-binding", f"gs://{bucket}",
                    f"--member=serviceAccount:{self.runtime}", f"--role={role_name}")
        runtime = self.gc("iam", "service-accounts", "describe", self.runtime)
        self.state.update({"project_number": str(project["projectNumber"]), "region": self.region,
                           "runtime_service_account": self.runtime, "runtime_unique_id": runtime["uniqueId"],
                           "builder_service_account": self.builder, "buckets": self.buckets,
                           "service": SERVICE, "model": args.model, "model_location": args.model_location})
        self.save()
        ownership_path = self.state_dir / "ownership.json"
        if ownership_path.exists():
            if json.loads(ownership_path.read_text())["accountable_owner"] != args.owner:
                raise ValueError("Ownership already recorded differently; preserve history and update explicitly")
        else:
            dump(ownership_path, {"service_account_email": self.runtime, "service_account_unique_id": runtime["uniqueId"],
                                  "accountable_owner": args.owner, "provenance": "operator_declared",
                                  "recorded_by": self.account, "effective_from": now(), "effective_to": None,
                                  "note": "Declared accountability; not proof of requesting, editing or execution"})
        self.seed_object("support", "cases/CASE-001.json", BASE_CASE)
        self.seed_object("customer", "customers/example-a.json", CUSTOMER)
        self.snapshot()
        print(f"Provisioned {self.project}; resource manifest: {self.state_path}")

    def seed_object(self, kind, name, content):
        uri = f"gs://{self.buckets[kind]}/{name}"
        if self.gc("storage", "objects", "describe", uri, optional=True) is None:
            self.file_command(content, lambda path: self.gc("storage", "cp", str(path), uri, "--if-generation-match=0", raw=True))

    def configure_response(self):
        self.require_state()
        if self.args.workflow_id != "workflow-ei-google-export-prevention-v1":
            raise ValueError("Response workflow must be the dedicated verified demo workflow")
        bucket = f"{self.project}-ei-agent-demo-control"
        project = self.gc("projects", "describe", self.project)
        existing = self.gc("storage", "buckets", "describe", f"gs://{bucket}", optional=True)
        if existing is None:
            self.gc("storage", "buckets", "create", f"gs://{bucket}", f"--location={self.region}",
                    "--uniform-bucket-level-access", "--public-access-prevention")
            self.mark_created("buckets", bucket)
            self.gc("storage", "buckets", "update", f"gs://{bucket}",
                    "--update-labels=ei_demo=agent_service_account")
        elif (not self.created("buckets", bucket)
              or str(existing.get("project_number", existing.get("projectNumber", ""))) != str(project["projectNumber"])
              or existing.get("labels", {}).get("ei_demo") != "agent_service_account"):
            raise ValueError("Refusing to adopt an unmarked response control bucket")
        self.gc("storage", "buckets", "add-iam-policy-binding", f"gs://{bucket}",
                f"--member=serviceAccount:{self.runtime}", "--role=roles/storage.objectViewer")
        self.buckets["control"] = bucket
        self.state["buckets"] = self.buckets
        self.state["response"] = {"enabled": True, "control_bucket": bucket,
                                  "workflow_id": self.args.workflow_id, "gate_timeout_seconds": 90,
                                  "configured_at": now(), "runtime_control_access": "read_only"}
        self.save()
        print("Response control bucket configured. Deploy to enable the tool gate.")

    def deploy(self):
        self.require_state()
        existing = self.gc("run", "services", "describe", SERVICE, f"--region={self.region}", optional=True)
        attempt = self.state.get("deployment_attempt", {})
        if existing and not self.created("services", SERVICE):
            labels = existing.get("metadata", {}).get("labels", {})
            runtime = existing.get("spec", {}).get("template", {}).get("spec", {}).get("serviceAccountName")
            if (attempt.get("resource_was_absent") and labels.get("ei_installation") == attempt.get("id")
                    and labels.get("ei_demo") == "agent_service_account" and runtime == self.runtime):
                # A failed first deploy can leave a not-ready service. Recover only our unpredictable attempt marker.
                self.mark_created("services", SERVICE)
        if existing and (not self.created("services", SERVICE)
                         or existing.get("metadata", {}).get("labels", {}).get("ei_demo") != "agent_service_account"):
            raise ValueError("Refusing to overwrite an unmarked existing Cloud Run service")
        source = Path(self.args.source).resolve() if self.args.source else APP
        if not (source / "Dockerfile").exists():
            raise ValueError(f"Expected the isolated agent source Dockerfile at {source}")
        audiences = self.args.oidc_audience
        if not audiences:
            token = self.gc("auth", "print-identity-token", raw=True)
            try:
                claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
                audience = claims.get("aud")
                if not isinstance(audience, str) or not audience:
                    raise ValueError("no audience")
                audiences = [audience]
            except (ValueError, IndexError, UnicodeDecodeError):
                raise ValueError("The CLI token has no usable audience; supply --oidc-audience for a configured Google OIDC client") from None
            # This only discovers the audience of locally issued credentials. The app verifies every signature.
        env = {"GOOGLE_CLOUD_PROJECT": self.project, "GOOGLE_CLOUD_LOCATION": self.state["model_location"],
               "GOOGLE_GENAI_USE_VERTEXAI": "true", "EI_MODEL": self.state["model"],
               "EI_SUPPORT_BUCKET": self.buckets["support"], "EI_CUSTOMER_BUCKET": self.buckets["customer"],
               "EI_EXPORT_BUCKET": self.buckets["export"], "EI_EVIDENCE_BUCKET": self.buckets["evidence"],
               "EI_RUNTIME_SERVICE_ACCOUNT": self.runtime, "EI_OIDC_AUDIENCES": ",".join(audiences),
               "EI_ALLOWED_REQUESTER_EMAILS": ",".join(dict.fromkeys([self.account, *self.args.requester]))}
        response = self.state.get("response", {})
        if response.get("enabled"):
            env.update({"EI_CONTROL_BUCKET": response["control_bucket"],
                        "EI_GATE_TIMEOUT_SECONDS": str(response["gate_timeout_seconds"]),
                        "EI_GATE_WORKFLOW_ID": response["workflow_id"]})
        env_path = self.state_dir / "runtime-env.json"
        dump(env_path, env)
        installation_id = attempt.get("id") or uuid.uuid4().hex
        self.state["deployment_attempt"] = {"id": installation_id, "requested_at": now(),
                                            "resource_was_absent": existing is None or attempt.get("resource_was_absent", False)}
        self.save()
        self.gc("run", "deploy", SERVICE, f"--source={source}", f"--region={self.region}",
                f"--build-service-account=projects/{self.project}/serviceAccounts/{self.builder}",
                f"--service-account={self.runtime}", f"--env-vars-file={env_path}",
                "--no-allow-unauthenticated", "--invoker-iam-check", "--ingress=all", "--min=0", "--max=1",
                "--min-instances=0", "--max-instances=1", "--cpu=1", "--memory=512Mi", "--concurrency=1",
                "--timeout=180s", "--cpu-throttling", "--no-cpu-boost",
                f"--labels=ei_demo=agent_service_account,ei_installation={installation_id}")
        self.mark_created("services", SERVICE)
        self.gc("run", "services", "add-iam-policy-binding", SERVICE, f"--region={self.region}",
                f"--member=user:{self.account}", "--role=roles/run.invoker")
        for requester in self.args.requester:
            if not re.fullmatch(r"[^\s@]+@[^\s@]+", requester):
                raise ValueError("Requester must be an exact account email")
            self.gc("run", "services", "add-iam-policy-binding", SERVICE, f"--region={self.region}",
                    f"--member=user:{requester}", "--role=roles/run.invoker")
        service = self.gc("run", "services", "describe", SERVICE, f"--region={self.region}")
        url = service["status"]["url"]
        env["EI_OIDC_AUDIENCES"] = ",".join(dict.fromkeys([*audiences, url]))
        dump(env_path, env)
        self.gc("run", "services", "update", SERVICE, f"--region={self.region}", f"--env-vars-file={env_path}")
        self.state.update({"service_url": url, "deployed_at": now(), "accepted_oidc_audiences": env["EI_OIDC_AUDIENCES"].split(",")})
        self.save()
        self.snapshot()
        print(f"Private agent deployed: {url}")

    def snapshot(self):
        self.require_state()
        stamp = now().replace(":", "-")
        directory = self.state_dir / "snapshots" / stamp
        snapshot = {"captured_at": now(), "project": self.gc("projects", "describe", self.project),
                    "project_iam": self.gc("projects", "get-iam-policy", self.project),
                    "service_accounts": {}, "buckets": {},
                    "cloud_run": self.gc("run", "services", "describe", SERVICE, f"--region={self.region}", optional=True)}
        for email in [self.runtime, self.builder]:
            snapshot["service_accounts"][email] = {
                "resource": self.gc("iam", "service-accounts", "describe", email),
                "iam": self.gc("iam", "service-accounts", "get-iam-policy", email)}
        for kind, bucket in self.buckets.items():
            snapshot["buckets"][kind] = {"resource": self.gc("storage", "buckets", "describe", f"gs://{bucket}"),
                                         "iam": self.gc("storage", "buckets", "get-iam-policy", f"gs://{bucket}")}
        snapshot["limitations"] = ["Project and resource IAM at capture time only; inherited organization/folder policy and group memberships are not expanded."]
        dump(directory / "identity-and-access.json", snapshot)
        for kind, name in [("support", "cases/CASE-001.json"), ("customer", "customers/example-a.json")]:
            dump(directory / f"{kind}-object.json", self.gc("storage", "objects", "describe", f"gs://{self.buckets[kind]}/{name}"))
        print(f"Identity snapshot: {directory}")

    def edit_support(self):
        self.require_state()
        source = Path(self.args.file).resolve()
        with source.open("rb") as stream:
            uploaded_bytes = stream.read(8193)
        if len(uploaded_bytes) > 8192:
            raise ValueError("Support fixture is limited to 8 KiB")
        updated = json.loads(uploaded_bytes)
        if (updated.get("case_id") != "CASE-001" or updated.get("customer") != "Example Customer A"
                or updated.get("classification") != "synthetic"):
            raise ValueError("Only the synthetic CASE-001 document can be used")
        bucket = self.buckets["support"]
        object_name = "cases/CASE-001.json"
        uri = f"gs://{bucket}/{object_name}"
        before = self.gc("storage", "objects", "describe", uri)
        generation = str(before["generation"])
        if not re.fullmatch(r"[0-9]+", generation):
            raise ValueError("Storage did not return a usable previous object generation")
        change_id = str(uuid.uuid4())
        directory = self.state_dir / "changes" / change_id
        directory.mkdir(parents=True, mode=0o700)
        token = self.gc("auth", "print-access-token", raw=True)
        headers = {"Authorization": f"Bearer {token}"}
        object_url = f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/{urllib.parse.quote(object_name, safe='')}"
        before_query = urllib.parse.urlencode({"alt": "media", "generation": generation})
        before_bytes = storage_bytes(urllib.request.Request(object_url + "?" + before_query, headers=headers), 8192)
        (directory / "before.json").write_bytes(before_bytes)
        (directory / "before.json").chmod(0o600)
        upload_query = urllib.parse.urlencode({"uploadType": "media", "name": object_name, "ifGenerationMatch": generation})
        upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?{upload_query}"
        upload = urllib.request.Request(upload_url, data=uploaded_bytes, method="POST", headers={
            **headers, "Content-Type": "application/json", "x-goog-custom-audit-ei-change-id": change_id})
        after = json.loads(storage_bytes(upload, 65536))
        new_generation = str(after.get("generation", ""))
        if (after.get("bucket") != bucket or after.get("name") != object_name
                or not re.fullmatch(r"[0-9]+", new_generation) or new_generation == generation
                or str(after.get("size")) != str(len(uploaded_bytes))):
            raise RuntimeError("Storage upload response does not identify the expected new object generation")
        (directory / "after.json").write_bytes(uploaded_bytes)
        (directory / "after.json").chmod(0o600)
        change = {"change_id": change_id, "recorded_at": now(), "cli_account": self.account,
                  "actor_status": "CLI account; join authenticated Cloud Audit event before claiming observed editor",
                  "resource": uri, "before": before, "after": after,
                  "before_sha256": hashlib.sha256(before_bytes).hexdigest(),
                  "after_sha256": hashlib.sha256(uploaded_bytes).hexdigest(),
                  "write_receipt": {"source": "google_storage_json_upload_response", "captured_at": now(),
                                    "resource": after, "precondition_generation": generation,
                                    "request_change_id": change_id},
                  "verification": {"source": "google_storage_generation_readback", "generation": new_generation,
                                   "status": "pending", "matches_uploaded_bytes": False}}
        # Keep the server's write receipt even when a subsequent verification request fails.
        dump(directory / "change.json", change)
        readback_query = urllib.parse.urlencode({"alt": "media", "generation": new_generation})
        try:
            readback = storage_bytes(urllib.request.Request(object_url + "?" + readback_query, headers=headers), 8192)
            matches = readback == uploaded_bytes
            change["verification"].update({"status": "verified" if matches else "mismatch",
                                           "sha256": hashlib.sha256(readback).hexdigest(), "matches_uploaded_bytes": matches})
            dump(directory / "change.json", change)
            if not matches:
                raise RuntimeError("Uploaded generation readback differs from the recorded source bytes")
        except RuntimeError:
            if change["verification"]["status"] == "pending":
                change["verification"]["status"] = "failed"
                dump(directory / "change.json", change)
            raise
        print(f"Recorded edit with immutable generations: {directory}")

    def invoke(self):
        self.require_state()
        url = self.state.get("service_url")
        if not url:
            raise ValueError("Deploy the agent first")
        if len(self.args.prompt) > 4000:
            raise ValueError("Prompt is limited to 4000 characters")
        token = self.gc("auth", "print-identity-token", raw=True)
        payload = {"prompt": self.args.prompt, "title": self.args.title}
        if getattr(self.args, "client_request_id", None):
            payload["client_request_id"] = str(uuid.UUID(self.args.client_request_id))
        body = json.dumps(payload).encode()
        request = urllib.request.Request(url + "/runs", data=body, method="POST", headers={
            "X-EI-Requester-Token": token, "X-Serverless-Authorization": f"Bearer {token}",
            "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=190) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Agent returned HTTP {error.code}: {error.read(4000).decode(errors='replace')}") from None
        request_id = str(uuid.uuid4())
        path = self.state_dir / "invocations" / f"{request_id}.json"
        dump(path, {"captured_at": now(), "cli_account": self.account, "service_url": url,
                    "request": json.loads(body), "response": result})
        print(json.dumps({"evidence_file": str(path), "response": result}, indent=2))

    def export(self):
        self.require_state()
        start, end = bounded_window(self.args.start, self.args.end)
        directory = Path(self.args.output).resolve() if self.args.output else self.state_dir / "exports" / now().replace(":", "-")
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        base_filter = f'timestamp >= "{start}" AND timestamp < "{end}"'
        audit_scope = " OR ".join([
            'protoPayload.resourceName:"ei-agent-demo"',
            f'protoPayload.resourceName:"{ROLE}"',
            f'protoPayload.authenticationInfo.principalEmail="{self.runtime}"',
            f'protoPayload.authenticationInfo.principalEmail="{self.builder}"',
            f'protoPayload.serviceData.policyDelta.bindingDeltas.member="serviceAccount:{self.runtime}"',
            f'protoPayload.serviceData.policyDelta.bindingDeltas.member="serviceAccount:{self.builder}"',
            f'protoPayload.metadata.policyDelta.bindingDeltas.member="serviceAccount:{self.runtime}"',
            f'protoPayload.metadata.policyDelta.bindingDeltas.member="serviceAccount:{self.builder}"',
            *[f'resource.labels.bucket_name="{bucket}"' for bucket in self.buckets.values()],
            f'resource.labels.service_name="{SERVICE}"',
        ])
        audit_filter = base_filter + ' AND logName:"cloudaudit.googleapis.com" AND (' + audit_scope + ')'
        app_filter = base_filter + f' AND resource.type="cloud_run_revision" AND resource.labels.service_name="{SERVICE}"'
        counts = {}
        for name, query in [("cloud-audit", audit_filter), ("agent-logs", app_filter)]:
            events = self.gc("logging", "read", query, "--order=asc", "--limit=1000")
            path = directory / f"{name}.jsonl"
            path.write_text("".join(json.dumps(item, separators=(",", ":")) + "\n" for item in events))
            path.chmod(0o600)
            counts[name] = {"count": len(events), "possibly_truncated": len(events) == 1000}
        # Exact run evidence retrieval is bounded to named run IDs; never copy an entire bucket.
        for run_id in self.args.run_id:
            if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", run_id):
                raise ValueError("Invalid run ID")
            self.gc("storage", "cp", f"gs://{self.buckets['evidence']}/runs/{run_id}.json",
                    str(directory / f"run-{run_id}.json"), raw=True)
            (directory / f"run-{run_id}.json").chmod(0o600)
        ownership = self.state_dir / "ownership.json"
        if ownership.exists():
            shutil.copy2(ownership, directory / "ownership.json")
        dump(directory / "manifest.json", {"project_id": self.project, "project_number": self.state["project_number"],
                                           "service_url": self.state.get("service_url"), "start": start, "end": end,
                                           "exported_at": now(), "run_ids": self.args.run_id, "logs": counts,
                                           "limitations": ["Logs can arrive late; rerun the same bounded window if incomplete.",
                                                            "Raw cloud logs are evidence; temporal proximity is not proof of influence."]})
        self.snapshot()
        print(f"Bounded evidence export: {directory}")

    def cleanup(self):
        self.require_state()
        if self.args.confirm_project != self.project:
            raise ValueError("Cleanup requires --confirm-project with the exact project ID")
        if not self.state.get("created_project"):
            self.cleanup_resources()
            return
        project = self.gc("projects", "describe", self.project)
        if project.get("labels", {}).get("ei_demo") != "agent_service_account":
            raise ValueError("The project no longer carries the demo label; refusing deletion")
        self.gc("projects", "delete", self.project)
        self.state["deletion_requested_at"] = now()
        self.save()
        print("Dedicated demo project deletion requested; inspect Cloud Billing for delayed charges. Local evidence was retained.")

    def cleanup_resources(self):
        """Adopted projects keep billing, APIs, shared build artifacts and audit settings."""
        service = self.gc("run", "services", "describe", SERVICE, f"--region={self.region}", optional=True)
        if service and self.created("services", SERVICE):
            if service.get("metadata", {}).get("labels", {}).get("ei_demo") != "agent_service_account":
                raise ValueError("Cloud Run demo label missing; refusing cleanup")
            self.gc("run", "services", "delete", SERVICE, f"--region={self.region}")
        for bucket in self.buckets.values():
            if not self.created("buckets", bucket):
                continue
            resource = self.gc("storage", "buckets", "describe", f"gs://{bucket}", optional=True)
            if resource is None:
                continue
            if resource.get("labels", {}).get("ei_demo") != "agent_service_account":
                raise ValueError(f"Bucket demo label missing: {bucket}")
            self.gc("storage", "rm", "--recursive", f"gs://{bucket}", raw=True)
        for email, role in [(self.runtime, f"projects/{self.project}/roles/{ROLE}"), (self.builder, "roles/run.builder")]:
            if not self.created("service_accounts", email):
                continue
            resource = self.gc("iam", "service-accounts", "describe", email, optional=True)
            if resource is None:
                continue
            if resource.get("description") != "Managed by entity-intelligence-demo":
                raise ValueError(f"Service account demo marker missing: {email}")
            policy = self.gc("projects", "get-iam-policy", self.project)
            if any(binding.get("role") == role and not binding.get("condition")
                   and f"serviceAccount:{email}" in binding.get("members", []) for binding in policy.get("bindings", [])):
                self.gc("projects", "remove-iam-policy-binding", self.project,
                        f"--member=serviceAccount:{email}", f"--role={role}", "--condition=None")
            self.gc("iam", "service-accounts", "delete", email)
        role = self.gc("iam", "roles", "describe", ROLE, optional=True)
        if self.created("roles", ROLE) and role and role.get("description") == "Managed by entity-intelligence-demo":
            self.gc("iam", "roles", "delete", ROLE)
        self.state["resource_cleanup_at"] = now()
        self.save()
        print("Namespaced service, buckets and accounts removed. Project, billing, APIs, audit settings and shared build artifacts remain; local evidence retained.")


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--project", required=True)
    result.add_argument("--account", required=True)
    result.add_argument("--region", default="us-central1")
    result.add_argument("--gcloud", help="Absolute gcloud executable, otherwise PATH")
    commands = result.add_subparsers(dest="command", required=True)
    provision = commands.add_parser("provision")
    selection = provision.add_mutually_exclusive_group(required=True)
    selection.add_argument("--create-project", action="store_true")
    selection.add_argument("--use-existing-project", action="store_true")
    provision.add_argument("--billing-account")
    provision.add_argument("--owner", required=True)
    hierarchy = provision.add_mutually_exclusive_group()
    hierarchy.add_argument("--folder")
    hierarchy.add_argument("--organization")
    provision.add_argument("--model", default="gemini-3.1-flash-lite")
    provision.add_argument("--model-location", default="global", choices=["global", "us", "eu"])
    deploy = commands.add_parser("deploy")
    deploy.add_argument("--source")
    deploy.add_argument("--oidc-audience", action="append", default=[])
    deploy.add_argument("--requester", action="append", default=[], help="Additional exact Google user email allowed to invoke")
    response = commands.add_parser("configure-response")
    response.add_argument("--workflow-id", default="workflow-ei-google-export-prevention-v1")
    commands.add_parser("snapshot")
    edit = commands.add_parser("edit-support")
    edit.add_argument("--file", required=True)
    invoke = commands.add_parser("invoke")
    invoke.add_argument("--prompt", required=True)
    invoke.add_argument("--title", default="Support case review")
    invoke.add_argument("--client-request-id", help="Optional UUID to bind a live relay to this invocation")
    export = commands.add_parser("export")
    export.add_argument("--start", required=True)
    export.add_argument("--end", required=True)
    export.add_argument("--output")
    export.add_argument("--run-id", action="append", default=[])
    cleanup = commands.add_parser("cleanup")
    cleanup.add_argument("--confirm-project", required=True)
    return result


def main():
    args = parser().parse_args()
    try:
        demo = Demo(args)
        getattr(demo, args.command.replace("-", "_"))()
    except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as error:
        print(f"Stopped: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
