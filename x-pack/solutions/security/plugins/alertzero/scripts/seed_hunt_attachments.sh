#!/usr/bin/env bash
set -euo pipefail

# Seeds a single Agent Builder conversation with one attachment of each Hunt Watch
# type — security.threat, security.significant_security_event, security.hunt_correlation —
# so the three renderers can be exercised without a GenAI connector or a live workflow run.
#
# Prerequisites:
#   - Kibana running at $KIBANA_URL (default: http://localhost:5601)
#   - The alertzero plugin enabled (`xpack.alertzero.enabled: true`) and
#     `xpack.agenticInvestigations.enabled: true` (alertzero's required plugin)
#   - No GenAI connector or threat-report seeding required for this script; the threat
#     attachment carries a synthetic report_id with captured fallback fields, which the
#     security.threat renderer displays whenever the live document can't be resolved.
#
# Usage:
#   KIBANA_URL=http://localhost:5601 \
#   KIBANA_USER=elastic \
#   KIBANA_PASSWORD=changeme \
#   bash x-pack/solutions/security/plugins/alertzero/scripts/seed_hunt_attachments.sh

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
CONVERSATIONS_VERSION="2023-10-31"
ATTACHMENTS_VERSION="2023-10-31"

THREAT_TYPE="security.threat"
SSE_TYPE="security.significant_security_event"
CORRELATION_TYPE="security.hunt_correlation"

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

NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# ---- create the conversation ------------------------------------------------
echo "Creating conversation: Hunt Watch attachment demo…"
CONV=$(create_conversation "Hunt Watch — attachment type demo")
echo "  conversation: $CONV"

# ---- 1. Threat report reference (by-reference, synthetic report_id) --------
echo "Adding security.threat attachment…"
THREAT_ATTACH=$(add_attachment "$CONV" "$(jq -n \
  --arg type "$THREAT_TYPE" \
  '{
    type: $type,
    render_inline: true,
    data: {
      report_id: "seed-hunt-report-aws-iam-001",
      title: "Anomalous AWS IAM role assumption chain observed across three accounts",
      severity: "high",
      source: "AWS IAM Threat Intel Pack (seeded)"
    }
  }')"
)
echo "  attachment: $THREAT_ATTACH"

# ---- 2. Significant Security Event -----------------------------------------
echo "Adding security.significant_security_event attachment…"
SSE_ATTACH=$(add_attachment "$CONV" "$(jq -n \
  --arg type "$SSE_TYPE" \
  --arg now "$NOW" \
  '{
    type: $type,
    render_inline: true,
    data: {
      title: "Suspicious cross-account AssumeRole chain via compromised IAM key",
      severity: "high",
      confidence: 0.82,
      status: "open",
      source_watch: "Hunt Watch",
      capability: "aws-iam-role-chaining",
      run_id: "seed-hunt-run-001",
      security_knowledge_indicators: [
        { type: "aws.iam.role_arn", value: "arn:aws:iam::111122223333:role/seed-demo-role", confidence: 0.75 }
      ],
      entities: ["aws.iam.access_key_id:AKIASEEDDEMO0001", "aws.account.id:111122223333"],
      alerts: [],
      events: [],
      timeline: [
        { at: $now, what: "Hunt worker correlated repeated cross-account AssumeRole calls from a single access key against the aws-iam-role-chaining hunt rule." }
      ],
      hypothesis_tested: "A compromised IAM access key is being used to pivot across accounts via chained AssumeRole calls.",
      evidence_for: [
        "Access key AKIASEEDDEMO0001 issued AssumeRole calls into 3 distinct account IDs within a 10 minute window."
      ],
      evidence_against: [],
      evaluation_record_ref: "seed-hunt-eval-001"
    }
  }')"
)
echo "  attachment: $SSE_ATTACH"

# ---- 3. Hunt correlation evidence -------------------------------------------
echo "Adding security.hunt_correlation attachment…"
CORR_ATTACH=$(add_attachment "$CONV" "$(jq -n \
  --arg type "$CORRELATION_TYPE" \
  '{
    type: $type,
    render_inline: true,
    data: {
      anchors: [
        { kind: "hash", value: "sha256:seed0000000000000000000000000000000000000000000000000000000000" },
        { kind: "actor", value: "aws.iam.access_key_id:AKIASEEDDEMO0001" }
      ],
      diamond_scores: [
        { vertex: "infrastructure", related_report_id: "seed-hunt-report-aws-iam-000", score: 0.71 },
        { vertex: "capability", related_report_id: "seed-hunt-report-aws-iam-000", score: 0.64 }
      ],
      thresholds: { anchor_match: 0.6, diamond_vertex: 0.5 },
      self_match_excluded: true
    }
  }')"
)
echo "  attachment: $CORR_ATTACH"

# ---- summary ---------------------------------------------------------------
echo ""
echo "Done. To test:"
echo "  1. Open Kibana and navigate to Agent Builder."
echo "  2. Open conversation: $CONV"
echo "  3. All three attachments were written with render_inline: true, so their cards"
echo "     should already be visible when the conversation opens."
echo "  4. Optionally ask the agent: 'Summarize this hunt finding: what is the threat,"
echo "     what was tested, and what should I do next?' to see the agent ground its"
echo "     answer in the attachment content and re-render the cards via <render_attachment/>."
echo ""
echo "Conversation id: $CONV"
echo "Attachment ids:  threat=$THREAT_ATTACH  sse=$SSE_ATTACH  correlation=$CORR_ATTACH"
