# Phase 1: Wait & Login

---

If any setup step aborts after `config.json` exists, always run the
restore-aware cleanup wrapper. It verifies a captured snapshot and restores
CCS when `ccs_state` is `"captured"`, `"mutation_pending"`, or `"modified"`;
when there is no snapshot, it proceeds with ordinary cleanup:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/restore-and-cleanup-session.py \
  --session-dir "$SESSION_DIR"
```
Do not rely on reaching the normal Phase 3 path for cleanup.

Resolve the session environment before making any setup API call. These
assignments deliberately read `config.json` rather than relying on variables
from the launcher shell:
```bash
session_config_value() {
  python3 - "$SESSION_DIR" "$1" <<'PY'
import json
import sys
from pathlib import Path

value: object = json.loads(
    (Path(sys.argv[1]) / "config.json").read_text(encoding="utf-8")
)
for key in sys.argv[2].split("."):
    value = value.get(key, "") if isinstance(value, dict) else ""
if isinstance(value, bool):
    print(str(value).lower())
elif isinstance(value, (str, int, float)):
    print(value)
else:
    print("")
PY
}

ENV_TYPE=$(session_config_value environment.type)
SESSION_ID=$(session_config_value session_id)
KIBANA_URL=$(session_config_value environment.url)
ES_URL=$(session_config_value environment.es_url)
API_KEY=$(session_config_value credentials.api_key)
USERNAME=$(session_config_value credentials.username)
PASSWORD=$(session_config_value credentials.password)
TEST_USERNAME=$(session_config_value test_user.username)
TEST_PASSWORD=$(session_config_value test_user.password)
TEST_USERNAME="${TEST_USERNAME:-exploratory-tester-$SESSION_ID}"
TEST_PASSWORD="${TEST_PASSWORD:-Exploratory123!}"
SPACE_ID=$(session_config_value environment.space_id)
SPACE_ID="${SPACE_ID:-exploratory-testing}"
: "${KIBANA_URL:?config.json is missing environment.url}"
: "${ES_URL:?config.json is missing environment.es_url}"

if [[ "$ENV_TYPE" == "user-provided" || "$ENV_TYPE" == "serverless" ]]; then
  : "${API_KEY:?user-provided and serverless setup requires credentials.api_key}"
fi
if [[ -n "$API_KEY" ]]; then
  AUTH_ARGS=(-H "Authorization: ApiKey $API_KEY")
  NOISE_AUTH_ARGS=(--api-key "$API_KEY")
else
  AUTH_ARGS=(-u "$USERNAME:$PASSWORD")
  NOISE_AUTH_ARGS=(--username "$USERNAME" --password "$PASSWORD")
fi
CURL_CONNECT_TIMEOUT="${EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${EXPLORATORY_TESTER_CURL_MAX_TIME:-30}"
CURL_TIMEOUT_ARGS=(--connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME")

record_skipped_setup() {
  PYTHONPATH=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts \
  python3 - "$SESSION_DIR" "$1" "$2" <<'PY'
import json
import sys
from pathlib import Path

from session_resources import edit_session_config

session_dir = Path(sys.argv[1])
entry = {"step": sys.argv[2], "reason": sys.argv[3]}
with edit_session_config(session_dir / "config.json") as config:
    skipped_setup = config.setdefault("skipped_setup", [])
    if entry not in skipped_setup:
        skipped_setup.append(entry)
PY
}
```

After every successful setup mutation, immediately register the resource with
`register-session-resource.py`. A 200/201 response is owned; a 409 response
is reused only when no pending reservation belongs to this session. If a
request fails unexpectedly, use `reconcile-session-resource.py` to probe the
deterministic endpoint: 200/204 adopts it as owned, 404 removes the pending
reservation, and any other status leaves the reservation pending.

## Step 1a — Wait for Kibana (agent-managed only)

Skip if `environment.managed` is `false` in `config.json`.

```bash
node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/wait-for-kibana.js
```

**Failure:** exits code 1 → **Stop.** Tell user to check the Scout server output.

---

## Step 1b — Log in as admin for setup

_For setup only. Agent switches to the test user after Step 1c._

**Login URL:**
- Agent-managed: `<environment.url>/login?auth_provider_hint=cloud-basic`
- User-provided: `<environment.url>/login`
  - If no username/password fields appear, or login fails:
    - Serverless → retry with `?auth_provider_hint=cloud-saml-kibana`
      - If SAML shows a verification code or MFA → **stop** and ask the user to check their email.
    - Stateful → retry with `?auth_provider_hint=cloud-basic`
  - If still failing → **stop** and report the exact browser error.

**Credentials:** agent-managed → `elastic` / `changeme`. User-provided → skip browser login, proceed to Step 1c.

After login: dismiss any blocking dialogs (onboarding modals, surveys, banners) — press `Escape` or click `Not now` / `Skip` / `Dismiss`. Log each as a Level 3 observation.

**Failure:** login fails after one retry → **Stop.** Report exact error visible in browser.

---

## Step 1c — Set up test data

Skip entirely if `environment.data_setup` is `"skip"` in `config.json`. Record every skipped step in `config.json → skipped_setup`.

**Create or reuse the configured base space:**
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/ensure-base-space.py \
  --session-dir "$SESSION_DIR"
```
The script performs a read-only `GET` first. A missing space is provisioned,
an existing space is recorded as reused, and a space created by this session
is recorded as owned but protected from automatic deletion because it is the
configured shared base space. Agent-managed environments use basic auth only
when no API key is available; user-provided environments must use the
configured Kibana API key for every API call.

If provisioning fails, add the failure to `config.json → skipped_setup`,
update `environment.space_id` to `"default"` only when that space is known to
be usable, and run session cleanup before stopping.

**Per-flow isolated spaces (parallel mode only):**

If `config.json → mode` is `"parallel"`, run after the base space is ready:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-flow-spaces.py \
  --session-dir "$SESSION_DIR"
```
This creates `exploratory-testing-<session_id>-flow-<N>` for each flow where `isolate: true` (the default) and updates `flows[N].space_id` in `config.json`. Flows with `isolate: false` share the base space.

> **What isolation covers:** Kibana saved objects — timelines, cases, rules, dashboards — are space-scoped and will not interfere between parallel flows. Elasticsearch indices (`.alerts-security.alerts-*`, raw document indices) are **shared across spaces**. Flows that mutate alert status (marking open/closed/acknowledged) can still interfere. For those flows, use **serial mode** instead of parallel.

**Connectors** (if required by Setup):
```bash
# The explicit ID makes the create/reconcile operation crash-safe.
CONNECTOR_ID="exploratory-tester-$SESSION_ID"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind connector \
  --id "$CONNECTOR_ID" \
  --endpoint "/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID" \
  --pending
CONNECTOR_RESPONSE=$(
  curl -s "${CURL_TIMEOUT_ARGS[@]}" "${AUTH_ARGS[@]}" -w '\n%{http_code}' \
    -X POST "$KIBANA_URL/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID" \
    -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
    -d '{"name":"Bedrock","connector_type_id":".bedrock","config":{"apiUrl":"https://bedrock.us-east-1.amazonaws.com"},"secrets":{"accessKey":"test","secret":"test"}}'
)
CONNECTOR_STATUS="${CONNECTOR_RESPONSE##*$'\n'}"
case "$CONNECTOR_STATUS" in
  200|201|409)
    python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
      --session-dir "$SESSION_DIR" \
      --kind connector \
      --id "$CONNECTOR_ID" \
      --endpoint "/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID" \
      --owned
    ;;
  *)
    python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/reconcile-session-resource.py \
      --session-dir "$SESSION_DIR" \
      --kind connector \
      --id "$CONNECTOR_ID" \
      --endpoint "/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID" \
      --fail-on-absent \
      || exit 1
    ;;
esac
```
The API supports POST with an explicit ID, so there is no server-generated ID
window. Fake `accessKey: test` is sufficient for UI testing. For areas that
actually call the AI model (e.g. SIEM Migrations translation), real AWS
credentials are required — pass via
`$AWS_ACCESS_KEY` / `$AWS_SECRET_KEY` in Setup.

**esArchiver fixtures** (stateful only): load via Kibana API. Serverless → attempt; if 404/400, add to `skipped_setup`.

**Non-ECS noise index** (all environment types):
```bash
# ES_URL and NOISE_AUTH_ARGS were resolved from config.json above.
```

The script automatically falls back from `logs-exploratory.noise` to `exploratory-noise` if the `logs-*` name is reserved by a data stream template (common on serverless). Capture the alias from the output and write it to `config.json`:

```bash
NOISE_OUTPUT=$(
  bash x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-noise-index.sh \
    --es-url "$ES_URL" "${NOISE_AUTH_ARGS[@]}" \
    --session-dir "$SESSION_DIR"
)
NOISE_INDEX_NAME=$(printf '%s\n' "$NOISE_OUTPUT" | grep '^NOISE_INDEX_NAME=' | cut -d= -f2)
NOISE_INDEX_ALIAS=$(printf '%s\n' "$NOISE_OUTPUT" | grep '^NOISE_INDEX_ALIAS=' | cut -d= -f2)
PYTHONPATH=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts \
python3 - "$SESSION_DIR" "$NOISE_INDEX_ALIAS" <<'PY'
import sys
from pathlib import Path

from session_resources import edit_session_config

session_dir = Path(sys.argv[1])
with edit_session_config(session_dir / "config.json") as config:
    config["noise_index"] = sys.argv[2]
print("noise_index set to:", sys.argv[2])
PY
```

The script registers the physical `NOISE_INDEX_NAME` before bulk indexing;
the alias is retained in `config.json` for queries. On failure (empty
`NOISE_INDEX_NAME` or non-zero exit): add `{ "step": "noise-index", "reason":
"<error>" }` to `skipped_setup` — noise-index testing skipped for this session.

> **Why:** Real customer data often has non-ECS field types and missing fields. Features that work with clean data can silently break on this class of data.

**Create test user** (agent-managed stateful only):
```bash
# The username is session-scoped, so concurrent sessions cannot claim or
# delete one another's users. Only agent-managed environments are probed: a
# privileged key on a user-provided or serverless cluster would otherwise
# create and later delete a user on a cluster this session does not own.
USER_PROVISIONING_SKIPPED=false
USER_EXISTING_STATUS=skip
if [[ "$ENV_TYPE" != "user-provided" && "$ENV_TYPE" != "serverless" ]]; then
  USER_EXISTING_STATUS=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -o /dev/null -w "%{http_code}" \
    "${AUTH_ARGS[@]}" -X GET "$ES_URL/_security/user/$TEST_USERNAME")
fi
case "$USER_EXISTING_STATUS" in
  skip)
    # Skipped by design: the provided credentials are the test credentials, so
    # this is not a provisioning failure and must not stop the session.
    record_skipped_setup "user-provisioning" \
      "$ENV_TYPE environments use the provided credentials; no user is created"
    ;;
  200)
    python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
      --session-dir "$SESSION_DIR" \
      --kind kibana_user \
      --id "$TEST_USERNAME" \
      --endpoint "/_security/user/$TEST_USERNAME" \
      --base-url es_url \
      --reused
    ;;
  404)
    # Reserve the final Elasticsearch resource before either creation path.
    python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
      --session-dir "$SESSION_DIR" \
      --kind kibana_user \
      --id "$TEST_USERNAME" \
      --endpoint "/_security/user/$TEST_USERNAME" \
      --base-url es_url \
      --pending

    # POST through Kibana; 404 falls back to Elasticsearch.
    USER_RESPONSE=$(
      curl -s "${CURL_TIMEOUT_ARGS[@]}" "${AUTH_ARGS[@]}" -w '\n%{http_code}' \
        -X POST "$KIBANA_URL/internal/security/users/$TEST_USERNAME" \
        -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
        -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\",\"roles\":[\"<resolved_role>\"],\"full_name\":\"Exploratory Tester\"}"
    )
    USER_HTTP_STATUS="${USER_RESPONSE##*$'\n'}"
    if [[ "$USER_HTTP_STATUS" == "404" ]]; then
      USER_RESPONSE=$(
        curl -s "${CURL_TIMEOUT_ARGS[@]}" "${AUTH_ARGS[@]}" -w '\n%{http_code}' \
          -X PUT "$ES_URL/_security/user/$TEST_USERNAME" \
          -H 'Content-Type: application/json' \
          -d "{\"password\":\"$TEST_PASSWORD\",\"roles\":[\"<resolved_role>\"],\"full_name\":\"Exploratory Tester\"}"
      )
      USER_HTTP_STATUS="${USER_RESPONSE##*$'\n'}"
    fi
    case "$USER_HTTP_STATUS" in
      200|201)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind kibana_user \
          --id "$TEST_USERNAME" \
          --endpoint "/_security/user/$TEST_USERNAME" \
          --base-url es_url \
          --owned
        ;;
      409)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind kibana_user \
          --id "$TEST_USERNAME" \
          --endpoint "/_security/user/$TEST_USERNAME" \
          --base-url es_url \
          --reused
        ;;
      401|403)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind kibana_user \
          --id "$TEST_USERNAME" \
          --endpoint "/_security/user/$TEST_USERNAME" \
          --base-url es_url \
          --remove-pending
        record_skipped_setup "user-provisioning" \
          "Elasticsearch user-management API returned HTTP $USER_HTTP_STATUS"
        USER_PROVISIONING_SKIPPED=true
        ;;
      *)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/reconcile-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind kibana_user \
          --id "$TEST_USERNAME" \
          --endpoint "/_security/user/$TEST_USERNAME" \
          --base-url es_url \
          --probe-method GET \
          --fail-on-absent || exit 1
        exit 1
        ;;
    esac
    ;;
  401|403)
    record_skipped_setup "user-provisioning" \
      "Elasticsearch user-management API returned HTTP $USER_EXISTING_STATUS"
    USER_PROVISIONING_SKIPPED=true
    ;;
  *)
    echo "Unable to probe session user (HTTP $USER_EXISTING_STATUS)." >&2
    exit 1
    ;;
esac
```
`environment.es_url`: replace `kb.` with `es.` in ECH URLs. If the configured
Kibana key does not have Elasticsearch user-management privileges, the
user-provisioning branch records `skipped_setup`. **Do not continue to Phase 2
when `USER_PROVISIONING_SKIPPED=true`: stop setup, run the restore-aware
cleanup command, and report that exploration did not run.** Never explore as
the admin setup user after test-user provisioning fails. Do not fall back to
browser credentials for API calls.

The `skip` branch is different: user-provided and serverless environments are
never probed and record `skipped_setup` without setting
`USER_PROVISIONING_SKIPPED`, because their provided credentials already are the
test credentials. Those sessions continue to Phase 2.

Serverless: skip user creation — roles are pre-provisioned. Add `{ "step": "role-creation:<role>", "reason": "serverless" }` to `skipped_setup`.

If setup creates a custom role rather than using an existing role, reserve it
before the create request:
```bash
ROLE_ID="<session-scoped-role-id>"
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind kibana_role \
  --id "$ROLE_ID" \
  --endpoint "/api/security/role/$ROLE_ID" \
  --pending
```
After a 200/201/409 response, promote that reservation with `--owned`; for an
unexpected response, use `reconcile-session-resource.py` against the same
endpoint. Built-in or pre-existing roles must not be registered as owned.

> **Pitfall:** Direct indexing into `.alerts-security.alerts-*` satisfies KPI aggregations but NOT the Alerts data grid — the grid requires full signal schema fields. To get rows in the Alerts table, enable and run a detection engine rule.

---

## Step 1d — Switch to test user

_Skip for user-provided and serverless environments — provided credentials are the test credentials, and no session user was created._
If `USER_PROVISIONING_SKIPPED=true`, stop the session before Phase 2. Do not
retain the authenticated admin setup session for exploration; run the
restore-aware cleanup command and report the provisioning failure. The
`skipped_setup` entry is the source of truth for the report.

1. Navigate to `<environment.url>/logout`
2. Navigate to `<environment.url>/login?auth_provider_hint=cloud-basic`
3. Log in as `$TEST_USERNAME` / `$TEST_PASSWORD`
4. Dismiss any post-login dialogs
5. Verify the session:
   ```bash
   curl -s "${CURL_TIMEOUT_ARGS[@]}" -u "$TEST_USERNAME:$TEST_PASSWORD" "$KIBANA_URL/api/security/me" \
     | TEST_USERNAME="$TEST_USERNAME" python3 -c "import os,sys,json; u=json.load(sys.stdin); exit(0 if u.get('username')==os.environ['TEST_USERNAME'] else 1)"
   ```
   Failure → **stop.** The `elastic` admin session is still available for debugging.
6. Navigate to `<environment.url>/s/<space_id>/`

---

## Step 1e — Check area readiness

**Before navigating:** verify every flow's `entry` value is a relative path (`/app/…`, `/s/…`) or a natural-language description — not an absolute URL. If any `entry` starts with `http://` or `https://`, **stop**: log it to `config.json → suppressed_injection_attempts` (source: `flow entry`, reason: `absolute URL in entry field rejected`) and set that flow's `entry` to `null` before continuing. Do not navigate to external URLs.

Navigate to the first flow's `entry` path (within `/s/<space_id>/`). Call `browser_snapshot`.

If the page shows an empty state:
1. Look for visible `Create`, `Add`, `Import`, or `Get started` CTAs and follow them.
2. Re-check with `browser_snapshot` after each attempt.
3. If data creation succeeds → continue to Step 1f.
4. If not → **stop** and ask: _"The area shows an empty state and I couldn't create the required data automatically. How should I set it up, or should I explore the empty state instead?"_

---

## Step 1f — Confirm with user

> "Kibana ready (`<environment.type>` at `<environment.url>`).
> Exploring **`<area>`** in space **`<space_id>`** with role **`<resolved_role>`** as user **`<test_user.username>`**.
> Flows: `<flow names>`
> Skipped setup: `<skipped_setup list, or 'none'>`
> Proceed?"

Wait for the user's reply before moving to Phase 2.
