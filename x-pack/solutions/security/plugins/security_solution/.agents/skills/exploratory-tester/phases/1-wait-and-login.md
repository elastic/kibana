# Phase 1: Wait & Login

---

## Step 1a — Wait for Kibana (agent-managed only)

Skip if `environment.managed` is `false` in `config.json`.

```bash
node -e "
(async () => {
  const creds = Buffer.from('elastic:changeme').toString('base64');
  for (let i = 1; i <= 60; i++) {
    try {
      const r = await fetch('http://localhost:5620/api/status',
        { headers: { Authorization: 'Basic ' + creds } });
      const s = await r.json();
      if (s?.status?.overall?.level === 'available') {
        process.stdout.write('Kibana ready\n'); process.exit(0);
      }
    } catch(e) {}
    process.stdout.write('Attempt ' + i + ' — waiting 10s...\n');
    await new Promise(r => setTimeout(r, 10000));
  }
  process.stderr.write('Kibana not ready after 10 minutes\n'); process.exit(1);
})();
"
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

**Create test space:**
```bash
# Agent-managed:
curl -s -u elastic:changeme -X POST http://localhost:5620/api/spaces/space \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"id":"exploratory-testing","name":"Exploratory Testing","color":"#DD0A73"}'

# User-provided: substitute <environment.url> and <username>:<password>
curl -s -u "<username>:<password>" -X POST "<environment.url>/api/spaces/space" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"id":"exploratory-testing","name":"Exploratory Testing","color":"#DD0A73"}'
```
`409 Conflict` → space already exists, reuse silently. Any other error → add to `skipped_setup`, update `space_id` to `"default"` in `config.json`.

**Per-flow isolated spaces (parallel mode only):**

If `config.json → mode` is `"parallel"`, run after the base space is ready:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-flow-spaces.py \
  --session-dir "$SESSION_DIR"
```
This creates `exploratory-testing-flow-<N>` for each flow where `isolate: true` (the default) and updates `flows[N].space_id` in `config.json`. Flows with `isolate: false` share the base space.

> **What isolation covers:** Kibana saved objects — timelines, cases, rules, dashboards — are space-scoped and will not interfere between parallel flows. Elasticsearch indices (`.alerts-security.alerts-*`, raw document indices) are **shared across spaces**. Flows that mutate alert status (marking open/closed/acknowledged) can still interfere. For those flows, use **serial mode** instead of parallel.

**Connectors** (if required by Setup):
```bash
curl -s -u elastic:changeme -X POST http://localhost:5620/s/exploratory-testing/api/actions/connector \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"name":"Bedrock","connector_type_id":".bedrock","config":{"apiUrl":"https://bedrock.us-east-1.amazonaws.com"},"secrets":{"accessKey":"test","secret":"test"}}'
```
For user-provided: replace URL and credentials. Fake `accessKey: test` is sufficient for UI testing. For areas that actually call the AI model (e.g. SIEM Migrations translation), real AWS credentials are required — pass via `$AWS_ACCESS_KEY` / `$AWS_SECRET_KEY` in Setup.

**esArchiver fixtures** (stateful only): load via Kibana API. Serverless → attempt; if 404/400, add to `skipped_setup`.

**Non-ECS noise index** (all environment types):
```bash
# ES_URL: http://localhost:9220 (agent-managed) or environment.es_url from config.json
# Use --api-key for serverless / ECH (basic auth is unavailable or rejected):
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-noise-index.sh \
  --es-url "$ES_URL" \
  --api-key "$APIKEY"

# Use --username / --password for agent-managed stateful environments:
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-noise-index.sh \
  --es-url "$ES_URL" \
  --username elastic \
  --password changeme
```

The script automatically falls back from `logs-exploratory.noise` to `exploratory-noise` if the `logs-*` name is reserved by a data stream template (common on serverless). Capture the alias from the output and write it to `config.json`:

```bash
NOISE_INDEX_ALIAS=$(
  bash x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/create-noise-index.sh \
    --es-url "$ES_URL" --api-key "$APIKEY" \
  | grep '^NOISE_INDEX_ALIAS=' | cut -d= -f2
)
python3 -c "
import json
cfg = json.load(open('$SESSION_DIR/config.json'))
cfg['noise_index'] = '$NOISE_INDEX_ALIAS'
json.dump(cfg, open('$SESSION_DIR/config.json', 'w'), indent=2)
print('noise_index set to:', '$NOISE_INDEX_ALIAS')
"
```

On failure (empty `NOISE_INDEX_ALIAS` or non-zero exit): add `{ "step": "noise-index", "reason": "<error>" }` to `skipped_setup` — noise-index testing skipped for this session.

> **Why:** Real customer data often has non-ECS field types and missing fields. Features that work with clean data can silently break on this class of data.

**Create test user** (stateful only):
```bash
# POST first; if 409 use PUT:
curl -s -u elastic:changeme -X POST http://localhost:5620/internal/security/users/exploratory-tester \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"username":"exploratory-tester","password":"Exploratory123!","roles":["<resolved_role>"],"full_name":"Exploratory Tester"}'
```
If the Kibana internal user API returns **404** (common on ECH), fall back to the Elasticsearch Security API:
```bash
curl -s -u "<username>:<password>" -X POST "<environment.es_url>/_security/user/exploratory-tester" \
  -H 'Content-Type: application/json' \
  -d '{"password":"Exploratory123!","roles":["<resolved_role>"],"full_name":"Exploratory Tester"}'
```
`environment.es_url`: replace `kb.` with `es.` in ECH URLs. If both fail → add to `skipped_setup`, continue with provided admin credentials.

Serverless: skip user creation — roles are pre-provisioned. Add `{ "step": "role-creation:<role>", "reason": "serverless" }` to `skipped_setup`.

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
