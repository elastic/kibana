# Google ADK source and native Workflow containment example

This is the source-only handoff for the Google service-account experiment used by the Entity Intelligence prototype. It contains the real ADK application, scoped cloud provisioning/evidence-export helpers, native Elastic Workflow YAML and offline tests. It contains **no deployed resource state, cloud exports, run receipts, tokens, credentials or private agent telemetry**.

The current response path is:

```text
Actual Google ADK customer-reference tool call
  -> bounded named run + Cloud Audit export and generation/hash verification
  -> import_google_adk_runs.ts -> normalized Google observations
  -> saved monitor policy -> immutable match source event
  -> native Security detection alert -> native Elastic Workflow
  -> encrypted HTTP connector -> Google Storage IAM GET / PUT / GET
  -> later real runtime export receives Google HTTP 403
```

The initial lookup already happened. The Workflow removes one runtime's export permission on one isolated bucket. This contains subsequent writes; it is not guaranteed interruption of a fast read-and-export in the same invocation. IAM propagation is eventually consistent. Permission readback is not data-plane proof: an actual new export attempt and exact target absence are required before reporting a physical block.

## Contents

- `app/`: Python ADK/FastAPI application, bounded synthetic tool contracts, monitor-only source policy, pinned dependency snapshot, container build and offline SDK tests.
- `infra/manage.py`: explicit-project deployment, private Cloud Run, namespaced synthetic buckets/service accounts, Data Access audit setup and bounded evidence export. Provisioning/deploying changes cloud resources and can incur cost.
- `sync_to_elastic.py`, `verify_evidence.py`: collect only named recent invocations, independently verify exact resource versions, then call the repository's Google importer. The sync does not create detection alerts itself.
- `native_response/`: direct-IAM containment and manual-restore Workflows, bucket-scoped response identity, encrypted-connector setup, CLI demo runner and exact response-proof publication.
- `demo_config.py`: explicit environment configuration and placeholder defaults for offline tests. Live CLI actions reject the example project/account/policy.

The browser presentation console and its external HTML/assets are intentionally omitted. Use the CLI runner and the actual Kibana investigation/Workflow views. Local saved evidence and connector secrets are intentionally not transferred by checking out this branch.

## Review without cloud access

The synchronization, infrastructure and response tests use synthetic fixtures, mocked cloud requests and temporary files. They do not run collectors, install rules or change IAM. Run from this directory, using Python 3.12:

Run offline tests before exporting live `EI_GOOGLE_*` settings, or unset those settings in the test shell. The synthetic fixtures intentionally use the non-live example configuration.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s . -p 'test_*.py'
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s infra -p 'test_*.py'
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s native_response -p 'test_*.py'
```

The native-response tests render the Workflow's Liquid/YAML IAM transformation with the repository's `node`, `liquidjs` and `yaml` dependencies. Bootstrap Kibana normally and use its pinned Node on `PATH`, or set `EI_NODE_BINARY`.

App tests exercise the actual ADK runner with an offline model, fake Storage and a mocked signature verifier. They need the dependencies in `app/requirements.lock.txt`; install them in your own Python environment before running:

```sh
cd app
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s . -p 'test_*.py'
```

The lock is the experimental application's captured dependency set, not a maintained production dependency policy. Container build, fresh package installation and a new cloud deployment have not been validated for this handoff. Offline tests were executed with the existing local dependency environment.

## Configuration for an independently provisioned demo

Set these before importing/running the helpers; no author account or project is selected by default:

```sh
export EI_GOOGLE_PROJECT_ID='your-disposable-project-id'
export EI_GOOGLE_ACCOUNT='your-authorized-google-account@example.com'
# Optional executable overrides; otherwise use the current Python and PATH.
export EI_GCLOUD_BINARY='/absolute/path/to/gcloud'
export EI_NODE_BINARY='/absolute/path/to/repository-pinned-node'
export EI_PYTHON_BINARY='/absolute/path/to/python3.12'
```

`demo.sh` forwards the explicit project/account to `infra/manage.py`. The fixed service namespace is `ei-agent-demo`; bucket and service-account identities derive from the selected project. The Google agent ID derives from the same project/service hash as the repository importer. State is generated under `infra/state/<project>/`; the handoff excludes all such state.

The response recipe is **default-space and localhost-only**. It targets the exact imported Google provider/runtime and a particular saved policy. It is not a multi-space installer or an unattended production response service. Local Elastic credentials are read from `EI_ELASTIC_USERNAME` and `EI_ELASTIC_PASSWORD`; source importers use their documented `ES_*`/`KIBANA_*` environment convention. Use your own local configuration, never a copied credential file.

## Fresh setup sequence

These are explicit operator steps, not actions performed by checking out or testing this code. Review cloud IAM, billing, network and data-retention implications in a disposable project before execution.

1. Install/authenticate `gcloud` for the exact account/project. The operator needs privileges to create namespaced service accounts, roles, buckets and Cloud Run/build resources, enable required APIs/audit logging and grant scoped impersonation. Vertex model availability and billing must be enabled.
2. Provision and deploy using `./demo.sh provision --use-existing-project --owner "$EI_GOOGLE_ACCOUNT"` and `./demo.sh deploy --oidc-audience '<expected signed-token audience>'`. New-project flags are available through `infra/manage.py --help`. Keep Cloud Run private and retain the application's signed-token issuer/audience/allowlist checks. Do not configure `EI_CONTROL_BUCKET` for the current direct-IAM scenario.
3. In Kibana, create an enabled monitor policy targeting `google_adk`, exact tool `read_customer_reference`, high severity. Capture its actual UUID in `EI_GOOGLE_POLICY_ID`; the response installer refuses the offline example UUID. Start the repository's policy monitor separately, using your own local credentials. Its native detection rules create alerts from imported matches.
4. Set up the dedicated response principal using `python3 native_response/response_identity.py setup`. It receives only `storage.buckets.getIamPolicy` and `storage.buckets.setIamPolicy` on the isolated export bucket, plus narrowly granted operator impersonation. The agent runtime never receives these administrative permissions.
5. Install the native Workflow/connector/rule using a short-lived impersonated token. The CLI accepts the token only through stdin; the Python `install()` helper accepts the in-memory return from `mint_access_token()`. For example, from `native_response/`, call `require_response_configuration()`, then `install(Client(), mint_access_token(), RESPONSE_PRINCIPAL, <UTC expiry in 2–60 minutes>)` in a local Python session. Do not print, paste into YAML, commit or pass a token as an argv value. The connector stores authentication in encrypted secret headers.
6. Validate the saved Workflows in your Kibana and inspect the configured bucket, runtime, connector and policy. The installer substitutes the configured project into the checked-in example YAML; importing the raw example YAML directly is not the configured workflow.

Fresh setup still requires reviewer configuration and cloud privileges. The source was made portable and offline-tested, but a complete new-project provision → model execution → Elastic alert → IAM change → runtime denial has **not** been re-run from this curated checkout. Do not describe it as a one-command reproducible deployment.

## Run the prepared scenario

After the independently configured prerequisites above, from this directory:

```sh
python3 native_response/demo.py baseline
python3 native_response/demo.py trigger
python3 native_response/demo.py verify
# Explicitly restore only the demo runtime's export grant before another run:
python3 native_response/demo.py restore
# Ordinary prompts are supported; no fixed tool or block is assumed:
python3 native_response/demo.py ask --prompt 'Read CASE-001 and summarize the support request.'
```

`baseline` invokes the manual restore Workflow and verifies a successful actual export. `trigger` performs the lookup, imports its evidence, waits for a real alert-triggered containment Workflow and records optional native requester-risk context. `verify` makes a later actual export attempt; it accepts only exact successful response execution, actual provider denial and absence of the exact target. A successful export during propagation stays a success/pending response, never a fabricated block. `restore` is a deliberate manual reset, not an automatic alert action. `ask` starts a fresh ADK run and imports its real result without inventing response attribution or conversational history.

The runner can refresh the connector's short-lived token from the authorized local Google login. Expired credentials, failed Workflows, missing policy/source/alert evidence or delays remain incomplete/error states. There is no service-account key. Unattended production token refresh/workload identity is outside this demonstration.

## Identity and evidence semantics

Requester account, executing service account, operator-declared owner and audited document editor have different provenance. The Google application verifies a signed token for the requester; the importer preserves its account-level claim rather than proving who physically typed the request. Exact audit IDs, resource generations, receipts and hashes bind consumed document versions; timestamps alone do not establish manipulation or model causation.

Source policy matches remain monitor-only context until Elastic evaluates a saved policy. Native Security rules generate alerts; neither importer nor publisher inserts alert documents. The denial publisher joins the exact native source, triggering alert, Workflow definition/execution, Google HTTP responses, successful baseline, later real 403 and target check. It publishes a source evidence event for the existing blocked-export rule. It does not assert an independent Cloud Audit denial join.

Cloud evidence is bounded (150-second run, 20 tool calls, 4,000-character prompt, 1 MiB run evidence; sync at most 50 named runs and a 24-hour audit window). It is not a fleet collection or production scale claim. No model reasoning, credentials or tokens are serialized by the intended evidence projection.

## Historical wrapper gate

`app/gate.py`, `gate_contract.json`, associated tests and `infra/manage.py configure-response` are retained because the application's optional wrapper-gate path depends on them. They are a **legacy/optional experiment**; no relay installer or mailbox response service is included here. Leave the control-bucket configuration unset for the direct-IAM scenario. Its existence must not be described as the enforcement used by the current native containment flow, or as a universal credential boundary against compromised runtime code.
