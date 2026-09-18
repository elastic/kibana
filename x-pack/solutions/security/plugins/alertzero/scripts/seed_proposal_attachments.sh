#!/usr/bin/env bash
set -euo pipefail

# Seeds AlertZero/Agent Builder with proposal data for local development.
# Creates 3 conversations, each with a real proposal in the investigations index
# and a matching Agent Builder attachment that renders the inline proposal card:
#
#   1. Pending, low impact — with a create-rule action (Configure bucket).
#   2. Pending, medium impact — with a create-rule action, expires in 30 min.
#   3. Already dismissed — appears in the queue's "Closed" section.
#
# Proposals are written directly to Elasticsearch (the Kibana proposals API is
# internal-only and cannot be called from outside the server process).
# Agent Builder conversations use the public Kibana API.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601)
#   - Elasticsearch running at $ES_URL (default: http://localhost:9200)
#   - alertzero plugin enabled (registers the proposal attachment type)
#
# Usage:
#   KIBANA_URL=http://localhost:5601 \
#   ES_URL=http://localhost:9200 \
#   KIBANA_USER=elastic \
#   KIBANA_PASSWORD=changeme \
#   KIBANA_SPACE=default \
#   AGENT_ID=elastic-ai-agent \
#   bash x-pack/solutions/security/plugins/alertzero/scripts/seed_proposal_attachments.sh

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
KIBANA_SPACE="${KIBANA_SPACE:-default}"
AGENT_BUILDER_API_VERSION="2023-10-31"
PROPOSAL_ATTACHMENT_TYPE="investigation_proposal"
PROPOSALS_INDEX=".kibana-investigation-proposals"

# Build the URL base that includes the space path prefix when not "default".
if [ "$KIBANA_SPACE" = "default" ]; then
  KIBANA_API_BASE="${KIBANA_URL}"
else
  KIBANA_API_BASE="${KIBANA_URL}/s/${KIBANA_SPACE}"
fi

# ---- helpers ---------------------------------------------------------------

kibana_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    "$@"
}

es_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    "$@"
}

gen_uuid() {
  uuidgen 2>/dev/null | tr '[:upper:]' '[:lower:]' \
    || cat /proc/sys/kernel/random/uuid
}

AGENT_ID="${AGENT_ID:-elastic-ai-agent}"

create_conversation() {
  local title="$1"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${AGENT_BUILDER_API_VERSION}" \
    "${KIBANA_API_BASE}/api/agent_builder/conversations" \
    -d "$(jq -n --arg t "$title" --arg a "$AGENT_ID" '{ title: $t, agent_id: $a, template_id: "investigation", access_control: { access_mode: "public" } }')" \
    | jq -r '.id'
}

# Writes a proposal document directly to Elasticsearch.
# Returns the proposal id that was written.
index_proposal() {
  local proposal_id="$1"
  local payload="$2"
  es_curl \
    -X PUT \
    -H "Content-Type: application/json" \
    "${ES_URL}/${PROPOSALS_INDEX}/_doc/${proposal_id}" \
    -d "$payload" \
    > /dev/null
  echo "$proposal_id"
}

# Creates an Agent Builder attachment that links to an existing proposal via
# its `origin` field. The card renderer reads `attachment.origin` to look up
# live proposal data; the `data` snapshot drives the badge rendering only.
add_attachment() {
  local conversation_id="$1"
  local payload="$2"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${AGENT_BUILDER_API_VERSION}" \
    "${KIBANA_API_BASE}/api/agent_builder/conversations/${conversation_id}/attachments" \
    -d "$payload" \
    | jq -r '.attachment.id'
}

# ---- timestamps -------------------------------------------------------------
NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
FUTURE_EXPIRY=$(date -u -v+30M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
  || date -u -d '30 minutes' '+%Y-%m-%dT%H:%M:%SZ')

# ---- 1. Pending, low impact -------------------------------------------------
echo "Creating conversation 1: pending proposal (low impact)…"
CONV1=$(create_conversation "AlertZero — Pending proposal (low impact) [$NOW]")
P1_ID=$(gen_uuid)

index_proposal "$P1_ID" "$(jq -n \
  --arg cid "$CONV1" \
  --arg now "$NOW" \
  --arg id "$P1_ID" \
  --arg space "$KIBANA_SPACE" \
  '{
    spaceId: $space,
    conversationId: $cid,
    comment: "Block outbound traffic from the compromised host to prevent data exfiltration. This change applies only to the host running qualys-scan on the DMZ scan pool.",
    actionWorkflowId: "system-alertzero-action-create-rule",
    actionInput: {
      name: "Block outbound — seed",
      description: "Seed rule: block egress from compromised host.",
      query: "host.name:web-dmz-04 and network.direction:egress"
    },
    status: "pending",
    impact: "low",
    confidence: "high",
    category: "configure",
    origin: "worker",
    impactRank: 3,
    confidenceRank: 0,
    createdAt: $now
  }')" > /dev/null

ATTACH1=$(add_attachment "$CONV1" "$(jq -n \
  --arg type "$PROPOSAL_ATTACHMENT_TYPE" \
  --arg origin "$P1_ID" \
  --arg cid "$CONV1" \
  --arg now "$NOW" \
  --arg space "$KIBANA_SPACE" \
  '{
    type: $type,
    origin: $origin,
    render_inline: true,
    data: {
      id: $origin,
      spaceId: $space,
      conversationId: $cid,
      comment: "Block outbound traffic from the compromised host to prevent data exfiltration.",
      actionWorkflowId: "system-alertzero-action-create-rule",
      status: "pending",
      impact: "low",
      confidence: "high",
      category: "configure",
      origin: "worker",
      createdAt: $now,
      expired: false
    }
  }')")

echo "  conversation: $CONV1, proposal: $P1_ID, attachment: $ATTACH1"

# ---- 2. Pending, medium impact, expires soon --------------------------------
echo "Creating conversation 2: pending proposal (create rule, expires in 30 min)…"
CONV2=$(create_conversation "AlertZero — Pending proposal (create rule, expires soon) [$NOW]")
P2_ID=$(gen_uuid)

index_proposal "$P2_ID" "$(jq -n \
  --arg cid "$CONV2" \
  --arg now "$NOW" \
  --arg expiry "$FUTURE_EXPIRY" \
  --arg space "$KIBANA_SPACE" \
  '{
    spaceId: $space,
    conversationId: $cid,
    comment: "Create a detection rule for repeated SSH login failures from external IP ranges. The pattern observed correlates with credential-stuffing campaigns in our threat intel feed.",
    actionWorkflowId: "system-alertzero-action-create-rule",
    actionInput: {
      name: "Detect repeated SSH login failures",
      description: "Alerts when more than 5 SSH authentication failures occur within 5 minutes from a single source IP.",
      query: "event.category:authentication and event.outcome:failure and source.ip:185.220.101.0/24"
    },
    status: "pending",
    impact: "medium",
    confidence: "high",
    category: "configure",
    origin: "worker",
    expiresAt: $expiry,
    impactRank: 2,
    confidenceRank: 0,
    createdAt: $now
  }')" > /dev/null

ATTACH2=$(add_attachment "$CONV2" "$(jq -n \
  --arg type "$PROPOSAL_ATTACHMENT_TYPE" \
  --arg origin "$P2_ID" \
  --arg cid "$CONV2" \
  --arg now "$NOW" \
  --arg expiry "$FUTURE_EXPIRY" \
  --arg space "$KIBANA_SPACE" \
  '{
    type: $type,
    origin: $origin,
    render_inline: true,
    data: {
      id: $origin,
      spaceId: $space,
      conversationId: $cid,
      comment: "Create a detection rule for repeated SSH login failures from external IP ranges.",
      actionWorkflowId: "system-alertzero-action-create-rule",
      status: "pending",
      impact: "medium",
      confidence: "high",
      category: "configure",
      origin: "worker",
      expiresAt: $expiry,
      createdAt: $now,
      expired: false
    }
  }')")

echo "  conversation: $CONV2, proposal: $P2_ID, attachment: $ATTACH2"

# ---- 3. Already dismissed ---------------------------------------------------
echo "Creating conversation 3: dismissed proposal…"
CONV3=$(create_conversation "AlertZero — Already-dismissed proposal [$NOW]")
P3_ID=$(gen_uuid)

index_proposal "$P3_ID" "$(jq -n \
  --arg cid "$CONV3" \
  --arg now "$NOW" \
  --arg space "$KIBANA_SPACE" \
  '{
    spaceId: $space,
    conversationId: $cid,
    comment: "Create a detection rule for repeated failed logins from this IP range.",
    status: "no_action",
    decision: "dismissed",
    impact: "medium",
    confidence: "medium",
    origin: "worker",
    decidedAt: $now,
    decidedBy: { username: "elastic", fullName: null, email: null },
    dismissReason: "already_handled",
    rationale: "We already have a rule covering this pattern from last sprint.",
    impactRank: 2,
    confidenceRank: 1,
    createdAt: $now
  }')" > /dev/null

ATTACH3=$(add_attachment "$CONV3" "$(jq -n \
  --arg type "$PROPOSAL_ATTACHMENT_TYPE" \
  --arg origin "$P3_ID" \
  --arg cid "$CONV3" \
  --arg now "$NOW" \
  --arg space "$KIBANA_SPACE" \
  '{
    type: $type,
    origin: $origin,
    render_inline: true,
    data: {
      id: $origin,
      spaceId: $space,
      conversationId: $cid,
      comment: "Create a detection rule for repeated failed logins from this IP range.",
      status: "no_action",
      decision: "dismissed",
      impact: "medium",
      confidence: "medium",
      origin: "worker",
      decidedAt: $now,
      decidedBy: { username: "elastic", fullName: null, email: null },
      dismissReason: "already_handled",
      rationale: "We already have a rule covering this pattern from last sprint.",
      createdAt: $now,
      expired: false
    }
  }')")

echo "  conversation: $CONV3, proposal: $P3_ID, attachment: $ATTACH3"

# ---- summary ---------------------------------------------------------------
echo ""
echo "Done. Three proposals are now in the AlertZero queue."
echo ""
echo "To verify:"
echo "  1. Open Kibana and navigate to AlertZero (Security → AlertZero)."
echo "  2. Conversations 1 and 2 appear as pending proposals (Configure bucket)."
echo "  3. Conversation 3 appears in the 'Closed' section (dismissed)."
echo "  4. Open Agent Builder and open one of the three conversations —"
echo "     the proposal card renders inline in the conversation."
echo ""
echo "Conversation IDs (open in Agent Builder to see the inline card):"
echo "  Pending (low impact):   $CONV1  →  proposal $P1_ID"
echo "  Pending (medium/expiry): $CONV2  →  proposal $P2_ID"
echo "  Dismissed:              $CONV3  →  proposal $P3_ID"
