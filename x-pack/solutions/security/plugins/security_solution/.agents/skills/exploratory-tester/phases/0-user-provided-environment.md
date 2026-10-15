# Phase 0: User-provided environment

Taken when `Environment.url` is present in the invocation, or a saved profile was named.

## Profile resolution — check first

If the invocation contains `Environment: profile <name>` (or `Environment: <name>` where a file
`.exploratory-session/environments/<name>.json` exists), load that profile:
1. Read `.exploratory-session/environments/<name>.json`.
2. Resolve any `$VAR` references in the profile fields — same rule as the `$VAR` credential
   handling below (replace `$VAR` with the value of the shell environment variable `VAR`).
3. Use the profile's `url`, `username`, `password`, `api_key`, `space`, `role`, `type`, and
   `es_url` fields as if they had been given inline in the `Environment:` block.
4. Skip any re-prompting for environment credentials — proceed directly to connectivity + api-key
   validation (the curl steps below).
5. Tell the user: _"Loaded environment profile `<name>`."_

If the named profile file does not exist, stop: _"Profile `<name>` not found at
`.exploratory-session/environments/<name>.json`. Check the name or create it — see
`templates/environment-profile.example.json`."_

## Inline `Environment` block

If no profile was named, take the fields directly from the invocation (append to invocation if not already present):
```
Environment:
  url: $KIBANA_TEST_URL
  username: $KIBANA_TEST_USERNAME   # browser login only — NOT used for API calls
  password: $KIBANA_TEST_PASSWORD
  api-key: $KIBANA_API_KEY          # Kibana-native API key — required for all curl setup
  data-setup: skip                  # omit to run data setup
  space: <id>                       # omit to use "exploratory-testing"
```

> **API key format:** the key must be a **Kibana-native** API key, not an Elasticsearch API key — they are different and Kibana rejects ES-origin keys on most endpoints. Create one via: `POST <kibana-url>/api/security/api_key` (authenticated as the admin user in the browser, or via the Kibana UI at **Stack Management → API Keys**). The encoded value (`encoded` field in the response) is what goes in `api-key:`. On ECH and ESS, basic auth is blocked for external HTTP clients — `username`/`password` are used **only** for the browser login step.

Skip Scout startup. Resolve the `Environment` fields into
`ENVIRONMENT_URL`, optional `ENVIRONMENT_API_KEY`, and optional
`ENVIRONMENT_SPACE`, then verify connectivity and the API key in one step:
```bash
# Step 0a resolves Environment fields into these canonical variables.
KIBANA_URL="${ENVIRONMENT_URL:?Set ENVIRONMENT_URL to Environment.url}"
# API_KEY is optional here so the browser-only fallback below remains reachable.
API_KEY="${ENVIRONMENT_API_KEY:-}"
API_KEY_WAS_SUPPLIED=false
if [[ -n "$API_KEY" ]]; then API_KEY_WAS_SUPPLIED=true; fi
SPACE_ID="${ENVIRONMENT_SPACE:-exploratory-testing}"
CURL_CONNECT_TIMEOUT="${EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${EXPLORATORY_TESTER_CURL_MAX_TIME:-30}"
CURL_TIMEOUT_ARGS=(--connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME")
# Check Kibana is reachable (public endpoint, no auth needed)
curl -s "${CURL_TIMEOUT_ARGS[@]}" "$KIBANA_URL/api/status" | python3 -c "import sys,json; s=json.load(sys.stdin); \
  exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"

# Validate the API key with a read-only request before any setup work begins.
# 200 means the key can read the configured space; 404 means the key is valid
# but the space will need provisioning in Phase 1; 401 means the key is wrong
# or is an Elasticsearch-origin key.
if [[ -z "$API_KEY" ]]; then
  echo "No API key supplied; continue with browser-only setup below."
else
  VALIDATE_STATUS=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -o /dev/null -w "%{http_code}" \
    -H "Authorization: ApiKey $API_KEY" \
    -X GET "$KIBANA_URL/api/spaces/space/$SPACE_ID")

  if [[ "$VALIDATE_STATUS" == "401" ]]; then
    echo "API key rejected (401). Ensure you are using a Kibana-native key, not an ES key." >&2
    exit 1
  elif [[ "$VALIDATE_STATUS" == "200" || "$VALIDATE_STATUS" == "404" ]]; then
    echo "API key accepted (HTTP $VALIDATE_STATUS). Proceeding."
  else
    echo "Unexpected response $VALIDATE_STATUS when validating the API key." >&2
    exit 1
  fi
fi
```

**No API key available?** If the invoker cannot provide a Kibana API key, fall back to browser-only setup:
- Navigate to `<url>/app/management/kibana/spaces` as the logged-in admin and create the `exploratory-testing` space via the UI.
- Navigate to `<url>/app/management/security/api_keys`, create a new API key with `All spaces / All privileges`, copy the `encoded` value, and use it for all subsequent curl calls.
- Set the shell variable `ENVIRONMENT_API_KEY` to the copied `encoded` value before continuing. Keep it in the current shell only; Step 0e persists it atomically into `config.json`.
- Record in `config.json → skipped_setup`: `{ "step": "api-key-browser-created", "reason": "no api-key provided in Environment block; created via UI" }`.

Resolve env var references in credentials (`$VAR` → environment variable value) before using them.

**Failures:**
- User-provided environment unreachable → **Stop.** Tell user to check the URL.
- API key returns 401 → **Stop.** Tell user: "The API key was rejected. On ECH/ESS, use a Kibana-native key (Stack Management → API Keys), not an Elasticsearch API key."

**After successful api-key validation — offer to save as a profile:**

If newly typed (not loaded from a profile), offer once to save it as a reusable profile.

| Reply | Action |
|---|---|
| `<name>` | Ask `"$VAR refs for secrets? (yes/no)"`. Write to `.exploratory-session/environments/<name>.json` using `templates/environment-profile.example.json` schema. Confirm: _"Profile saved."_ |
| `skip` / unrecognised | Continue without saving. Do not ask again. |

Set `environment.managed` to `false` in `config.json` (Step 0e) — this route always takes the User-provided branch, even if `environment.type` is `stateful-ess` or `serverless`. A stray `true` here makes Step 1a poll a Kibana that was never started until it times out.

Return to `phases/0-setup.md` Step 0b once the environment is verified.
