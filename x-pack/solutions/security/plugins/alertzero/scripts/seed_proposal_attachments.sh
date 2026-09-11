#!/usr/bin/env bash
set -euo pipefail

# Seeds Agent Builder conversations with real investigation proposals for local development.
# Creates 3 conversations, each with a proposal created via the proposals API and then
# attached to the conversation:
#   1. Pending, low impact — the normal happy-path state.
#   2. Pending, critical impact with an expiry — shows the expires-soon callout.
#   3. Already dismissed — shows the decided callout.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601)
#   - xpack.agenticInvestigations.enabled: true in kibana.dev.yml
#
# Usage:
#   KIBANA_URL=http://localhost:5601 \
#   KIBANA_USER=elastic \
#   KIBANA_PASSWORD=changeme \
#   bash x-pack/solutions/security/plugins/alertzero/scripts/seed_proposal_attachments.sh

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
CONVERSATIONS_VERSION="2023-10-31"
ATTACHMENTS_VERSION="2023-10-31"
PROPOSALS_VERSION="1"
PROPOSAL_TYPE="investigation_proposal"

# ---- helpers ---------------------------------------------------------------

kibana_curl() {
  curl --silent --fail-with-body \
    -u "${KIBANA_USER}:${KIBANA_PASSWORD}" \
    -H "kbn-xsrf: true" \
    "$@"
}

create_conversation() {
  local title="$1"
  local conv_id
  conv_id=$(kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${CONVERSATIONS_VERSION}" \
    "${KIBANA_URL}/api/agent_builder/conversations" \
    -d "$(jq -n --arg t "$title" '{ title: $t }')" \
    | jq -r '.id')

  # Make public so any user can open the URL
  kibana_curl \
    -X PUT \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${CONVERSATIONS_VERSION}" \
    "${KIBANA_URL}/api/agent_builder/conversations/${conv_id}/access_control" \
    -d '{"access_mode":"public","entries":[]}' \
    > /dev/null

  echo "$conv_id"
}

create_proposal() {
  local payload="$1"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${PROPOSALS_VERSION}" \
    -H "x-elastic-internal-origin: Kibana" \
    "${KIBANA_URL}/internal/investigations/proposals" \
    -d "$payload" \
    | jq -r '.id'
}

attach_proposal() {
  local conversation_id="$1"
  local proposal_id="$2"
  local data_payload="$3"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${ATTACHMENTS_VERSION}" \
    "${KIBANA_URL}/api/agent_builder/conversations/${conversation_id}/attachments" \
    -d "$(jq -n \
      --arg type "$PROPOSAL_TYPE" \
      --arg origin "$proposal_id" \
      --argjson data "$data_payload" \
      '{ type: $type, origin: $origin, data: $data }')" \
    | jq -r '.attachment.id'
}

# ---- timestamps ------------------------------------------------------------
NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
FUTURE_EXPIRY=$(date -u -v+30M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
  || date -u -d '30 minutes' '+%Y-%m-%dT%H:%M:%SZ')

# ---- 1. Pending, low impact ------------------------------------------------
echo "Creating conversation 1: pending low-impact proposal…"
CONV1=$(create_conversation "AlertZero — Pending proposal (low impact)")

PROPOSAL1=$(create_proposal "$(jq -n \
  --arg cid "$CONV1" \
  '{
    conversationId: $cid,
    comment: "Block outbound traffic from the compromised host to prevent data exfiltration. This change applies only to the host running qualys-scan on the DMZ scan pool.",
    impact: "low",
    confidence: "high",
    origin: "worker"
  }')")

DATA1=$(jq -n \
  --arg id "$PROPOSAL1" \
  --arg cid "$CONV1" \
  --arg now "$NOW" \
  '{
    id: $id,
    spaceId: "default",
    conversationId: $cid,
    comment: "Block outbound traffic from the compromised host to prevent data exfiltration. This change applies only to the host running qualys-scan on the DMZ scan pool.",
    status: "pending",
    impact: "low",
    confidence: "high",
    origin: "worker",
    targetEntities: ["host.name:web-dmz-04", "host.ip:10.20.30.44"],
    category: "network",
    createdAt: $now,
    expired: false
  }')

ATTACH1=$(attach_proposal "$CONV1" "$PROPOSAL1" "$DATA1")
echo "  conversation: $CONV1  proposal: $PROPOSAL1  attachment: $ATTACH1"

# ---- 2. Pending, critical impact, expires soon -----------------------------
echo "Creating conversation 2: pending critical-impact proposal with expiry…"
CONV2=$(create_conversation "AlertZero — Pending proposal (critical, expires soon)")

PROPOSAL2=$(create_proposal "$(jq -n \
  --arg cid "$CONV2" \
  --arg expiry "$FUTURE_EXPIRY" \
  '{
    conversationId: $cid,
    comment: "Terminate the suspicious SSH session from 185.220.101.0 and revoke its API keys immediately. Confidence is high based on threat intelligence correlation.",
    impact: "critical",
    confidence: "high",
    origin: "worker",
    expiresAt: $expiry
  }')")

DATA2=$(jq -n \
  --arg id "$PROPOSAL2" \
  --arg cid "$CONV2" \
  --arg now "$NOW" \
  --arg expiry "$FUTURE_EXPIRY" \
  '{
    id: $id,
    spaceId: "default",
    conversationId: $cid,
    comment: "Terminate the suspicious SSH session from 185.220.101.0 and revoke its API keys immediately. Confidence is high based on threat intelligence correlation.",
    status: "pending",
    impact: "critical",
    confidence: "high",
    origin: "worker",
    targetEntities: ["host.name:bastion-01", "source.ip:185.220.101.0"],
    category: "identity",
    actionWorkflowId: "system-alertzero-action-terminate-session",
    action: {
      name: "Terminate SSH session and revoke keys",
      impact: "critical",
      category: "identity",
      reversible: false
    },
    expiresAt: $expiry,
    createdAt: $now,
    expired: false
  }')

ATTACH2=$(attach_proposal "$CONV2" "$PROPOSAL2" "$DATA2")
echo "  conversation: $CONV2  proposal: $PROPOSAL2  attachment: $ATTACH2"

# ---- 3. Pending (will be dismissed after creation) -------------------------
echo "Creating conversation 3: dismissed proposal…"
CONV3=$(create_conversation "AlertZero — Already-dismissed proposal")

PROPOSAL3=$(create_proposal "$(jq -n \
  --arg cid "$CONV3" \
  '{
    conversationId: $cid,
    comment: "Create a detection rule for repeated failed logins from this IP range.",
    impact: "medium",
    confidence: "medium",
    origin: "worker"
  }')")

# Dismiss the proposal immediately so the attachment card shows a decided state
kibana_curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "elastic-api-version: ${PROPOSALS_VERSION}" \
  -H "x-elastic-internal-origin: Kibana" \
  "${KIBANA_URL}/internal/investigations/proposals/${PROPOSAL3}/dismiss" \
  -d '{"dismissReason":"already_handled","rationale":"We already have a rule covering this pattern from last sprint."}' \
  > /dev/null

DATA3=$(jq -n \
  --arg id "$PROPOSAL3" \
  --arg cid "$CONV3" \
  --arg now "$NOW" \
  '{
    id: $id,
    spaceId: "default",
    conversationId: $cid,
    comment: "Create a detection rule for repeated failed logins from this IP range.",
    status: "dismissed",
    impact: "medium",
    confidence: "medium",
    origin: "worker",
    targetEntities: ["source.ip:10.0.0.0/8"],
    category: "detection",
    dismissReason: "already_handled",
    rationale: "We already have a rule covering this pattern from last sprint.",
    decidedAt: $now,
    createdAt: $now,
    expired: false
  }')

ATTACH3=$(attach_proposal "$CONV3" "$PROPOSAL3" "$DATA3")
echo "  conversation: $CONV3  proposal: $PROPOSAL3  attachment: $ATTACH3"

# ---- summary ---------------------------------------------------------------
echo ""
echo "Done. Open in Kibana Agent Builder:"
echo "  Pending (low):      ${KIBANA_URL}/app/agent_builder/agents/elastic-ai-agent/conversations/${CONV1}"
echo "  Pending (critical): ${KIBANA_URL}/app/agent_builder/agents/elastic-ai-agent/conversations/${CONV2}"
echo "  Dismissed:          ${KIBANA_URL}/app/agent_builder/agents/elastic-ai-agent/conversations/${CONV3}"
