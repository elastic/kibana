#!/usr/bin/env bash
set -euo pipefail

# Seeds Agent Builder conversations with proposal attachments for local development.
# Creates 3 conversations each containing a proposal attachment in a different state:
#   1. Pending, low impact — the normal happy-path state.
#   2. Pending, critical impact with an expiry in the past — shows the expired callout.
#   3. Already dismissed — shows the decided callout.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601)
#   - An agent named "AlertZero" already created (run the alertzero plugin's ensure-agent logic first)
#   - The proposal attachment type registered (alertzero plugin enabled)
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
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${CONVERSATIONS_VERSION}" \
    "${KIBANA_URL}/api/agent_builder/conversations" \
    -d "$(jq -n --arg t "$title" '{ title: $t }')" \
    | jq -r '.id'
}

add_attachment() {
  local conversation_id="$1"
  local payload="$2"
  kibana_curl \
    -X POST \
    -H "Content-Type: application/json" \
    -H "elastic-api-version: ${ATTACHMENTS_VERSION}" \
    "${KIBANA_URL}/api/agent_builder/conversations/${conversation_id}/attachments" \
    -d "$payload" \
    | jq -r '.attachment.id'
}

# ---- now + 30 min in ISO 8601 for "soon to expire" -------------------------
FUTURE_EXPIRY=$(date -u -v+30M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null \
  || date -u -d '30 minutes' '+%Y-%m-%dT%H:%M:%SZ')

# ---- 1. Pending, low impact ------------------------------------------------
echo "Creating conversation 1: pending low-impact proposal…"
CONV1=$(create_conversation "AlertZero — Pending proposal (low impact)")

ATTACH1=$(add_attachment "$CONV1" "$(jq -n \
  --arg type "$PROPOSAL_TYPE" \
  --arg now "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  '{
    type: $type,
    data: {
      id: "seed-proposal-low-001",
      spaceId: "default",
      conversationId: "seed-conversation-1",
      comment: "Block outbound traffic from the compromised host to prevent data exfiltration. This change applies only to the host running qualys-scan on the DMZ scan pool.",
      status: "pending",
      impact: "low",
      confidence: "high",
      origin: "worker",
      targetEntities: ["host.name:web-dmz-04", "host.ip:10.20.30.44"],
      category: "network",
      createdAt: $now,
      expired: false
    }
  }')"
)

echo "  conversation: $CONV1, attachment: $ATTACH1"

# ---- 2. Pending, critical impact, expires soon -----------------------------
echo "Creating conversation 2: pending critical-impact proposal with expiry…"
CONV2=$(create_conversation "AlertZero — Pending proposal (critical, expires soon)")

ATTACH2=$(add_attachment "$CONV2" "$(jq -n \
  --arg type "$PROPOSAL_TYPE" \
  --arg now "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --arg expiry "$FUTURE_EXPIRY" \
  '{
    type: $type,
    data: {
      id: "seed-proposal-critical-002",
      spaceId: "default",
      conversationId: "seed-conversation-2",
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
    }
  }')"
)

echo "  conversation: $CONV2, attachment: $ATTACH2"

# ---- 3. Already dismissed --------------------------------------------------
echo "Creating conversation 3: dismissed proposal…"
CONV3=$(create_conversation "AlertZero — Already-dismissed proposal")

ATTACH3=$(add_attachment "$CONV3" "$(jq -n \
  --arg type "$PROPOSAL_TYPE" \
  --arg now "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  '{
    type: $type,
    data: {
      id: "seed-proposal-dismissed-003",
      spaceId: "default",
      conversationId: "seed-conversation-3",
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
    }
  }')"
)

echo "  conversation: $CONV3, attachment: $ATTACH3"

# ---- summary ---------------------------------------------------------------
echo ""
echo "Done. To test:"
echo "  1. Open Kibana and navigate to Agent Builder."
echo "  2. Open one of the seeded conversations above."
echo "  3. Ask the agent: 'Show me the proposal in this conversation.'"
echo "  4. The agent should emit <render_attachment id=\"...\"/> and the card renders."
echo ""
echo "Conversation IDs:"
echo "  Pending (low):      $CONV1"
echo "  Pending (critical): $CONV2"
echo "  Dismissed:          $CONV3"
