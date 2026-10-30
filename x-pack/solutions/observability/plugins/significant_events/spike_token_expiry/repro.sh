#!/usr/bin/env bash
# SPIKE, do not merge. Creates a service account and a workflow that runs as it. Run it from the UI.
# Usage: repro.sh [kibana_url]   (default http://localhost:5601; needs the stack from README.md)
set -euo pipefail

KBN="${1:-http://localhost:5601}"
JAR="$(mktemp)"
HDR=(-H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: Kibana' -H 'content-type: application/json')
api() { curl -s -b "$JAR" "${HDR[@]}" "$@"; }

# 1. Log in as the admin user through the mock IdP (UIAM needs a numeric username).
USERNAME=$(node -e "console.log(require('crypto').createHash('sha256').update('elastic_admin').digest().readUInt32BE(0))")
LOC=$(curl -s -c "$JAR" -X POST "$KBN/internal/security/login" "${HDR[@]}" \
  -d "{\"providerType\":\"saml\",\"providerName\":\"cloud-saml-kibana\",\"currentURL\":\"$KBN/login?next=%2F\"}" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).location))')
SAML=$(curl -s -X POST "$KBN/mock_idp/saml_response" "${HDR[@]}" \
  -d "$(node -e 'console.log(JSON.stringify({url:process.argv[1],username:process.argv[2],full_name:"Test admin",email:"admin@elastic.co",roles:["admin"]}))' "$LOC" "$USERNAME")" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).SAMLResponse))')
curl -s -b "$JAR" -c "$JAR" -o /dev/null -X POST "$KBN/api/security/saml/callback" \
  -H 'kbn-xsrf: true' --data-urlencode "SAMLResponse=$SAML"

# 2. Find or create the service account (it reads logs*, which is all the repro needs).
NAME=token_expiry_repro
ACCOUNT_ID=$(api "$KBN/internal/security/service_account?limit=100" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).serviceAccounts.find(x=>x.name===process.argv[1]);console.log(a?a.id:"")})' "$NAME")
if [ -z "$ACCOUNT_ID" ]; then
  ACCOUNT_ID=$(api -X POST "$KBN/internal/security/service_account" \
    -d "{\"name\":\"$NAME\",\"description\":\"Token expiry repro\",\"roles\":[\"viewer\"]}" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')
fi
echo "service account: $ACCOUNT_ID"

# 3. A workflow whose step calls a handler that outlives the token (90s hold, the token lives 60s).
upsert_workflow() { # <id> <yaml>
  local body; body=$(node -e 'console.log(JSON.stringify({yaml:process.argv[1]}))' "$2")
  api -X POST "$KBN/api/workflows/workflow" -d "$body" -o /dev/null -w '' 2>/dev/null || true
  api -X PUT "$KBN/api/workflows/workflow/$1" -d "$body" -o /dev/null
}

ROUTE_YAML="version: '1'
name: token-expiry-route
enabled: true
settings:
  run_as: \"$ACCOUNT_ID\"
triggers:
  - type: manual
    with: {}
steps:
  - name: hold
    type: kibana.request
    with:
      method: POST
      path: '/s/{{ workflow.spaceId }}/internal/significant_events/spike/_hold'
      headers:
        x-elastic-internal-origin: 'kibana'
      body:
        seconds: 90
        stepSeconds: 10
"
upsert_workflow token-expiry-route "$ROUTE_YAML"

echo "Created workflow token-expiry-route. Run it from the Workflows UI: $KBN/app/workflows"
