# Phase 1: Wait & Login

---

If any setup step aborts after `config.json` exists, restore CCS first when
applicable and run:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/cleanup-session-resources.py \
  --session-dir "$SESSION_DIR"
```
Do not rely on reaching the normal Phase 3 path for cleanup.

After every successful setup mutation, immediately register the resource with
`register-session-resource.py`. A 200/201 response is owned; a 409 response
is reused. If ownership cannot be established, record the resource as reused
or skip cleanup rather than guessing.

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
# Set AUTH_ARGS from config: user-provided → (-H "Authorization: ApiKey $APIKEY");
# agent-managed → (-u "$USERNAME:$PASSWORD"). Use the configured base space.
curl -s "${AUTH_ARGS[@]}" -X POST "$KIBANA_URL/s/$SPACE_ID/api/actions/connector" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"name":"Bedrock","connector_type_id":".bedrock","config":{"apiUrl":"https://bedrock.us-east-1.amazonaws.com"},"secrets":{"accessKey":"test","secret":"test"}}'
```
Capture the returned connector ID and register it with
`register-session-resource.py` as an owned `connector`; a 409/conflict is
reused and must not be deleted. Fake `accessKey: test` is sufficient for UI
testing. For areas that actually call the AI model (e.g. SIEM Migrations
translation), real AWS credentials are required — pass via
`$AWS_ACCESS_KEY` / `$AWS_SECRET_KEY` in Setup.

For an owned connector, record it immediately:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind connector \
  --id "$CONNECTOR_ID" \
  --endpoint "/api/actions/connector/$CONNECTOR_ID" \
  --owned
```

**esArchiver fixtures** (stateful only): load via Kibana API. Serverless → attempt; if 404/400, add to `skipped_setup`.

**Non-ECS noise index** (all environment types):
```bash
# Set one auth form from config:
# user-provided/serverless → NOISE_AUTH_ARGS=(--api-key "$APIKEY")
# agent-managed stateful → NOISE_AUTH_ARGS=(--username "$USERNAME" --password "$PASSWORD")
if [[ "${ENV_TYPE:-}" == "user-provided" || "${ENV_TYPE:-}" == "serverless" ]]; then
  NOISE_AUTH_ARGS=(--api-key "$APIKEY")
else
  NOISE_AUTH_ARGS=(--username "$USERNAME" --password "$PASSWORD")
fi
# ES_URL: http://localhost:9220 (agent-managed) or environment.es_url from config.json
```

The script automatically falls back from `logs-exploratory.noise` to `exploratory-noise` if the `logs-*` name is reserved by a data stream template (common on serverless). Capture the alias from the output and write it to `config.json`:

```bash
NOISE_OUTPUT=$(
  bash x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-noise-index.sh \
    --es-url "$ES_URL" "${NOISE_AUTH_ARGS[@]}"
)
NOISE_INDEX_ALIAS=$(printf '%s\n' "$NOISE_OUTPUT" | grep '^NOISE_INDEX_ALIAS=' | cut -d= -f2)
NOISE_INDEX_OWNED=$(printf '%s\n' "$NOISE_OUTPUT" | grep '^NOISE_INDEX_OWNED=' | cut -d= -f2)
python3 -c "
import json
cfg = json.load(open('$SESSION_DIR/config.json'))
cfg['noise_index'] = '$NOISE_INDEX_ALIAS'
json.dump(cfg, open('$SESSION_DIR/config.json', 'w'), indent=2)
print('noise_index set to:', '$NOISE_INDEX_ALIAS')
"
if [[ "$NOISE_INDEX_OWNED" == "true" ]]; then
  OWNERSHIP_FLAG=--owned
else
  OWNERSHIP_FLAG=--reused
fi
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_index \
  --id "$NOISE_INDEX_ALIAS" \
  --endpoint "/$NOISE_INDEX_ALIAS" \
  --base-url es_url \
  "$OWNERSHIP_FLAG"
```

On failure (empty `NOISE_INDEX_ALIAS` or non-zero exit): add `{ "step": "noise-index", "reason": "<error>" }` to `skipped_setup` — noise-index testing skipped for this session.

> **Why:** Real customer data often has non-ECS field types and missing fields. Features that work with clean data can silently break on this class of data.

**Create test user** (agent-managed stateful only):
```bash
# User-provided environments already have their browser/API credentials;
# skip user provisioning there. Agent-managed environments use basic auth.
# POST first; if 409 use PUT:
curl -s -u elastic:changeme -X POST http://localhost:5620/internal/security/users/exploratory-tester \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"username":"exploratory-tester","password":"Exploratory123!","roles":["<resolved_role>"],"full_name":"Exploratory Tester"}'
```
If the Kibana internal user API returns **404** (common on ECH), fall back to the Elasticsearch Security API:
```bash
curl -s -H "Authorization: ApiKey <api_key>" \
  -X POST "<environment.es_url>/_security/user/exploratory-tester" \
  -H 'Content-Type: application/json' \
  -d '{"password":"Exploratory123!","roles":["<resolved_role>"],"full_name":"Exploratory Tester"}'
```
`environment.es_url`: replace `kb.` with `es.` in ECH URLs. If the configured
Kibana key does not have Elasticsearch user-management privileges, add the
failure to `skipped_setup` and continue with the provided admin credentials;
do not fall back to browser credentials for API calls.

Serverless: skip user creation — roles are pre-provisioned. Add `{ "step": "role-creation:<role>", "reason": "serverless" }` to `skipped_setup`.

Capture the create response before continuing. Register a user only after a
200/201 response; record a 409 response as reused. If the Elasticsearch
fallback created the user, use `--base-url es_url` and endpoint
`/_security/user/exploratory-tester`:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind kibana_user \
  --id exploratory-tester \
  --endpoint "/internal/security/users/exploratory-tester" \
  --owned
```
Never register a user or role as owned when the response was 409 or when the
resource predated this session.

If setup creates a custom role rather than using an existing role, register it
with kind `kibana_role` and endpoint
`/api/security/role/<role-id>` using the same owned/reused rule. Built-in or
pre-existing roles must not be registered as owned.

> **Pitfall:** Direct indexing into `.alerts-security.alerts-*` satisfies KPI aggregations but NOT the Alerts data grid — the grid requires full signal schema fields. To get rows in the Alerts table, enable and run a detection engine rule.

---

## Step 1d — Switch to test user

_Skip for user-provided environments — provided credentials are the test credentials._

1. Navigate to `<environment.url>/logout`
2. Navigate to `<environment.url>/login?auth_provider_hint=cloud-basic`
3. Log in as `exploratory-tester` / `Exploratory123!`
4. Dismiss any post-login dialogs
5. Verify the session:
   ```bash
   curl -s -u exploratory-tester:Exploratory123! http://localhost:5620/api/security/me \
     | python3 -c "import sys,json; u=json.load(sys.stdin); exit(0 if u.get('username')=='exploratory-tester' else 1)"
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
